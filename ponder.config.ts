import { createConfig } from "ponder";

import { MorphoV2Abi } from "./abis/MorphoV2Abi";

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
      // Multiple vault addresses can be indexed by providing an array
      // Each vault will be tracked independently with its own events
      address: [

      ],
      startBlock: 0, 
    },
  },
});
