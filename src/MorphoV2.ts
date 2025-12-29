import { ponder } from "ponder:registry";
import {
  vaultV2,
  adapterPenalty,
  identifierState,
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
  allocateEvent,
  deallocateEvent,
  forceDeallocateEvent,
} from "ponder:schema";
import { zeroAddress } from "viem";
import { checkpointManager } from "./VaultCheckpointManager";
import { capCheckpointManager } from "./CapCheckpointManager";
import { HistoricalSnapshotManager } from "./HistoricalSnapshotManager";
import { createLogger } from "./utils/logger";

const logger = createLogger({ module: "MorphoV2EventHandlers" });

/**
 * @dev Morpho V2 Event Handlers
 *
 * This file contains event handlers for Morpho V2 vault events.
 * Events are organized into logical sections following the v1 pattern.
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
    logger.warn({
      vaultAddress,
      blockNumber: blockNumber.toString(),
      transactionHash,
    }, "Vault not found - auto-creating with defaults (indexing started after deployment)");

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

    logger.debug({
      vaultAddress,
      blockNumber: blockNumber.toString(),
    }, "Vault record auto-created successfully");
  }
}

/*//////////////////////////////////////////////////////////////
                        VAULT CREATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Constructor", async ({ event, context }) => {
  try {
    logger.info({
      event: "VaultDeployment",
      vaultAddress: event.log.address,
      asset: event.args.asset,
      owner: event.args.owner,
      blockNumber: event.block.number.toString(),
      transactionHash: event.transaction.hash,
      timestamp: new Date(Number(event.block.timestamp) * 1000).toISOString(),
    }, "Vault deployed");

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

    logger.debug({
      vaultAddress: event.log.address,
      blockNumber: event.block.number.toString(),
    }, "Vault indexed successfully");
  } catch (error) {
    logger.error({
      error,
      vaultAddress: event.log.address,
      blockNumber: event.block.number.toString()
    }, "Failed to create vault record");
    throw error;
  }
});

/*//////////////////////////////////////////////////////////////
                            OWNERSHIP
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetOwner", async ({ event, context }) => {
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
    "SetOwner",
  );
});

/*//////////////////////////////////////////////////////////////
                          CONFIGURATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetCurator", async ({ event, context }) => {
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
    "SetCurator",
  );
});

/*//////////////////////////////////////////////////////////////
                          ROLE TOGGLES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetIsSentinel", async ({ event, context }) => {
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
    "SetIsSentinel",
  );
});

ponder.on("MorphoV2:SetIsAllocator", async ({ event, context }) => {
  const eventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  try {
    logger.info({
      event: "AllocatorStatusUpdate",
      vaultAddress: event.log.address,
      account: event.args.account,
      newIsAllocator: event.args.newIsAllocator,
      blockNumber: event.block.number.toString(),
    }, "Allocator status changed");

    // Ensure vault exists
    await ensureVaultExists(
      context,
      event.log.address,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
    );

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
      "SetIsAllocator",
    );

    logger.debug({
      vaultAddress: event.log.address,
      account: event.args.account,
      blockNumber: event.block.number.toString(),
    }, "SetIsAllocator event indexed");
  } catch (error) {
    logger.error({
      error,
      vaultAddress: event.log.address,
      blockNumber: event.block.number.toString()
    }, "Failed to process SetIsAllocator event");
    throw error;
  }
});

/*//////////////////////////////////////////////////////////////
                            METADATA
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetName", async ({ event, context }) => {
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

  // Ensure vault exists
  await ensureVaultExists(
    context,
    event.log.address,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
  );

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

  // Ensure vault exists
  await ensureVaultExists(
    context,
    event.log.address,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
  );

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
    "SetReceiveSharesGate",
  );
});

ponder.on("MorphoV2:SetSendSharesGate", async ({ event, context }) => {
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
    "SetSendSharesGate",
  );
});

ponder.on("MorphoV2:SetReceiveAssetsGate", async ({ event, context }) => {
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
    "SetReceiveAssetsGate",
  );
});

