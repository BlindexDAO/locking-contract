import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import moment from "moment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary } = await getNamedAccounts();

  const startTimestamp = moment().add(1, "minute").unix();
  const duration = 60 * 60;
  const cliffSeconds = 60;

  await deploy("BDLockingContract", {
    from: deployer,
    args: [[firstBeneficiary, secondBeneficiary, thirdBeneficiary], treasury, startTimestamp, duration, cliffSeconds],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
};
export default func;
func.tags = ["BDLockingContract"];
