import { onchainTable, primaryKey } from "ponder";
import { zeroAddress } from "viem";

/*//////////////////////////////////////////////////////////////
                              VAULTS V2
//////////////////////////////////////////////////////////////*/

export const vaultV2 = onchainTable(
  "vault_v2",
  (t) => ({
    chainId: t.integer().notNull(),
    address: t.hex().notNull(),

    // Immutables
    asset: t.hex().notNull(),

    // Configuration
    owner: t.hex().notNull(),
    curator: t.hex().notNull().default(zeroAddress),

    // Metadata
    name: t.text().notNull(),
    symbol: t.text().notNull(),
  }),
  (table) => ({
    // Composite primary key uniquely identifies a vault across chains
    pk: primaryKey({ columns: [table.chainId, table.address] }),
  }),
);
