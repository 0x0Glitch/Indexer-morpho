import { ponder } from "ponder:registry";
import {
  vaultV2,
  ownerSetEvent,
  curatorSetEvent,
  sentinelSetEvent,
  allocatorSetEvent,
  nameSetEvent,
  symbolSetEvent,
} from "ponder:schema";
import { zeroAddress } from "viem";

/**
 * @dev Morpho V2 Event Handlers
 *
 * This file contains event handlers for Morpho V2 vault events.
 * Events are organized into logical sections following the v1 pattern.
 */

/*//////////////////////////////////////////////////////////////
                        VAULT CREATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Constructor", async ({ event, context }) => {
  await context.db.insert(vaultV2).values({
    // Primary key
    chainId: context.chain.id,
    address: event.log.address,
    // Immutables
    asset: event.args.asset,
    owner: event.args.owner,
    // Defaults - these will be set by subsequent events
    curator: zeroAddress,
    name: "",
    symbol: "",
  });
});

/*//////////////////////////////////////////////////////////////
                            OWNERSHIP
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetOwner", async ({ event, context }) => {
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(ownerSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    newOwner: event.args.newOwner,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ owner: event.args.newOwner });
});

/*//////////////////////////////////////////////////////////////
                          CONFIGURATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetCurator", async ({ event, context }) => {
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(curatorSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    newCurator: event.args.newCurator,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ curator: event.args.newCurator });
});

/*//////////////////////////////////////////////////////////////
                          ROLE TOGGLES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetIsSentinel", async ({ event, context }) => {
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(sentinelSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    account: event.args.account,
    newIsSentinel: event.args.newIsSentinel,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set((row) => {
      const set = new Set(row.sentinels);
      if (event.args.newIsSentinel) {
        set.add(event.args.account);
      } else {
        set.delete(event.args.account);
      }
      return { sentinels: [...set] };
    });
});

ponder.on("MorphoV2:SetIsAllocator", async ({ event, context }) => {
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(allocatorSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    account: event.args.account,
    newIsAllocator: event.args.newIsAllocator,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set((row) => {
      const set = new Set(row.allocators);
      if (event.args.newIsAllocator) {
        set.add(event.args.account);
      } else {
        set.delete(event.args.account);
      }
      return { allocators: [...set] };
    });
});

/*//////////////////////////////////////////////////////////////
                            METADATA
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetName", async ({ event, context }) => {
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(nameSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    newName: event.args.newName,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ name: event.args.newName });
});

ponder.on("MorphoV2:SetSymbol", async ({ event, context }) => {
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(symbolSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    newSymbol: event.args.newSymbol,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ symbol: event.args.newSymbol });
});

