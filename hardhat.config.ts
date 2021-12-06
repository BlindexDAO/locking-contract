import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "hardhat-gas-reporter";

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
    coinmarketcap: "1c47a521-d1cc-40a2-a436-054eda43d849",
  },
};

export default config;
