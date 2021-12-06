import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "hardhat-gas-reporter";
import dotenv from "dotenv";
import path from "path";

const envPath = path.join(__dirname, "./.env");
dotenv.config({ path: envPath });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
    externalArtifacts: [],
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: process.env.CMC_TOKEN,
  },
};

export default config;
