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
] as const;
