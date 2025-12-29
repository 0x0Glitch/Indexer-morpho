import { ponder } from "ponder:registry";
import {
  accrueInterestEvent,
  depositEvent,
  withdrawEvent,
  transferEvent,
  vaultV2,
  vaultAccount,
} from "ponder:schema";
import { zeroAddress } from "viem";
import { checkpointManager } from "./VaultCheckpointManager";
import { createLogger } from "./utils/logger";
import { ensureVaultExists } from "./utils/vaultInitializer";
import { HistoricalSnapshotManager } from "./HistoricalSnapshotManager";
import { MorphoV2Abi } from "../abis/MorphoV2Abi";
import { ERC20Abi } from "../abis/ERC20Abi";
import { IAdapterAbi } from "../abis/IAdapterAbi";

const logger = createLogger({ module: "CheckpointHandlers" });

// Precision constant for maxRate calculations (18 decimals)
const WAD = 1_000_000_000_000_000_000n;

/**
 * @dev Checkpoint Event Handlers
 *
 * This file contains event handlers for accounting events that trigger vault checkpoints.
 * These handlers implement the logic for historical state reconstruction.
 *
 * Triggers for checkpoints:
 * 1. AccrueInterest - updates totalAssets and lastUpdateTimestamp
 * 2. Deposit - increases totalAssets
 * 3. Withdraw - decreases totalAssets
 * 4. Transfer (from=0x0) - mint, increases totalSupply
 * 5. Transfer (to=0x0) - burn, decreases totalSupply
 */

