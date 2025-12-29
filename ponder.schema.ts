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

    // Creation metadata
    createdAtBlock: t.bigint().notNull(),
    createdAtTimestamp: t.bigint().notNull(),
    createdAtTransaction: t.hex().notNull(),

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

    // Accounting state (for checkpoint generation)
    totalAssets: t.bigint().notNull().default(0n),
    totalSupply: t.bigint().notNull().default(0n),
    lastUpdateTimestamp: t.bigint().notNull().default(0n),
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

export const identifierState = onchainTable(
  "identifier_state",
  (t) => ({
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    identifierHash: t.hex().notNull(),

    // Current cap state
    absoluteCap: t.bigint().notNull().default(0n),
    relativeCap: t.bigint().notNull().default(0n),

    // Current allocation
    allocation: t.bigint().notNull().default(0n),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.vaultAddress, table.identifierHash] }),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    newLiquidityAdapter: t.hex().notNull(),
    // IMPORTANT: Because newLiquidityData is indexed in the event, this stores only the keccak256 hash
    newLiquidityDataTopic: t.hex().notNull(), // The hash from the event topic
    // The actual liquidityData fetched from the contract's liquidityData() getter
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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
    transactionIndex: t.integer().notNull(),
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

/*//////////////////////////////////////////////////////////////
                    ACCOUNTING EVENT TABLES
//////////////////////////////////////////////////////////////*/

export const accrueInterestEvent = onchainTable(
  "accrue_interest_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    previousTotalAssets: t.bigint().notNull(),
    newTotalAssets: t.bigint().notNull(),
    performanceFeeShares: t.bigint().notNull(),
    managementFeeShares: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    timestampIdx: index().on(table.blockTimestamp),
  }),
);

export const depositEvent = onchainTable(
  "deposit_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    onBehalf: t.hex().notNull(),
    assets: t.bigint().notNull(),
    shares: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    senderIdx: index().on(table.sender),
    onBehalfIdx: index().on(table.onBehalf),
  }),
);

export const withdrawEvent = onchainTable(
  "withdraw_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    onBehalf: t.hex().notNull(),
    assets: t.bigint().notNull(),
    shares: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    senderIdx: index().on(table.sender),
    receiverIdx: index().on(table.receiver),
    onBehalfIdx: index().on(table.onBehalf),
  }),
);

export const transferEvent = onchainTable(
  "transfer_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    from: t.hex().notNull(),
    to: t.hex().notNull(),
    shares: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
  }),
);

export const allocateEvent = onchainTable(
  "allocate_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    adapter: t.hex().notNull(),
    assets: t.bigint().notNull(),
    change: t.bigint().notNull(), // int256 stored as bigint (can be negative)
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    senderIdx: index().on(table.sender),
    adapterIdx: index().on(table.adapter),
  }),
);

export const deallocateEvent = onchainTable(
  "deallocate_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    adapter: t.hex().notNull(),
    assets: t.bigint().notNull(),
    change: t.bigint().notNull(), // int256 stored as bigint (can be negative)
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    senderIdx: index().on(table.sender),
    adapterIdx: index().on(table.adapter),
  }),
);

export const forceDeallocateEvent = onchainTable(
  "force_deallocate_event",
  (t) => ({
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    logIndex: t.integer().notNull(),

    sender: t.hex().notNull(),
    adapter: t.hex().notNull(),
    assets: t.bigint().notNull(),
    onBehalf: t.hex().notNull(), // The allocator being forcibly deallocated
    penaltyAssets: t.bigint().notNull(), // Penalty paid by the forced party
    // Note: ids[] array is tracked via identifierState updates, similar to Allocate/Deallocate
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    senderIdx: index().on(table.sender),
    adapterIdx: index().on(table.adapter),
    onBehalfIdx: index().on(table.onBehalf), // Index for "who got penalized" queries
  }),
);

/*//////////////////////////////////////////////////////////////
                    VAULT CHECKPOINT METRICS
//////////////////////////////////////////////////////////////*/

export const vaultCheckpoint = onchainTable(
  "vault_checkpoint",
  (t) => ({
    // Primary key is the event ID that triggered this checkpoint
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),

    // Checkpoint metadata
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    // Snapshot of vault state at this point
    totalAssets: t.bigint().notNull(),
    totalSupply: t.bigint().notNull(),

    // Configuration snapshot (for valuation)
    maxRate: t.bigint().notNull(),
    performanceFee: t.bigint().notNull(),
    managementFee: t.bigint().notNull(),
    performanceFeeRecipient: t.hex().notNull(),
    managementFeeRecipient: t.hex().notNull(),

    // Last update timestamp from AccrueInterest
    lastUpdateTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    timestampIdx: index().on(table.blockTimestamp),
    // Composite index for point-in-time queries
    vaultTimestampIdx: index().on(table.chainId, table.vaultAddress, table.blockTimestamp),
  }),
);

/*//////////////////////////////////////////////////////////////
                    CAP & ALLOCATION CHECKPOINT
//////////////////////////////////////////////////////////////*/

export const capCheckpoint = onchainTable(
  "cap_checkpoint",
  (t) => ({
    // Primary key is the unique event ID
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),

    // Identifier for this cap/allocation state
    identifierHash: t.hex().notNull(),
    identifierData: t.text(), // Optional: idData from cap events, null for allocate/deallocate

    // Checkpoint metadata
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    // Cap state snapshot
    absoluteCap: t.bigint().notNull(),
    relativeCap: t.bigint().notNull(),

    // Allocation state snapshot
    allocation: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdIdx: index().on(table.chainId, table.vaultAddress, table.identifierHash),
    timestampIdx: index().on(table.blockTimestamp),
    // Composite index for point-in-time queries per identifier
    vaultIdTimestampIdx: index().on(table.chainId, table.vaultAddress, table.identifierHash, table.blockTimestamp),
  }),
);

