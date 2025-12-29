import { ponder } from "ponder:registry";
import {
  accrueInterestEvent,
  depositEvent,
  withdrawEvent,
  transferEvent,
  vaultV2,
} from "ponder:schema";
import { zeroAddress } from "viem";
import { checkpointManager } from "./VaultCheckpointManager";
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
});

/*//////////////////////////////////////////////////////////////
                          TRANSFER (MINT/BURN)
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Transfer", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;
  const isMint = event.args.from === zeroAddress;
  const isBurn = event.args.to === zeroAddress;

  // Insert event record
  await context.db.insert(transferEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    from: event.args.from,
    to: event.args.to,
    shares: event.args.shares,
  });

  // Only create checkpoints for mint and burn (totalSupply changes)
  if (isMint) {
    // Update vault table accounting state
    await context.db
      .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
      .set((row) => ({ totalSupply: row.totalSupply + event.args.shares }));

    // Mint: totalSupply += shares
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
  } else if (isBurn) {
    // Update vault table accounting state
    await context.db
      .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
      .set((row) => ({ totalSupply: row.totalSupply - event.args.shares }));

    // Burn: totalSupply -= shares
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
  }
  // Regular transfers (from != 0x0 && to != 0x0) do not change totalSupply, so no checkpoint needed
});
