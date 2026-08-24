import toolbox from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default {
  plugins: [toolbox],
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  paths: { sources: "./contracts", tests: "./test", cache: "./.hardhat-cache", artifacts: "./artifacts" },
};
