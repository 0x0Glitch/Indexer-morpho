import { MorphoV2Abi } from "../../abis/MorphoV2Abi";
import { vaultV2 } from "ponder:schema";
import { createLogger } from "./logger";
import { zeroAddress } from "viem";

const logger = createLogger({ module: "VaultInitializer" });

/**
 * Ensures vault exists in database, auto-initializing from contract state if missing
 *
 * CRITICAL: This prevents "ghost vaults" with zero values when indexing starts mid-flight.
 * Instead of storing asset=0x0, owner=0x0, name="", we read current contract state.
 *
 * Called by event handlers before every vault update to ensure vault row exists.
 * Uses find() check + insert() pattern with guard to prevent duplicate reads.
 */
export async function ensureVaultExists(
  context: any,
  vaultAddress: `0x${string}`,
  blockNumber: bigint,
  blockTimestamp: bigint,
  transactionHash: `0x${string}`,
): Promise<void> {
  // Check if vault already exists
  const existing = await context.db.find(vaultV2, {
    chainId: context.chain.id,
    address: vaultAddress,
  });

  if (existing) {
    return; // Vault already initialized, skip
  }

  logger.warn({
    vaultAddress,
    blockNumber: blockNumber.toString(),
    transactionHash,
  }, "Vault not found - backfilling from contract state (indexing started after deployment)");

  // Read current vault state from contract at this block
  // This ensures we capture real values, not zeros
  try {
    const [
      asset,
      owner,
      curator,
      name,
      symbol,
      totalAssets,
      totalSupply,
      performanceFee,
      managementFee,
      performanceFeeRecipient,
      managementFeeRecipient,
      maxRate,
      adapterRegistry,
      liquidityAdapter,
      liquidityData,
      adapters,
      receiveSharesGate,
      sendSharesGate,
      receiveAssetsGate,
      sendAssetsGate,
      lastUpdate,
    ] = await Promise.all([
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "asset",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "owner",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "curator",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "name",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "symbol",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "totalAssets",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "totalSupply",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "performanceFee",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "managementFee",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "performanceFeeRecipient",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "managementFeeRecipient",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "maxRate",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "adapterRegistry",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "liquidityAdapter",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "liquidityData",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "adapters",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "receiveSharesGate",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "sendSharesGate",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "receiveAssetsGate",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "sendAssetsGate",
        blockNumber,
      }),
      context.client.readContract({
        address: vaultAddress,
        abi: MorphoV2Abi,
        functionName: "lastUpdate",
        blockNumber,
      }),
    ]);

    // Note: We don't read allocators/sentinels arrays because VaultV2 doesn't expose
    // a getter for them (it only has isAllocator/isSentinel mappings).
    // These will be populated by SetIsAllocator/SetIsSentinel events.

    await context.db.insert(vaultV2).values({
      chainId: context.chain.id,
      address: vaultAddress,
      createdAtBlock: blockNumber,
      createdAtTimestamp: blockTimestamp,
      createdAtTransaction: transactionHash,
      // Read from contract state
      asset: asset as `0x${string}`,
      owner: owner as `0x${string}`,
      curator: curator as `0x${string}`,
      name: name as string,
      symbol: symbol as string,
      totalAssets: totalAssets as bigint,
      totalSupply: totalSupply as bigint,
      performanceFee: performanceFee as bigint,
      managementFee: managementFee as bigint,
      performanceFeeRecipient: performanceFeeRecipient as `0x${string}`,
      managementFeeRecipient: managementFeeRecipient as `0x${string}`,
      maxRate: maxRate as bigint,
      adapterRegistry: adapterRegistry as `0x${string}`,
      liquidityAdapter: liquidityAdapter as `0x${string}`,
      liquidityData: (liquidityData as `0x${string}`) || "0x",
      adapters: adapters as `0x${string}`[],
      receiveSharesGate: receiveSharesGate as `0x${string}`,
      sendSharesGate: sendSharesGate as `0x${string}`,
      receiveAssetsGate: receiveAssetsGate as `0x${string}`,
      sendAssetsGate: sendAssetsGate as `0x${string}`,
      lastUpdateTimestamp: lastUpdate as bigint,
      // Allocators/sentinels populated by events (no contract getter)
      allocators: [],
      sentinels: [],
    });

    logger.info({
      vaultAddress,
      blockNumber: blockNumber.toString(),
      asset: asset as `0x${string}`,
      owner: owner as `0x${string}`,
      name: name as string,
      symbol: symbol as string,
      totalAssets: (totalAssets as bigint).toString(),
    }, "Vault backfilled from contract state");

  } catch (error) {
    logger.error({
      error,
      vaultAddress,
      blockNumber: blockNumber.toString(),
    }, "Failed to read vault state from contract - falling back to zero values");

    // Fallback: Create with zero values (bad, but better than crashing)
    // This should rarely happen unless vault doesn't implement all getters
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

    logger.warn({
      vaultAddress,
      blockNumber: blockNumber.toString(),
    }, "Vault created with zero values due to contract read failure");
  }
}
