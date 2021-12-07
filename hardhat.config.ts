import { HardhatUserConfig } from "hardhat/config";
import "hardhat-deploy";
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
  networks: {
    rsktestnet: {
      url: "https://public-node.testnet.rsk.co",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.TREASURY_PRIVATE_KEY!,
        process.env.USER1_PRIVATE_KEY!,
        process.env.USER2_PRIVATE_KEY!,
        process.env.USER3_PRIVATE_KEY!,
      ],
      timeout: 6_000_000,
      gasPrice: 79240000,
    },
  },
  namedAccounts: {
    DEPLOYER: 0,
    TREASURY: 1,
    USER1: 2,
    USER2: 3,
    USER3: 4,
  },
};

export default config;