ponder.on("MorphoV2:SetSendAssetsGate", async ({ event, context }) => {
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
    "SetSendAssetsGate",
  );
});

/*//////////////////////////////////////////////////////////////
                      ADAPTER REGISTRY
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetAdapterRegistry", async ({ event, context }) => {
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
    "SetAdapterRegistry",
  );
});

/*//////////////////////////////////////////////////////////////
                    ADAPTER MEMBERSHIP
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:AddAdapter", async ({ event, context }) => {
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
    "AddAdapter",
  );
});

ponder.on("MorphoV2:RemoveAdapter", async ({ event, context }) => {
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
    "RemoveAdapter",
  );
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

  // Ensure vault exists
  await ensureVaultExists(
    context,
    event.log.address,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
  );

  // IMPORTANT: event.args.newLiquidityData is indexed in the event, so it only contains the keccak256 hash.
  // We need to fetch the real liquidityData from the contract's state.
  const realLiquidityData = await context.client.readContract({
    abi: [
      {
        inputs: [],
        name: "liquidityData",
        outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    address: event.log.address,
    functionName: "liquidityData",
    blockNumber: event.block.number,
  });

  // Convert bytes to hex string for storage
  const liquidityDataHex = realLiquidityData as `0x${string}`;

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
    newLiquidityDataTopic: event.args.newLiquidityData, // The hash from event topic
    newLiquidityData: liquidityDataHex, // The real data from contract state
  });

  // Update vault state with the real liquidityData
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({
      liquidityAdapter: event.args.newLiquidityAdapter,
      liquidityData: liquidityDataHex,
    });
});

/*//////////////////////////////////////////////////////////////
                            FEES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetPerformanceFee", async ({ event, context }) => {
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

  // Create checkpoint
  await checkpointManager.handleConfigEvent(
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
    "SetPerformanceFee",
  );
});

ponder.on("MorphoV2:SetPerformanceFeeRecipient", async ({ event, context }) => {
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

  // Create checkpoint
  await checkpointManager.handleConfigEvent(
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
    "SetPerformanceFeeRecipient",
  );
});

ponder.on("MorphoV2:SetManagementFee", async ({ event, context }) => {
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

  // Create checkpoint
  await checkpointManager.handleConfigEvent(
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
    "SetManagementFee",
  );
});

ponder.on("MorphoV2:SetManagementFeeRecipient", async ({ event, context }) => {
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

  // Create checkpoint
  await checkpointManager.handleConfigEvent(
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
    "SetManagementFeeRecipient",
  );
});

/*//////////////////////////////////////////////////////////////
                      RATE & PENALTIES
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetMaxRate", async ({ event, context }) => {
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

  // Create checkpoint
  await checkpointManager.handleConfigEvent(
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
    "SetMaxRate",
  );
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

  // Update identifier state (upsert pattern)
  await context.db
    .insert(identifierState)
    .values({
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      identifierHash: event.args.id,
      absoluteCap: event.args.newAbsoluteCap,
      relativeCap: 0n,
      allocation: 0n,
    })
    .onConflictDoUpdate({
      absoluteCap: event.args.newAbsoluteCap,
    });

  // Create checkpoint
  await capCheckpointManager.handleCapOrAllocationChange(
    context,
    context.chain.id,
    event.log.address,
    event.args.id,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    event.args.idData,
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
    "DecreaseAbsoluteCap",
  );
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

  // Update identifier state (upsert pattern)
  await context.db
    .insert(identifierState)
    .values({
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      identifierHash: event.args.id,
      absoluteCap: event.args.newAbsoluteCap,
      relativeCap: 0n,
      allocation: 0n,
    })
    .onConflictDoUpdate({
      absoluteCap: event.args.newAbsoluteCap,
    });

  // Create checkpoint
  await capCheckpointManager.handleCapOrAllocationChange(
    context,
    context.chain.id,
    event.log.address,
    event.args.id,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    event.args.idData,
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
    "IncreaseAbsoluteCap",
  );
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

  // Update identifier state (upsert pattern)
  await context.db
    .insert(identifierState)
    .values({
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      identifierHash: event.args.id,
      absoluteCap: 0n,
      relativeCap: event.args.newRelativeCap,
      allocation: 0n,
    })
    .onConflictDoUpdate({
      relativeCap: event.args.newRelativeCap,
    });

  // Create checkpoint
  await capCheckpointManager.handleCapOrAllocationChange(
    context,
    context.chain.id,
    event.log.address,
    event.args.id,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    event.args.idData,
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
    "DecreaseRelativeCap",
  );
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

  // Update identifier state (upsert pattern)
  await context.db
    .insert(identifierState)
    .values({
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      identifierHash: event.args.id,
      absoluteCap: 0n,
      relativeCap: event.args.newRelativeCap,
      allocation: 0n,
    })
    .onConflictDoUpdate({
      relativeCap: event.args.newRelativeCap,
    });

  // Create checkpoint
  await capCheckpointManager.handleCapOrAllocationChange(
    context,
    context.chain.id,
    event.log.address,
    event.args.id,
    eventId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    event.args.idData,
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
    "IncreaseRelativeCap",
  );
});