/*//////////////////////////////////////////////////////////////
                      ACCRUE INTEREST
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:AccrueInterest", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;
  const vaultAddress = event.log.address;

  // Ensure vault exists
  await ensureVaultExists(
    context,
    vaultAddress,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
  );

  // Fetch real asset metrics from contract state
  // Following user's guidance: "what soever data is directly available by function call should be captured directly"

  let realAssets = 0n;
  let idleAssets = 0n;
  let maxTotalAssets = 0n;
  let elapsed = 0n;

  try {
    // 1. Get asset address from vault
    const assetAddress = await context.client.readContract({
      address: vaultAddress,
      abi: MorphoV2Abi,
      functionName: "asset",
      blockNumber: event.block.number,
    }) as `0x${string}`;

    // 2. Get idle balance: IERC20(asset).balanceOf(vault)
    idleAssets = await context.client.readContract({
      address: assetAddress,
      abi: ERC20Abi,
      functionName: "balanceOf",
      args: [vaultAddress],
      blockNumber: event.block.number,
    }) as bigint;

    // 3. Get adapters array
    const adapters = await context.client.readContract({
      address: vaultAddress,
      abi: MorphoV2Abi,
      functionName: "adapters",
      blockNumber: event.block.number,
    }) as `0x${string}`[];

    // 4. Sum adapter realAssets
    let adapterRealAssets = 0n;
    for (const adapter of adapters) {
      try {
        const adapterAssets = await context.client.readContract({
          address: adapter,
          abi: IAdapterAbi,
          functionName: "realAssets",
          blockNumber: event.block.number,
        }) as bigint;
        adapterRealAssets += adapterAssets;
      } catch (adapterError) {
        logger.warn({
          vaultAddress,
          adapter,
          blockNumber: event.block.number.toString(),
          error: adapterError,
        }, "Failed to fetch realAssets from adapter, skipping");
      }
    }

    // 5. Calculate realAssets = idle + sum(adapter realAssets)
    realAssets = idleAssets + adapterRealAssets;

    // 6. Get maxTotalAssets from contract's accrueInterestView function
    // This avoids duplicating the maxRate cap calculation logic
    const [contractNewTotalAssets, contractPerfFeeShares, contractMgmtFeeShares] =
      await context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "accrueInterestView",
        blockNumber: event.block.number,
      }) as [bigint, bigint, bigint];

    // Get lastUpdate for elapsed time calculation
    const lastUpdate = await context.client.readContract({
      address: vaultAddress,
      abi: MorphoV2Abi,
      functionName: "lastUpdate",
      blockNumber: event.block.number,
    }) as bigint;

    elapsed = event.block.timestamp - lastUpdate;

    // maxTotalAssets is derived from the contract's calculation
    // We compute it as: previousTotalAssets + (newTotalAssets - previousTotalAssets from contract)
    // But actually, the contract's accrueInterestView already computed maxTotalAssets internally
    // and chose min(realAssets, maxTotalAssets) as newTotalAssets.
    // To get maxTotalAssets, we need to calculate it ourselves OR read maxRate
    const maxRate = await context.client.readContract({
      address: vaultAddress,
      abi: MorphoV2Abi,
      functionName: "maxRate",
      blockNumber: event.block.number,
    }) as bigint;

    // maxTotalAssets = previousTotalAssets + (previousTotalAssets * elapsed * maxRate / WAD)
    const maxInterest = (event.args.previousTotalAssets * elapsed * maxRate) / WAD;
    maxTotalAssets = event.args.previousTotalAssets + maxInterest;

    // Validation: Check if contract's calculation matches event args
    const contractMatchesEvent = contractNewTotalAssets === event.args.newTotalAssets;
    if (!contractMatchesEvent) {
      logger.warn({
        vaultAddress,
        blockNumber: event.block.number.toString(),
        contractNewTotalAssets: contractNewTotalAssets.toString(),
        eventNewTotalAssets: event.args.newTotalAssets.toString(),
        diff: (contractNewTotalAssets - event.args.newTotalAssets).toString(),
      }, "Contract accrueInterestView() differs from event - possible state change during block");
    }

    logger.debug({
      vaultAddress,
      blockNumber: event.block.number.toString(),
      realAssets: realAssets.toString(),
      idleAssets: idleAssets.toString(),
      adapterRealAssets: adapterRealAssets.toString(),
      maxTotalAssets: maxTotalAssets.toString(),
      newTotalAssets: event.args.newTotalAssets.toString(),
      contractNewTotalAssets: contractNewTotalAssets.toString(),
      contractMatchesEvent,
      cappedInterest: realAssets > maxTotalAssets ? (maxTotalAssets - event.args.previousTotalAssets).toString() : undefined,
    }, "AccrueInterest: Real asset metrics captured");

  } catch (error) {
    logger.error({
      vaultAddress,
      blockNumber: event.block.number.toString(),
      error,
    }, "Failed to fetch real asset metrics, using zero values");
    // Continue with zeros - better to have partial data than to fail completely
  }

  // Insert event record with real asset metrics
  await context.db.insert(accrueInterestEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    previousTotalAssets: event.args.previousTotalAssets,
    newTotalAssets: event.args.newTotalAssets,
    performanceFeeShares: event.args.performanceFeeShares,
    managementFeeShares: event.args.managementFeeShares,
    // Real asset metrics
    realAssets,
    idleAssets,
    maxTotalAssets,
    elapsed,
  });

  // Update vault table accounting state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: vaultAddress })
    .set({
      totalAssets: event.args.newTotalAssets,
      lastUpdateTimestamp: event.block.timestamp,
    });

  // Create checkpoint
  await checkpointManager.handleAccountingEvent(
    context,
    context.chain.id,
    vaultAddress,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
  );

  // Create historical snapshot
  await HistoricalSnapshotManager.createSnapshot(
    context,
    context.chain.id,
    vaultAddress,
    `${eventId}-snapshot`,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    "AccrueInterest",
  );
});

/*//////////////////////////////////////////////////////////////
                          DEPOSIT
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Deposit", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  try {
    console.log(`\n---------- Deposit Event (Block ${event.block.number}) ----------`);
    console.log(`Vault: ${event.log.address}`);
    console.log(`Sender: ${event.args.sender}`);
    console.log(`On Behalf: ${event.args.onBehalf}`);
    console.log(`Assets: ${event.args.assets.toString()}`);
    console.log(`Shares: ${event.args.shares.toString()}`);

    // Ensure vault exists
    await ensureVaultExists(
      context,
      event.log.address,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
    );

    // Insert event record
    await context.db.insert(depositEvent).values({
      id: eventId,
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: event.transaction.transactionIndex,
      logIndex: event.log.logIndex,
      sender: event.args.sender,
      onBehalf: event.args.onBehalf,
      assets: event.args.assets,
      shares: event.args.shares,
    });

    // Update vault table accounting state
    await context.db
      .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
      .set((row) => ({ totalAssets: row.totalAssets + event.args.assets }));

    // Update vault account deposit metrics
    await context.db
      .insert(vaultAccount)
      .values({
        chainId: context.chain.id,
        vaultAddress: event.log.address,
        accountAddress: event.args.onBehalf,
        sharesBalance: 0n, // balance comes from Transfer handler
        depositCount: 1,
        totalDepositedAssets: event.args.assets,
        totalDepositedShares: event.args.shares,
        firstSeenBlockNumber: event.block.number,
        firstSeenBlockTimestamp: event.block.timestamp,
        lastSeenBlockNumber: event.block.number,
        lastSeenBlockTimestamp: event.block.timestamp,
        lastTransactionHash: event.transaction.hash,
        lastLogIndex: event.log.logIndex,
      })
      .onConflictDoUpdate((row) => ({
        depositCount: row.depositCount + 1,
        totalDepositedAssets: row.totalDepositedAssets + event.args.assets,
        totalDepositedShares: row.totalDepositedShares + event.args.shares,
        lastSeenBlockNumber: event.block.number,
        lastSeenBlockTimestamp: event.block.timestamp,
        lastTransactionHash: event.transaction.hash,
        lastLogIndex: event.log.logIndex,
      }));

    // Create checkpoint
    await checkpointManager.handleAccountingEvent(
      context,
      context.chain.id,
      event.log.address,
      eventId,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.log.logIndex,
    );

    // Create historical snapshot
    await HistoricalSnapshotManager.createSnapshot(
      context,
      context.chain.id,
      event.log.address,
      `${eventId}-snapshot`,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.log.logIndex,
      "Deposit",
    );

    console.log(`✓ Deposit indexed successfully`);
    console.log(`------------------------------------------------------------\n`);
  } catch (error) {
    logger.error({
      error,
      vaultAddress: event.log.address,
      blockNumber: event.block.number.toString()
    }, "Failed to process Deposit event");
    throw error;
  }
});

