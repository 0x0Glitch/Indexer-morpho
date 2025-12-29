import { vaultV2, identifierState, vaultMetricsHistorical } from "ponder:schema";
import { createLogger } from "./utils/logger";
import { MorphoV2Abi } from "../abis/MorphoV2Abi";

const logger = createLogger({ module: "HistoricalSnapshotManager" });

// Precision constant for share price calculations (18 decimals)
const WAD = 1_000_000_000_000_000_000n;

/**
 * Historical Snapshot Manager
 *
 * Creates vault state snapshots only when values change.
 * Each new row copies previous values and only updates what changed.
 * This creates an efficient, queryable history of vault state.
 */

export class HistoricalSnapshotManager {
  /**
   * Create a snapshot, copying previous values and updating only what changed
   */
  static async createSnapshot(
    context: any,
    chainId: number,
    vaultAddress: `0x${string}`,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: `0x${string}`,
    logIndex: number,
    eventType: string,
  ): Promise<void> {
    // Get current vault state
    const vault = await context.db.find(vaultV2, {
      chainId,
      address: vaultAddress,
    });

    if (!vault) {
      logger.warn({
        vaultAddress,
        chainId,
        blockNumber: blockNumber.toString(),
        eventType,
      }, "Cannot create snapshot - vault not found");
      return;
    }

    // Get the most recent snapshot to copy from
    const previousSnapshots = await context.db
      .select()
      .from(vaultMetricsHistorical)
      .where((row: any) =>
        row.chainId === chainId && row.vaultAddress === vaultAddress
      )
      .orderBy((row: any, { desc }: any) => desc(row.blockNumber))
      .limit(1);

    const previousSnapshot = previousSnapshots[0];

    // Get all current identifier states (allocations, caps)
    const identifiers = await context.db
      .select({
        identifierHash: identifierState.identifierHash,
        absoluteCap: identifierState.absoluteCap,
        relativeCap: identifierState.relativeCap,
        allocation: identifierState.allocation,
      })
      .from(identifierState)
      .where((row: any) =>
        row.chainId === chainId && row.vaultAddress === vaultAddress
      );

    // Build current allocation, absoluteCap, and relativeCap hashmaps
    const allocations: Record<string, string> = {};
    const absoluteCaps: Record<string, string> = {};
    const relativeCaps: Record<string, string> = {};
    let totalAllocated = 0n;

    for (const identifier of identifiers) {
      const hash = identifier.identifierHash;
      allocations[hash] = identifier.allocation.toString();
      absoluteCaps[hash] = identifier.absoluteCap.toString();
      relativeCaps[hash] = identifier.relativeCap.toString();
      totalAllocated += identifier.allocation;
    }

    // Calculate raw share price (simple ratio, informational only)
    const rawSharePrice = vault.totalSupply > 0n
      ? (vault.totalAssets * WAD) / vault.totalSupply
      : WAD; // 1:1 if no supply

    // Fetch canonical ERC4626 share price from contract using Ponder's readContract
    // This accounts for virtualShares and follows convertToAssets(1e18) semantics
    let sharePrice = WAD; // Default 1:1
    try {
      // Use Ponder's context.client to read convertToAssets(1e18)
      // This gives us the canonical VaultV2 price with virtualShares
      sharePrice = await context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "convertToAssets",
        args: [WAD],
        blockNumber,
      }) as bigint;
    } catch (error) {
      logger.warn({
        vaultAddress,
        blockNumber: blockNumber.toString(),
        error,
      }, "Failed to fetch canonical sharePrice from contract, using rawSharePrice");
      sharePrice = rawSharePrice; // Fallback to raw calculation
    }

    // Create new snapshot - copy from previous or use current vault state
    const newSnapshot = {
      id: eventId,
      chainId,
      vaultAddress,

      // Metadata
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      eventType,

      // Accounting metrics (always use current values)
      totalAssets: vault.totalAssets,
      totalSupply: vault.totalSupply,
      rawSharePrice, // Simple ratio for reference
      sharePrice,    // Canonical ERC4626 price from contract
      lastUpdateTimestamp: vault.lastUpdateTimestamp,

      // Allocations & caps (always use current values)
      allocations,
      absoluteCaps,
      relativeCaps,
      totalAllocated,

      // Configuration (copy from previous if no change, otherwise use current)
      maxRate: vault.maxRate,
      performanceFee: vault.performanceFee,
      managementFee: vault.managementFee,
      performanceFeeRecipient: vault.performanceFeeRecipient,
      managementFeeRecipient: vault.managementFeeRecipient,

      // Roles (copy from previous if no change, otherwise use current)
      allocators: vault.allocators,
      sentinels: vault.sentinels,
      adapters: vault.adapters,

      // Gates (copy from previous if no change, otherwise use current)
      receiveSharesGate: vault.receiveSharesGate,
      sendSharesGate: vault.sendSharesGate,
      receiveAssetsGate: vault.receiveAssetsGate,
      sendAssetsGate: vault.sendAssetsGate,

      // Metadata (copy from previous if no change, otherwise use current)
      owner: vault.owner,
      curator: vault.curator,
      adapterRegistry: vault.adapterRegistry,
      liquidityAdapter: vault.liquidityAdapter,
    };

    // Insert new snapshot
    await context.db.insert(vaultMetricsHistorical).values(newSnapshot);

    // Log snapshot creation with change tracking
    if (previousSnapshot) {
      const changes: Record<string, any> = {};

      if (newSnapshot.totalAssets !== previousSnapshot.totalAssets) {
        changes.totalAssets = {
          previous: previousSnapshot.totalAssets.toString(),
          current: newSnapshot.totalAssets.toString(),
        };
      }
      if (newSnapshot.totalAllocated !== previousSnapshot.totalAllocated) {
        changes.totalAllocated = {
          previous: previousSnapshot.totalAllocated.toString(),
          current: newSnapshot.totalAllocated.toString(),
        };
      }
      if (JSON.stringify(newSnapshot.allocators) !== JSON.stringify(previousSnapshot.allocators)) {
        changes.allocators = {
          previousCount: previousSnapshot.allocators.length,
          currentCount: newSnapshot.allocators.length,
        };
      }
      if (newSnapshot.sharePrice !== previousSnapshot.sharePrice) {
        changes.sharePrice = {
          previous: previousSnapshot.sharePrice.toString(),
          current: newSnapshot.sharePrice.toString(),
        };
      }
      if (newSnapshot.rawSharePrice !== previousSnapshot.rawSharePrice) {
        changes.rawSharePrice = {
          previous: previousSnapshot.rawSharePrice.toString(),
          current: newSnapshot.rawSharePrice.toString(),
        };
      }

      logger.info({
        eventType,
        vaultAddress,
        blockNumber: blockNumber.toString(),
        transactionHash,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      }, "Historical snapshot created");
    } else {
      logger.info({
        eventType,
        vaultAddress,
        blockNumber: blockNumber.toString(),
        transactionHash,
        totalAssets: vault.totalAssets.toString(),
        totalAllocated: totalAllocated.toString(),
        rawSharePrice: rawSharePrice.toString(),
        sharePrice: sharePrice.toString(),
      }, "First historical snapshot created");
    }
  }

  /**
   * Helper to determine if an event should trigger a snapshot
   */
  static shouldCreateSnapshot(eventType: string): boolean {
    const snapshotEvents = new Set([
      // Accounting events
      "Deposit",
      "Withdraw",
      "AccrueInterest",
      "Transfer",

      // Allocation events
      "Allocate",
      "Deallocate",
      "ForceDeallocate",

      // Cap changes
      "IncreaseAbsoluteCap",
      "DecreaseAbsoluteCap",
      "IncreaseRelativeCap",
      "DecreaseRelativeCap",

      // Configuration changes
      "SetIsAllocator",
      "SetIsSentinel",
      "SetPerformanceFee",
      "SetManagementFee",
      "SetMaxRate",
      "SetOwner",
      "SetCurator",

      // Adapter changes
      "AddAdapter",
      "RemoveAdapter",
      "SetAdapterRegistry",
      "SetForceDeallocatePenalty",

      // Gates
      "SetReceiveSharesGate",
      "SetSendSharesGate",
      "SetReceiveAssetsGate",
      "SetSendAssetsGate",
    ]);

    return snapshotEvents.has(eventType);
  }
}

export const historicalSnapshotManager = new HistoricalSnapshotManager();