/*//////////////////////////////////////////////////////////////
                    ALLOCATION EVENTS
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Allocate", async ({ event, context }) => {
  const baseEventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record (single record for the entire allocation transaction)
  await context.db.insert(allocateEvent).values({
    id: baseEventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    sender: event.args.sender,
    adapter: event.args.adapter,
    assets: event.args.assets,
    change: event.args.change,
  });

  // Loop through each id in the ids[] array
  for (let i = 0; i < event.args.ids.length; i++) {
    const identifierHash = event.args.ids[i]!;
    const checkpointId = `${baseEventId}-${i}`;

    // Update identifier state - increment allocation
    await context.db
      .insert(identifierState)
      .values({
        chainId: context.chain.id,
        vaultAddress: event.log.address,
        identifierHash,
        absoluteCap: 0n,
        relativeCap: 0n,
        allocation: event.args.change, // For new records
      })
      .onConflictDoUpdate((row) => ({
        allocation: row.allocation + event.args.change,
      }));

    // Create checkpoint (identifierData = null for allocation events)
    await capCheckpointManager.handleCapOrAllocationChange(
      context,
      context.chain.id,
      event.log.address,
      identifierHash,
      checkpointId,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.log.logIndex,
      null, // identifierData is null for allocation events
    );
  }

  // Create historical snapshot (after all allocations are updated)
  await HistoricalSnapshotManager.createSnapshot(
    context,
    context.chain.id,
    event.log.address,
    `${baseEventId}-snapshot`,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    "Allocate",
  );
});

ponder.on("MorphoV2:Deallocate", async ({ event, context }) => {
  const baseEventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  // Insert event record (single record for the entire deallocation transaction)
  await context.db.insert(deallocateEvent).values({
    id: baseEventId,
    chainId: context.chain.id,
    vaultAddress: event.log.address,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.log.logIndex,
    sender: event.args.sender,
    adapter: event.args.adapter,
    assets: event.args.assets,
    change: event.args.change,
  });

  // Loop through each id in the ids[] array
  for (let i = 0; i < event.args.ids.length; i++) {
    const identifierHash = event.args.ids[i]!;
    const checkpointId = `${baseEventId}-${i}`;

    // Update identifier state - decrement allocation (change is typically negative)
    await context.db
      .insert(identifierState)
      .values({
        chainId: context.chain.id,
        vaultAddress: event.log.address,
        identifierHash,
        absoluteCap: 0n,
        relativeCap: 0n,
        allocation: event.args.change, // For new records
      })
      .onConflictDoUpdate((row) => ({
        allocation: row.allocation + event.args.change,
      }));

    // Create checkpoint (identifierData = null for allocation events)
    await capCheckpointManager.handleCapOrAllocationChange(
      context,
      context.chain.id,
      event.log.address,
      identifierHash,
      checkpointId,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.log.logIndex,
      null, // identifierData is null for allocation events
    );
  }

  // Create historical snapshot (after all deallocations are updated)
  await HistoricalSnapshotManager.createSnapshot(
    context,
    context.chain.id,
    event.log.address,
    `${baseEventId}-snapshot`,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.log.logIndex,
    "Deallocate",
  );
});

ponder.on("MorphoV2:ForceDeallocate", async ({ event, context }) => {
  const baseEventId = `${context.chain.id}-${event.transaction.hash}-${event.log.logIndex}`;

  try {
    logger.info({
      event: "ForceDeallocate",
      vaultAddress: event.log.address,
      sentinel: event.args.sender,
      adapter: event.args.adapter,
      assets: event.args.assets.toString(),
      onBehalf: event.args.onBehalf,
      penaltyAssets: event.args.penaltyAssets.toString(),
      identifiersCount: event.args.ids.length,
      blockNumber: event.block.number.toString(),
      transactionHash: event.transaction.hash,
    }, "Forced deallocation executed - allocator penalized");

    // Ensure vault exists
    await ensureVaultExists(
      context,
      event.log.address,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
    );

    // Insert event record (single record for the entire forced deallocation)
    await context.db.insert(forceDeallocateEvent).values({
      id: baseEventId,
      chainId: context.chain.id,
      vaultAddress: event.log.address,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: event.transaction.transactionIndex,
      logIndex: event.log.logIndex,
      sender: event.args.sender,
      adapter: event.args.adapter,
      assets: event.args.assets,
      onBehalf: event.args.onBehalf,
      penaltyAssets: event.args.penaltyAssets,
    });

    // Loop through each id in the ids[] array and update allocations
    // ForceDeallocate reduces allocations just like Deallocate, but with a penalty
    for (let i = 0; i < event.args.ids.length; i++) {
      const identifierHash = event.args.ids[i]!;
      const checkpointId = `${baseEventId}-${i}`;

      // The change is negative (deallocating), and typically:
      // change = -(assets + penaltyAssets) or similar, depending on VaultV2 semantics
      // We need to read the actual allocation change from the contract state or compute it
      // For now, we'll decrement by assets (the deallocation amount)
      // Note: The penalty is separate from the allocation change
      const allocationChange = -(event.args.assets); // Negative for deallocation

      // Update identifier state - decrement allocation
      await context.db
        .insert(identifierState)
        .values({
          chainId: context.chain.id,
          vaultAddress: event.log.address,
          identifierHash,
          absoluteCap: 0n,
          relativeCap: 0n,
          allocation: BigInt(allocationChange),
        })
        .onConflictDoUpdate((row) => ({
          allocation: row.allocation + BigInt(allocationChange),
        }));

      // Create checkpoint
      await capCheckpointManager.handleCapOrAllocationChange(
        context,
        context.chain.id,
        event.log.address,
        identifierHash,
        checkpointId,
        event.block.number,
        event.block.timestamp,
        event.transaction.hash,
        event.log.logIndex,
        null, // identifierData is null for allocation events
      );

      logger.debug({
        vaultAddress: event.log.address,
        identifierHash,
        identifierIndex: i + 1,
        totalIdentifiers: event.args.ids.length,
      }, "Identifier allocation updated for forced deallocation");
    }

    // Create historical snapshot (after all forced deallocations are updated)
    await HistoricalSnapshotManager.createSnapshot(
      context,
      context.chain.id,
      event.log.address,
      `${baseEventId}-snapshot`,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.log.logIndex,
      "ForceDeallocate",
    );

    logger.debug({
      vaultAddress: event.log.address,
      blockNumber: event.block.number.toString(),
      identifiersUpdated: event.args.ids.length,
    }, "ForceDeallocate event indexed successfully");
  } catch (error) {
    logger.error({
      error,
      vaultAddress: event.log.address,
      blockNumber: event.block.number.toString(),
      onBehalf: event.args.onBehalf,
      penaltyAssets: event.args.penaltyAssets.toString(),
    }, "Failed to process ForceDeallocate event");
    throw error;
  }
});