/*//////////////////////////////////////////////////////////////
                          WITHDRAW
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Withdraw", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Ensure vault exists
  await ensureVaultExists(
    context,
    event.log.address,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
  );

  // Insert event record
  await context.db.insert(withdrawEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    sender: event.args.sender,
    receiver: event.args.receiver,
    onBehalf: event.args.onBehalf,
    assets: event.args.assets,
    shares: event.args.shares,
  });

  // Update vault table accounting state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set((row) => ({ totalAssets: row.totalAssets - event.args.assets }));

  // Update vault account withdraw metrics
  await context.db
    .insert(vaultAccount)
    .values({
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      accountAddress: event.args.onBehalf,
      sharesBalance: 0n, // balance comes from Transfer handler
      withdrawCount: 1,
      totalWithdrawnAssets: event.args.assets,
      totalWithdrawnShares: event.args.shares,
      firstSeenBlockNumber: event.block.number,
      firstSeenBlockTimestamp: event.block.timestamp,
      lastSeenBlockNumber: event.block.number,
      lastSeenBlockTimestamp: event.block.timestamp,
      lastTransactionHash: event.transaction.hash,
      lastLogIndex: event.log.logIndex,
    })
    .onConflictDoUpdate((row) => ({
      withdrawCount: row.withdrawCount + 1,
      totalWithdrawnAssets: row.totalWithdrawnAssets + event.args.assets,
      totalWithdrawnShares: row.totalWithdrawnShares + event.args.shares,
      lastSeenBlockNumber: event.block.number,
      lastSeenBlockTimestamp: event.block.timestamp,
      lastTransactionHash: event.transaction.hash,
      lastLogIndex: event.log.logIndex,
    }));

  // Create checkpoint
  await checkpointManager.handleAccountingEvent(
    context,
    context.chain.id,
    event.log.address,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
  );

  // Create historical snapshot
  await HistoricalSnapshotManager.createSnapshot(
    context,
    context.chain.id,
    event.log.address,
    `${eventId}-snapshot`,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    "Withdraw",
  );
});

/*//////////////////////////////////////////////////////////////
                          TRANSFER (MINT/BURN)
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Transfer", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;
  const chainId = context.chain.id;
  const vaultAddress = event.log.address;
  const from = event.args.from;
  const to = event.args.to;
  const shares = event.args.shares;
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const logIndex = event.log.logIndex;

  const isMint = from === zeroAddress;
  const isBurn = to === zeroAddress;

  // Insert event record
  await context.db.insert(transferEvent).values({
    id: eventId,
    chainId,
    vaultAddress,
    blockNumber,
    blockTimestamp,
    transactionHash: txHash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex,
    from,
    to,
    shares,
  });

  // Helper: upsert + delta update for share balances
  async function applyShareDelta(accountAddress: `0x${string}`, delta: bigint) {
    if (accountAddress === zeroAddress) return;

    await context.db
      .insert(vaultAccount)
      .values({
        chainId,
        vaultAddress,
        accountAddress,
        sharesBalance: delta, // on insert, start at delta
        firstSeenBlockNumber: blockNumber,
        firstSeenBlockTimestamp: blockTimestamp,
        lastSeenBlockNumber: blockNumber,
        lastSeenBlockTimestamp: blockTimestamp,
        lastTransactionHash: txHash,
        lastLogIndex: logIndex,
      })
      .onConflictDoUpdate((row) => ({
        sharesBalance: row.sharesBalance + delta,
        lastSeenBlockNumber: blockNumber,
        lastSeenBlockTimestamp: blockTimestamp,
        lastTransactionHash: txHash,
        lastLogIndex: logIndex,
      }));
  }

  // Update share balances for all transfers (mint, burn, transfer)
  // from loses shares (unless mint)
  if (from !== zeroAddress) await applyShareDelta(from, -shares);
  // to gains shares (unless burn)
  if (to !== zeroAddress) await applyShareDelta(to, shares);

  // Only create checkpoints for mint and burn (totalSupply changes)
  if (isMint) {
    // Update vault table accounting state
    await context.db
      .update(vaultV2, { chainId, address: vaultAddress })
      .set((row) => ({ totalSupply: row.totalSupply + shares }));

    // Mint: totalSupply += shares
    await checkpointManager.handleAccountingEvent(
      context,
      chainId,
      vaultAddress,
      eventId,
      blockNumber,
      blockTimestamp,
      txHash,
      logIndex,
    );

    // Create historical snapshot
    await HistoricalSnapshotManager.createSnapshot(
      context,
      chainId,
      vaultAddress,
      `${eventId}-snapshot`,
      blockNumber,
      blockTimestamp,
      txHash,
      logIndex,
      "Transfer",
    );
  } else if (isBurn) {
    // Update vault table accounting state
    await context.db
      .update(vaultV2, { chainId, address: vaultAddress })
      .set((row) => ({ totalSupply: row.totalSupply - shares }));

    // Burn: totalSupply -= shares
    await checkpointManager.handleAccountingEvent(
      context,
      chainId,
      vaultAddress,
      eventId,
      blockNumber,
      blockTimestamp,
      txHash,
      logIndex,
    );

    // Create historical snapshot
    await HistoricalSnapshotManager.createSnapshot(
      context,
      chainId,
      vaultAddress,
      `${eventId}-snapshot`,
      blockNumber,
      blockTimestamp,
      txHash,
      logIndex,
      "Transfer",
    );
  }
  // Regular transfers (from != 0x0 && to != 0x0) do not change totalSupply, so no checkpoint needed
  // But we still update share balances above
});
