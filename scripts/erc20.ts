import { ethers } from "hardhat";
import { SampleERC20 } from "../typechain";

async function deployErc20Contract(totalSupply: number, name: string = "Sample Token", symbol: string = "SMPL") {
  const factory = await ethers.getContractFactory("SampleERC20");
  const erc20Contract = await factory.deploy(name, symbol, totalSupply);
  await erc20Contract.deployTransaction.wait();
  return erc20Contract;
}

export default deployErc20Contract;