/*//////////////////////////////////////////////////////////////
                VAULT METRICS HISTORICAL SNAPSHOT
//////////////////////////////////////////////////////////////*/

/**
 * Complete vault state snapshot created after every important event.
 * This table provides a single source of truth for historical vault metrics
 * at any point in time, making it easy to query past states without
 * reconstructing from individual events.
 */
export const vaultMetricsHistorical = onchainTable(
  "vault_metrics_historical",
  (t) => ({
    // Primary key is the event ID that triggered this snapshot
    id: t.text().notNull(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),

    // Snapshot metadata
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    eventType: t.text().notNull(), // e.g., 'Deposit', 'Withdraw', 'Allocate', 'SetIsAllocator'

    // ========== ACCOUNTING METRICS ==========
    totalAssets: t.bigint().notNull(),
    totalSupply: t.bigint().notNull(),

    // Share price metrics (both scaled by 1e18)
    // Raw price: simple totalAssets / totalSupply (informational only)
    rawSharePrice: t.bigint().notNull(),
    // ERC4626 price: actual convertToAssets(1e18) from contract (canonical)
    sharePrice: t.bigint().notNull(),

    lastUpdateTimestamp: t.bigint().notNull(),

    // ========== ALLOCATIONS SNAPSHOT ==========
    // JSON object: { "identifierHash": allocation }
 
    allocations: t.json().notNull().$type<Record<string, string>>().default({}),

    // JSON object: { "identifierHash": absoluteCap }
    absoluteCaps: t.json().notNull().$type<Record<string, string>>().default({}),

    // JSON object: { "identifierHash": relativeCap }
    relativeCaps: t.json().notNull().$type<Record<string, string>>().default({}),

    // ========== CONFIGURATION SNAPSHOT ==========
    maxRate: t.bigint().notNull(),
    performanceFee: t.bigint().notNull(),
    managementFee: t.bigint().notNull(),
    performanceFeeRecipient: t.hex().notNull(),
    managementFeeRecipient: t.hex().notNull(),

    // ========== ROLES SNAPSHOT ==========
    allocators: t.hex().array().notNull().default([]),
    sentinels: t.hex().array().notNull().default([]),
    adapters: t.hex().array().notNull().default([]),

    // ========== GATES SNAPSHOT ==========
    receiveSharesGate: t.hex().notNull(),
    sendSharesGate: t.hex().notNull(),
    receiveAssetsGate: t.hex().notNull(),
    sendAssetsGate: t.hex().notNull(),

    // ========== METADATA ==========
    owner: t.hex().notNull(),
    curator: t.hex().notNull(),
    adapterRegistry: t.hex().notNull(),
    liquidityAdapter: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    blockNumberIdx: index().on(table.blockNumber),
    timestampIdx: index().on(table.blockTimestamp),
    // Composite index for efficient point-in-time queries
    vaultBlockIdx: index().on(table.chainId, table.vaultAddress, table.blockNumber),
    vaultTimestampIdx: index().on(table.chainId, table.vaultAddress, table.blockTimestamp),
    eventTypeIdx: index().on(table.eventType),
  }),
);

/*//////////////////////////////////////////////////////////////
                    VAULT ACCOUNT (DEPOSITORS)
//////////////////////////////////////////////////////////////*/

/**
 * Current state of each account that has interacted with a vault.
 * Tracks current share balances (derived from ERC20 Transfer events)
 * and cumulative deposit/withdraw metrics.
 *
 * This is the "current depositors table" - query it to get:
 * - Current share holders and their balances
 * - Lifetime deposit/withdraw activity per account
 * - Net position calculations
 */
export const vaultAccount = onchainTable(
  "vault_account",
  (t) => ({
    // Composite primary key
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    accountAddress: t.hex().notNull(),

    // ========== CURRENT SHARE BALANCE ==========
    // Maintained by Transfer events (mint/burn/transfer)
    // Always accurate reflection of ERC20 share balance
    sharesBalance: t.bigint().notNull().default(0n),

    // ========== DEPOSIT METRICS ==========
    depositCount: t.integer().notNull().default(0),
    totalDepositedAssets: t.bigint().notNull().default(0n),
    totalDepositedShares: t.bigint().notNull().default(0n),

    // ========== WITHDRAW METRICS ==========
    withdrawCount: t.integer().notNull().default(0),
    totalWithdrawnAssets: t.bigint().notNull().default(0n),
    totalWithdrawnShares: t.bigint().notNull().default(0n),

    // ========== TRACKING METADATA ==========
    firstSeenBlockNumber: t.bigint().notNull(),
    firstSeenBlockTimestamp: t.bigint().notNull(),
    lastSeenBlockNumber: t.bigint().notNull(),
    lastSeenBlockTimestamp: t.bigint().notNull(),
    lastTransactionHash: t.hex().notNull(),
    lastLogIndex: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.vaultAddress, table.accountAddress] }),
    vaultIdx: index().on(table.chainId, table.vaultAddress),
    sharesBalanceIdx: index().on(table.chainId, table.vaultAddress, table.sharesBalance),
    accountIdx: index().on(table.accountAddress),
  }),
);
