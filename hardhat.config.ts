import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
dotenv.config();

// block Number to fork from
export const BLOCK_NUMBER = 17038902;
const config: HardhatUserConfig = {
  solidity: "0.8.17",
  paths: { tests: "tests" },

  networks: {
    hardhat: {
      // fork ETH mainnet at block 17038902
      forking: {
        url: process.env.ETH_MAINNET_URL || "",
        blockNumber: BLOCK_NUMBER,
      },
    },
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COIN_MARKET_CAP_API_KEY || "",
  },

  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
