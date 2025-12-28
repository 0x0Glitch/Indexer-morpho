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
      address: "0x0000000000000000000000000000000000000000", // TODO: Replace with actual contract address
      startBlock: 1234567, // TODO: Replace with actual start block
    },
  },
});
