const { ethers } = require("hardhat");

async function deployErc20Contract(totalSupply, name = "Sample Token", symbol = "SMPL") {
  const factory = await ethers.getContractFactory("SampleERC20");
  const erc20Contract = await factory.deploy(name, symbol, totalSupply);
  await erc20Contract.deployTransaction.wait();
  return erc20Contract;
}

module.exports = {
  deployErc20Contract,
};
