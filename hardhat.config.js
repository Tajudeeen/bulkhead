import toolbox from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";

export default {
  plugins: [toolbox],
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
  paths: { sources: "./contracts", tests: "./test", cache: "./.hardhat-cache", artifacts: "./artifacts" },
  networks: {
    creditcoin: {
      type: "http",
      url: configVariable("CREDITCOIN_RPC_URL"),
      accounts: [configVariable("CREDITCOIN_WALLET_PRIVATE_KEY")],
    },
  },
};
