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
  await checkpointManager.handleAccrueInterest(
    context,
    context.chain.id,
    event.log.address,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    event.args.newTotalAssets,
  );
});

/*//////////////////////////////////////////////////////////////
                          DEPOSIT
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Deposit", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

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

  // Update state and create checkpoint
  await checkpointManager.handleDeposit(
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
                          WITHDRAW
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Withdraw", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

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

  // Update state and create checkpoint
  await checkpointManager.handleWithdraw(
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
    await checkpointManager.handleMint(
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
    await checkpointManager.handleBurn(
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
