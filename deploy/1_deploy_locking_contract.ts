import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import moment from "moment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("Deploy BDLockingContract...");
  const [deployer] = await hre.ethers.getSigners();

  const startTimestamp = moment().unix();
  const durationSeconds = moment.duration(2, "years").asSeconds();
  const cliffSeconds = moment.duration(1, "year").asSeconds();
  const beneficiaries = [
    "0xd7ED3F0ff6823e000e08E79C340697545c5925a3",
    "0xb34B2168D5D869F18A4Fd63eC11287F72c302251",
    "0x1a99B0B8E5b4c02bB3C682355288c3d7DAEA227B"
  ];

  const multisigTreasury = process.env.TREASURY_ADDRESS;
  console.log("Treasury multisig address:", multisigTreasury);
  if (!multisigTreasury) {
    throw new Error("no multisigTreasury");
  }

  console.log("Deploying...");
  const deployedLockingContract = await hre.deployments.deploy("BDLockingContract", {
    from: deployer.address,
    contract: "BDLockingContract",
    args: [beneficiaries, multisigTreasury, startTimestamp, durationSeconds, cliffSeconds]
  });

  console.log("BDLockingContract deployed to:", deployedLockingContract.address);
  return true;
};
func.id = __filename;
func.tags = ["BDLockingContract"];
export default func;
