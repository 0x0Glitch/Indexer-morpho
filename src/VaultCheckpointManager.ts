import type { Context } from "ponder:registry";
import type { Hex } from "viem";
import { vaultCheckpoint, vaultV2 } from "ponder:schema";
import { zeroAddress } from "viem";

/**
 * @dev VaultCheckpointManager
 *
 * Helper class for managing vault state checkpoints.
 * This class uses a stateless, event-driven approach where state is derived
 * from the vault table config.
 *
 * Key features:
 * - Stateless - relies on Ponder's ordered event processing
 * - Creates checkpoints on accounting events and config changes
 * - Enables point-in-time queries via "state as-of timestamp"
 * - Safe for distributed deployments
 *
 * This works because:
 * 1. AccrueInterest provides the new totalAssets directly
 * 2. Deposits/Withdraws are deltas that we track
 * 3. Mint/Burns are deltas for totalSupply
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
   * Get current vault state from vault table
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
   * Handle AccrueInterest: sets totalAssets directly from event
   */
  async handleAccrueInterest(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    newTotalAssets: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.totalAssets = newTotalAssets;
    state.lastUpdateTimestamp = blockTimestamp;

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
   * Handle Deposit: requires previous totalAssets
   * Note: This is a simplified version. In production, you'd query the previous checkpoint.
   */
  async handleDeposit(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    assets: bigint,
    previousTotalAssets: bigint, // Passed from caller who knows the state
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.totalAssets = previousTotalAssets + assets;

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
   * Handle Withdraw: requires previous totalAssets
   */
  async handleWithdraw(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    assets: bigint,
    previousTotalAssets: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.totalAssets = previousTotalAssets - assets;

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
   * Handle Mint: requires previous totalSupply
   */
  async handleMint(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    shares: bigint,
    previousTotalSupply: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.totalSupply = previousTotalSupply + shares;

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
   * Handle Burn: requires previous totalSupply
   */
  async handleBurn(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    shares: bigint,
    previousTotalSupply: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.totalSupply = previousTotalSupply - shares;

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
   * Handle config changes - these don't need previous state
   */
  async handleMaxRateChange(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    newMaxRate: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.maxRate = newMaxRate;

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

  async handlePerformanceFeeChange(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    newPerformanceFee: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.performanceFee = newPerformanceFee;

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

  async handleManagementFeeChange(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    newManagementFee: bigint,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.managementFee = newManagementFee;

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

  async handlePerformanceFeeRecipientChange(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    newPerformanceFeeRecipient: Hex,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.performanceFeeRecipient = newPerformanceFeeRecipient;

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

  async handleManagementFeeRecipientChange(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    newManagementFeeRecipient: Hex,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress);
    state.managementFeeRecipient = newManagementFeeRecipient;

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
