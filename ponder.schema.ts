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

    // Adapter registry
    adapterRegistry: t.hex().notNull().default(zeroAddress),
    adapters: t.hex().array().notNull().default([]),

    // Liquidity adapter
    liquidityAdapter: t.hex().notNull().default(zeroAddress),
    liquidityData: t.text().notNull().default(""),

    // Fees
    performanceFee: t.bigint().notNull().default(0n),
    performanceFeeRecipient: t.hex().notNull().default(zeroAddress),
    managementFee: t.bigint().notNull().default(0n),
    managementFeeRecipient: t.hex().notNull().default(zeroAddress),

    // Rate
    maxRate: t.bigint().notNull().default(0n),

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

export const adapterPenalty = onchainTable(
  "adapter_penalty",
  (t) => ({
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    adapterAddress: t.hex().notNull(),

    forceDeallocatePenalty: t.bigint().notNull().default(0n),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.vaultAddress, table.adapterAddress] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
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

export const adapterRegistrySetEvent = onchainTable(
  "adapter_registry_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newAdapterRegistry: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const adapterMembershipEvent = onchainTable(
  "adapter_membership_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    action: t.text().notNull(), // 'add' or 'remove'
    account: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    accountIdx: index().on(table.account),
  }),
);

export const timelockDurationChangeEvent = onchainTable(
  "timelock_duration_change_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    action: t.text().notNull(), // 'increase' or 'decrease'
    selector: t.hex().notNull(),
    newDuration: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const abdicateEvent = onchainTable(
  "abdicate_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    selector: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const liquidityAdapterSetEvent = onchainTable(
  "liquidity_adapter_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    newLiquidityAdapter: t.hex().notNull(),
    newLiquidityData: t.text().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const performanceFeeSetEvent = onchainTable(
  "performance_fee_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newPerformanceFee: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const performanceFeeRecipientSetEvent = onchainTable(
  "performance_fee_recipient_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newPerformanceFeeRecipient: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const managementFeeSetEvent = onchainTable(
  "management_fee_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newManagementFee: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const managementFeeRecipientSetEvent = onchainTable(
  "management_fee_recipient_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newManagementFeeRecipient: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const absoluteCapChangeEvent = onchainTable(
  "absolute_cap_change_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    action: t.text().notNull(), // 'increase' or 'decrease'
    senderAddress: t.hex(), // null for increase, address for decrease
    marketId: t.hex().notNull(),
    idData: t.text().notNull(),
    newAbsoluteCap: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    marketIdx: index().on(table.marketId),
  }),
);

export const relativeCapChangeEvent = onchainTable(
  "relative_cap_change_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    action: t.text().notNull(), // 'increase' or 'decrease'
    senderAddress: t.hex(), // null for increase, address for decrease
    marketId: t.hex().notNull(),
    idData: t.text().notNull(),
    newRelativeCap: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    marketIdx: index().on(table.marketId),
  }),
);

export const maxRateSetEvent = onchainTable(
  "max_rate_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    newMaxRate: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
  }),
);

export const forceDeallocatePenaltySetEvent = onchainTable(
  "force_deallocate_penalty_set_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    adapter: t.hex().notNull(),
    forceDeallocatePenalty: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    adapterIdx: index().on(table.adapter),
  }),
);
