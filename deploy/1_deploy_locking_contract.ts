import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import moment from "moment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("Deploy BDLockingContract...");
  const [deployer, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary] = await hre.ethers.getSigners();

  const startTimestamp = moment().unix();
  const duration = moment.duration(2, 'years').asSeconds();
  const cliffSeconds = moment.duration(1, 'year').asSeconds();

  const BDLockingContract = await hre.ethers.getContractFactory("BDLockingContract");
  const lockingContract = await BDLockingContract.connect(deployer).deploy(
    [firstBeneficiary.address, secondBeneficiary.address, thirdBeneficiary.address],
    treasury.address,
    startTimestamp,
    duration,
    cliffSeconds
  );
  await lockingContract.deployed();

  console.log("BDLockingContract deployed to:", lockingContract.address);

  return true;
};
func.id = __filename;
func.tags = ["BDLockingContract"];
export default func;
