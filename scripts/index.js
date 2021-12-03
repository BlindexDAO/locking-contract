const moment = require("moment");
const { ethers } = require("hardhat");
const {deployErc20Contract} = require("./erc20")
const { formatEther } = ethers.utils;
const { abi, bytecode } = require("../artifacts/contracts/BDLockingContract.sol/BDLockingContract.json")

async function deployDBLockingContract(
  signer,
  beneficiaryAddress,
  startTimestamp,
  durationSeconds,
  cliffDurationSeconds
) {
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(
    beneficiaryAddress,
    startTimestamp,
    durationSeconds,
    cliffDurationSeconds
  );
  console.log("BDLockingContract deployed to:", contract.address);

  await contract.deployTransaction.wait();
  return contract;
}

function createSigner() {
  const url = "http://localhost:8545";
  const provider = new ethers.providers.JsonRpcProvider(url);
  const signer = provider.getSigner();
  return signer;
}

// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

async function main() {
  const signer = createSigner();

  const erc20TotalSupply = 100000;
  const beneficiaryAddress = await signer.getAddress();
  const startMoment = moment();
  const startTimestamp = Math.ceil(Date.now() / 1000);
  const durationSeconds = 900;
  const cliffDurationSeconds = 500;
  const [erc20, locking] = await Promise.all([
    deployErc20Contract(signer, erc20TotalSupply),
    deployDBLockingContract(
      signer,
      beneficiaryAddress,
      startTimestamp,
      durationSeconds,
      cliffDurationSeconds
    ),
  ]);

  const transferAmount = erc20TotalSupply;
  await erc20.transfer(locking.address, transferAmount);

  let allocationTimestamp = Math.ceil(
    startMoment.add(10, "s").toDate().getTime() / 1000
  );

  console.log("actual start", (await locking.start()).toString());
  console.log("expected durationSeconds", durationSeconds.toString());
  console.log("actual duration", (await locking.duration()).toString());
  console.log("expected cliff", cliffDurationSeconds);
  console.log("actual cliff", (await locking.cliffDuration()).toString());

  const expectedTotalAllocation = transferAmount;

  console.log("totalAllocation", expectedTotalAllocation);
  console.log("timestamp - start()", allocationTimestamp - startTimestamp);
  console.log("expected Freed", 0);

  let freed = await locking.freedAmount(erc20.address, allocationTimestamp);
  console.log("actual Freed", freed.toString());

  allocationTimestamp = Math.ceil(
    startMoment
      .add(cliffDurationSeconds + 10, "s")
      .toDate()
      .getTime() / 1000
  );
  const expectedFreed =
    (expectedTotalAllocation * (allocationTimestamp - startTimestamp)) /
    durationSeconds;

  console.log("timestamp - start()", allocationTimestamp - startTimestamp);
  console.log("expected Freed", expectedFreed);

  freed = await locking.freedAmount(erc20.address, allocationTimestamp);
  console.log("actual Freed", freed.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
