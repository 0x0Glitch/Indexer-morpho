import { ponder } from "ponder:registry";
import {
  vaultV2,
  adapterPenalty,
  ownerSetEvent,
  curatorSetEvent,
  sentinelSetEvent,
  allocatorSetEvent,
  nameSetEvent,
  symbolSetEvent,
  gateSetEvent,
  adapterRegistrySetEvent,
  adapterMembershipEvent,
  timelockDurationChangeEvent,
  abdicateEvent,
  liquidityAdapterSetEvent,
  performanceFeeSetEvent,
  performanceFeeRecipientSetEvent,
  managementFeeSetEvent,
  managementFeeRecipientSetEvent,
  absoluteCapChangeEvent,
  relativeCapChangeEvent,
  maxRateSetEvent,
  forceDeallocatePenaltySetEvent,
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
    // Creation metadata
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
    createdAtTransaction: event.transaction.hash,
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
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(ownerSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
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
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(curatorSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
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
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(sentinelSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
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
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(allocatorSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
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
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(nameSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newName: event.args.newName,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ name: event.args.newName });
});

ponder.on("MorphoV2:SetSymbol", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(symbolSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newSymbol: event.args.newSymbol,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ symbol: event.args.newSymbol });
});

/*//////////////////////////////////////////////////////////////
                              GATES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetReceiveSharesGate", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(gateSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    gateType: "receiveShares",
    newGate: event.args.newReceiveSharesGate,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ receiveSharesGate: event.args.newReceiveSharesGate });
});

ponder.on("MorphoV2:SetSendSharesGate", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(gateSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    gateType: "sendShares",
    newGate: event.args.newSendSharesGate,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ sendSharesGate: event.args.newSendSharesGate });
});

ponder.on("MorphoV2:SetReceiveAssetsGate", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(gateSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    gateType: "receiveAssets",
    newGate: event.args.newReceiveAssetsGate,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ receiveAssetsGate: event.args.newReceiveAssetsGate });
});

ponder.on("MorphoV2:SetSendAssetsGate", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(gateSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    gateType: "sendAssets",
    newGate: event.args.newSendAssetsGate,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ sendAssetsGate: event.args.newSendAssetsGate });
});

/*//////////////////////////////////////////////////////////////
                      ADAPTER REGISTRY
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetAdapterRegistry", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(adapterRegistrySetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newAdapterRegistry: event.args.newAdapterRegistry,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ adapterRegistry: event.args.newAdapterRegistry });
});

/*//////////////////////////////////////////////////////////////
                    ADAPTER MEMBERSHIP
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:AddAdapter", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(adapterMembershipEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "add",
    account: event.args.account,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set((row) => {
      const set = new Set(row.adapters);
      set.add(event.args.account);
      return { adapters: [...set] };
    });
});

ponder.on("MorphoV2:RemoveAdapter", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(adapterMembershipEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "remove",
    account: event.args.account,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set((row) => {
      const set = new Set(row.adapters);
      set.delete(event.args.account);
      return { adapters: [...set] };
    });
});

/*//////////////////////////////////////////////////////////////
                    TIMELOCK DURATIONS
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:DecreaseTimelock", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(timelockDurationChangeEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "decrease",
    selector: event.args.selector,
    newDuration: event.args.newDuration,
  });
});

ponder.on("MorphoV2:IncreaseTimelock", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(timelockDurationChangeEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "increase",
    selector: event.args.selector,
    newDuration: event.args.newDuration,
  });
});

/*//////////////////////////////////////////////////////////////
                        ABDICATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Abdicate", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(abdicateEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    selector: event.args.selector,
  });
});

/*//////////////////////////////////////////////////////////////
                    LIQUIDITY ADAPTER
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetLiquidityAdapterAndData", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(liquidityAdapterSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    sender: event.args.sender,
    newLiquidityAdapter: event.args.newLiquidityAdapter,
    newLiquidityData: event.args.newLiquidityData,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({
      liquidityAdapter: event.args.newLiquidityAdapter,
      liquidityData: event.args.newLiquidityData,
    });
});

/*//////////////////////////////////////////////////////////////
                            FEES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetPerformanceFee", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(performanceFeeSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newPerformanceFee: event.args.newPerformanceFee,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ performanceFee: event.args.newPerformanceFee });
});

ponder.on("MorphoV2:SetPerformanceFeeRecipient", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(performanceFeeRecipientSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newPerformanceFeeRecipient: event.args.newPerformanceFeeRecipient,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ performanceFeeRecipient: event.args.newPerformanceFeeRecipient });
});

ponder.on("MorphoV2:SetManagementFee", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(managementFeeSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newManagementFee: event.args.newManagementFee,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ managementFee: event.args.newManagementFee });
});

ponder.on("MorphoV2:SetManagementFeeRecipient", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(managementFeeRecipientSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newManagementFeeRecipient: event.args.newManagementFeeRecipient,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ managementFeeRecipient: event.args.newManagementFeeRecipient });
});

/*//////////////////////////////////////////////////////////////
                      RATE & PENALTIES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetMaxRate", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(maxRateSetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    newMaxRate: event.args.newMaxRate,
  });

  // Update vault state
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ maxRate: event.args.newMaxRate });
});

ponder.on("MorphoV2:SetForceDeallocatePenalty", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(forceDeallocatePenaltySetEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    adapter: event.args.adapter,
    forceDeallocatePenalty: event.args.forceDeallocatePenalty,
  });

  // Update adapter penalty state (upsert on composite PK: chainId, vaultAddress, adapterAddress)
  await context.db
    .insert(adapterPenalty)
    .values({
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      adapterAddress: event.args.adapter,
      forceDeallocatePenalty: event.args.forceDeallocatePenalty,
    })
    .onConflictDoUpdate({
      forceDeallocatePenalty: event.args.forceDeallocatePenalty,
    });
});

/*//////////////////////////////////////////////////////////////
                            CAPS
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:DecreaseAbsoluteCap", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(absoluteCapChangeEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "decrease",
    senderAddress: event.args.sender,
    marketId: event.args.id,
    idData: event.args.idData,
    newAbsoluteCap: event.args.newAbsoluteCap,
  });
});

ponder.on("MorphoV2:IncreaseAbsoluteCap", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(absoluteCapChangeEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "increase",
    senderAddress: null,
    marketId: event.args.id,
    idData: event.args.idData,
    newAbsoluteCap: event.args.newAbsoluteCap,
  });
});

ponder.on("MorphoV2:DecreaseRelativeCap", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(relativeCapChangeEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "decrease",
    senderAddress: event.args.sender,
    marketId: event.args.id,
    idData: event.args.idData,
    newRelativeCap: event.args.newRelativeCap,
  });
});

ponder.on("MorphoV2:IncreaseRelativeCap", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record
  await context.db.insert(relativeCapChangeEvent).values({
    id: eventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    action: "increase",
    senderAddress: null,
    marketId: event.args.id,
    idData: event.args.idData,
    newRelativeCap: event.args.newRelativeCap,
  });
});

