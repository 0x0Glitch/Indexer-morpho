import { onchainTable, primaryKey, index } from "ponder";
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

    // Role toggles
    allocators: t.hex().array().notNull().default([]),
    sentinels: t.hex().array().notNull().default([]),

    // Gates
    receiveSharesGate: t.hex().notNull().default(zeroAddress),
    sendSharesGate: t.hex().notNull().default(zeroAddress),
    receiveAssetsGate: t.hex().notNull().default(zeroAddress),
    sendAssetsGate: t.hex().notNull().default(zeroAddress),

    // Metadata
    name: t.text().notNull(),
    symbol: t.text().notNull(),
  }),
  (table) => ({
    // Composite primary key uniquely identifies a vault across chains
    pk: primaryKey({ columns: [table.chainId, table.address] }),
  }),
);

/*//////////////////////////////////////////////////////////////
                          EVENT TABLES
//////////////////////////////////////////////////////////////*/

export const ownerSetEvent = onchainTable(
  "owner_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newOwner: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const curatorSetEvent = onchainTable(
  "curator_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newCurator: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const sentinelSetEvent = onchainTable(
  "sentinel_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    account: t.hex().notNull(),
    newIsSentinel: t.boolean().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    accountIdx: index().on(table.account),
  }),
);

export const allocatorSetEvent = onchainTable(
  "allocator_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    account: t.hex().notNull(),
    newIsAllocator: t.boolean().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    accountIdx: index().on(table.account),
  }),
);

export const nameSetEvent = onchainTable(
  "name_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newName: t.text().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const symbolSetEvent = onchainTable(
  "symbol_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newSymbol: t.text().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const gateSetEvent = onchainTable(
  "gate_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    gateType: t.text().notNull(), // 'receiveShares', 'sendShares', 'receiveAssets', 'sendAssets'
    newGate: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    gateTypeIdx: index().on(table.gateType),
  }),
);
