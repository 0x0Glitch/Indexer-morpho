export const MorphoV2Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "_asset",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "asset",
        type: "address",
      },
    ],
    name: "Constructor",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "SetOwner",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newCurator",
        type: "address",
      },
    ],
    name: "SetCurator",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "newIsSentinel",
        type: "bool",
      },
    ],
    name: "SetIsSentinel",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "newIsAllocator",
        type: "bool",
      },
    ],
    name: "SetIsAllocator",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "newName",
        type: "string",
      },
    ],
    name: "SetName",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "newSymbol",
        type: "string",
      },
    ],
    name: "SetSymbol",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newReceiveSharesGate",
        type: "address",
      },
    ],
    name: "SetReceiveSharesGate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newSendSharesGate",
        type: "address",
      },
    ],
    name: "SetSendSharesGate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newReceiveAssetsGate",
        type: "address",
      },
    ],
    name: "SetReceiveAssetsGate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newSendAssetsGate",
        type: "address",
      },
    ],
    name: "SetSendAssetsGate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newAdapterRegistry",
        type: "address",
      },
    ],
    name: "SetAdapterRegistry",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "AddAdapter",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "RemoveAdapter",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes4",
        name: "selector",
        type: "bytes4",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newDuration",
        type: "uint256",
      },
    ],
    name: "DecreaseTimelock",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes4",
        name: "selector",
        type: "bytes4",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newDuration",
        type: "uint256",
      },
    ],
    name: "IncreaseTimelock",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes4",
        name: "selector",
        type: "bytes4",
      },
    ],
    name: "Abdicate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newLiquidityAdapter",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes",
        name: "newLiquidityData",
        type: "bytes",
      },
    ],
    name: "SetLiquidityAdapterAndData",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newPerformanceFee",
        type: "uint256",
      },
    ],
    name: "SetPerformanceFee",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newPerformanceFeeRecipient",
        type: "address",
      },
    ],
    name: "SetPerformanceFeeRecipient",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newManagementFee",
        type: "uint256",
      },
    ],
    name: "SetManagementFee",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "newManagementFeeRecipient",
        type: "address",
      },
    ],
    name: "SetManagementFeeRecipient",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "idData",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newAbsoluteCap",
        type: "uint256",
      },
    ],
    name: "DecreaseAbsoluteCap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "idData",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newAbsoluteCap",
        type: "uint256",
      },
    ],
    name: "IncreaseAbsoluteCap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "idData",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newRelativeCap",
        type: "uint256",
      },
    ],
    name: "DecreaseRelativeCap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "idData",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newRelativeCap",
        type: "uint256",
      },
    ],
    name: "IncreaseRelativeCap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newMaxRate",
        type: "uint256",
      },
    ],
    name: "SetMaxRate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "adapter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "forceDeallocatePenalty",
        type: "uint256",
      },
    ],
    name: "SetForceDeallocatePenalty",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "previousTotalAssets",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newTotalAssets",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "performanceFeeShares",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "managementFeeShares",
        type: "uint256",
      },
    ],
    name: "AccrueInterest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "adapter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32[]",
        name: "ids",
        type: "bytes32[]",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "change",
        type: "int256",
      },
    ],
    name: "Allocate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "adapter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32[]",
        name: "ids",
        type: "bytes32[]",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "change",
        type: "int256",
      },
    ],
    name: "Deallocate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "adapter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32[]",
        name: "ids",
        type: "bytes32[]",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "penaltyAssets",
        type: "uint256",
      },
    ],
    name: "ForceDeallocate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
    ],
    name: "Withdraw",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
] as const;
