import type { Context } from "ponder:registry";
import type { Hex } from "viem";
import { capCheckpoint, identifierState } from "ponder:schema";

/**
 * @dev CapCheckpointManager
 *
 * Manages the append-only capCheckpoint table for historical cap and allocation tracking.
 *
 * Architecture:
 * - identifierState table: Current state (1 row per identifier, updated in place)
 * - capCheckpoint table: Complete history (append-only snapshots)
 *
 * Each identifier has its own timeline of cap/allocation changes.
 *
 * Key features:
 * - Tracks absoluteCap, relativeCap, and allocation per identifier
 * - Creates checkpoints on cap changes and allocation changes
 * - Enables point-in-time queries per identifier via "state as-of timestamp"
 */

export interface CapState {
  absoluteCap: bigint;
  relativeCap: bigint;
  allocation: bigint;
}

export class CapCheckpointManager {
  /**
   * Get current state for an identifier
   */
  private async getCurrentState(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    identifierHash: Hex,
  ): Promise<CapState> {
    const state = await context.db.find(identifierState, {
      chainId,
      vaultAddress,
      identifierHash,
    });

    if (state) {
      return {
        absoluteCap: state.absoluteCap,
        relativeCap: state.relativeCap,
        allocation: state.allocation,
      };
    }

    // Fallback for new identifiers
    return {
      absoluteCap: 0n,
      relativeCap: 0n,
      allocation: 0n,
    };
  }

  /**
   * Create cap/allocation checkpoint
   */
  async createCheckpoint(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    identifierHash: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    state: CapState,
    identifierData: string | null = null,
  ): Promise<void> {
    await context.db.insert(capCheckpoint).values({
      id: eventId,
      chainId,
      vaultAddress,
      identifierHash,
      identifierData,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      absoluteCap: state.absoluteCap,
      relativeCap: state.relativeCap,
      allocation: state.allocation,
    });
  }

  /**
   * Handle cap/allocation change - reads current state and creates checkpoint
   */
  async handleCapOrAllocationChange(
    context: Context,
    chainId: number,
    vaultAddress: Hex,
    identifierHash: Hex,
    eventId: string,
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hex,
    logIndex: number,
    identifierData: string | null = null,
  ): Promise<void> {
    const state = await this.getCurrentState(context, chainId, vaultAddress, identifierHash);

    await this.createCheckpoint(
      context,
      chainId,
      vaultAddress,
      identifierHash,
      eventId,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      state,
      identifierData,
    );
  }
}

// Singleton instance
export const capCheckpointManager = new CapCheckpointManager();
