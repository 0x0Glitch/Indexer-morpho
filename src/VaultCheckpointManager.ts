import type { Context } from "ponder:registry";
import type { Hex } from "viem";
import { vaultCheckpoint, vaultV2 } from "ponder:schema";
import { zeroAddress } from "viem";

/**
 * @dev VaultCheckpointManager
 *
 * Manages the append-only vaultCheckpoint table for historical reconstruction.
 *
 * Architecture:
 * - vaultV2 table: Current state (1 row per vault, updated in place)
 * - vaultCheckpoint table: Complete history (append-only snapshots)
 *
 * Key features:
 * - Stateless - queries current state from vaultV2 table
 * - Creates checkpoints on accounting events and config changes
 * - Enables point-in-time queries via "state as-of timestamp"
 * - Safe for distributed deployments
 */

export interface VaultState {
  totalAssets: bigint;
  totalSupply: bigint;
  maxRate: bigint;
  performanceFee: bigint;
  managementFee: bigint;
  performanceFeeRecipient: Hex;
  managementFeeRecipient: Hex;
  lastUpdateTimestamp: bigint;
}

export class VaultCheckpointManager {
  /**
   * Get current vault state from vaultV2 table
   */
  private async getCurrentState(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
  ): Promise<VaultState> {
    const vault = await context.db.find(vaultV2, {
      chainId,
      address: vaultAddress,
    });

    if (vault) {
      return {
        totalAssets: vault.totalAssets,
        totalSupply: vault.totalSupply,
        maxRate: vault.maxRate,
        performanceFee: vault.performanceFee,
        managementFee: vault.managementFee,
        performanceFeeRecipient: vault.performanceFeeRecipient,
        managementFeeRecipient: vault.managementFeeRecipient,
        lastUpdateTimestamp: vault.lastUpdateTimestamp,
      };
    }

    // Fallback for new vaults
    return {
      totalAssets: 0n,
      totalSupply: 0n,
      maxRate: 0n,
      performanceFee: 0n,
      managementFee: 0n,
      performanceFeeRecipient: zeroAddress,
      managementFeeRecipient: zeroAddress,
      lastUpdateTimestamp: 0n,
    };
  }

  /**
   * Create checkpoint with provided state
   */
  async createCheckpoint(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    state: VaultState,
  ): Promise<void> {
    await context.db.insert(vaultCheckpoint).values({
      id: eventId,
      chainId,
      vaultAddress,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      totalAssets: state.totalAssets,
      totalSupply: state.totalSupply,
      maxRate: state.maxRate,
      performanceFee: state.performanceFee,
      managementFee: state.managementFee,
      performanceFeeRecipient: state.performanceFeeRecipient,
      managementFeeRecipient: state.managementFeeRecipient,
      lastUpdateTimestamp: state.lastUpdateTimestamp,
    });
  }

  /**
   * Handle accounting events - reads current state from vaultV2 table
   * (after it has been updated by the event handler)
   */
  async handleAccountingEvent(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);

    await this.createCheckpoint(
      context,
      chainId,
      vaultAddress,
      eventId,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      state,
    );
  }

  /**
   * Handle config events - reads current state from vaultV2 table
   * (after it has been updated by the event handler)
   */
  async handleConfigEvent(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);

    await this.createCheckpoint(
      context,
      chainId,
      vaultAddress,
      eventId,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      state,
    );
  }
}

// Singleton instance
export const checkpointManager = new VaultCheckpointManager();
