import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import moment from "moment";
import { ethers } from "ethers";
import BDXContract from "../abis/BDXContract";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("Deploy BDLockingContract...");
  const bdxContractAddress = process.env.BDX_CONTRACT_ADDRESS!; // Fill BDX contract address
  const [deployer, treasury] = await hre.ethers.getSigners(); // TODO: Set treasury and deployer before deployment to production

  const startTimestamp = moment().unix();
  const durationSeconds = moment.duration(2, "years").asSeconds();
  const cliffSeconds = moment.duration(1, "year").asSeconds();
  const beneficiaries: string[] = []; // TODO: Fill addresses

  const deployedLockingContract = await hre.deployments.deploy("BDLockingContract", {
    from: deployer.address,
    contract: "BDLockingContract",
    args: [beneficiaries, treasury.address, startTimestamp, durationSeconds, cliffSeconds],
  });

  console.log("BDLockingContract deployed to:", deployedLockingContract.address);

  // TODO: Should we run it here or by the blindex scripts?
  const bdxAmount = ethers.utils.parseEther("3150000"); // 21M tokens * 15%
  console.log(`Transfer ${bdxAmount} BDX tokens from the treasury to the locking contract.`);
  const bdx = await hre.ethers.getContractAt(BDXContract, bdxContractAddress);
  const tx = await bdx.connect(treasury).transfer(deployedLockingContract.address, bdxAmount);
  await tx.wait();

  return true;
};
func.id = __filename;
func.tags = ["BDLockingContract"];
export default func;
