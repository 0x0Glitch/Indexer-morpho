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
import { HistoricalSnapshotManager } from "./HistoricalSnapshotManager";
import { createLogger } from "./utils/logger";

const logger = createLogger({ module: "CheckpointHandlers" });

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

/**
 * Helper function to ensure vault exists before updating
 * Creates vault with minimal data if it doesn't exist (e.g., if indexing started after deployment)
 */
async function ensureVaultExists(
  context: any,
  vaultAddress: `0x${string}`,
  blockNumber: bigint,
  blockTimestamp: bigint,
  transactionHash: `0x${string}`,
): Promise<void> {
  const existing = await context.db.find(vaultV2, {
    chainId: context.chain.id,
    address: vaultAddress,
  });

  if (!existing) {
    await context.db.insert(vaultV2).values({
      chainId: context.chain.id,
      address: vaultAddress,
      createdAtBlock: blockNumber,
      createdAtTimestamp: blockTimestamp,
      createdAtTransaction: transactionHash,
      asset: zeroAddress,
      owner: zeroAddress,
      curator: zeroAddress,
      name: "",
      symbol: "",
    });
  }
}

/*//////////////////////////////////////////////////////////////
                      ACCRUE INTEREST
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:AccrueInterest", async ({ event, context }) => {
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
  await context.db.insert(accrueInterestEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    previousTotalAssets: event.args.previousTotalAssets,
    newTotalAssets: event.args.newTotalAssets,
    performanceFeeShares: event.args.performanceFeeShares,
    managementFeeShares: event.args.managementFeeShares,
  });

  // Update vault table accounting state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({
      totalAssets: event.args.newTotalAssets,
      lastUpdateTimestamp: event.block.timestamp,
    });

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
