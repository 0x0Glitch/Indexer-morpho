import { createConfig } from "ponder";
import { MorphoV2Abi } from "./abis/MorphoV2Abi";

/**
 * Production-safe multi-vault configuration
 *
 * Architecture:
 * - Single contract entry with address array (all vaults indexed together)
 * - startBlock = min(deployment across all vaults)
 * - CRITICAL: When adding vaults, NEVER increase startBlock, only decrease (or keep same)
 *
 * To add a new vault:
 * 1. Add vault address to the array below
 * 2. If new vault deployed BEFORE current startBlock:
 *    - Update startBlock to new vault's deployment block
 *    - Reindex will occur but existing data remains valid (deterministic)
 * 3. If new vault deployed AFTER current startBlock:
 *    - No startBlock change needed
 *    - Indexer auto-picks up vault from its Constructor event forward
 * 4. Restart indexer
 *
 * ensureVaultExists() will auto-backfill vault state via readContract if:
 * - Constructor event missed (indexing started mid-flight)
 * - Any event arrives before Constructor (out-of-order processing)
 */

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1!,
    },
  },
  contracts: {
    MorphoV2: {
      chain: "mainnet",
      abi: MorphoV2Abi,
      address: [
        "0xbeef0046fcab1dE47E41fB75BB3dC4Dfc94108E3",
      ],
      startBlock: 23903028, // Earliest vault deployment (NEVER increase this)
    },
  },
});
