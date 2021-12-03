const moment = require("moment");
const { ethers } = require("hardhat");
const { deployErc20Contract } = require("./erc20");

async function deployDBLockingContract(
  beneficiariesAddresses,
  startTimestamp,
  durationSeconds,
  cliffDurationSeconds
) {
  const factory = await ethers.getContractFactory("BDLockingContract");
  const contract = await factory.deploy(
    beneficiariesAddresses,
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

async function main() {
  const signer = createSigner();

  const erc20TotalSupply = 100000;
  const beneficiariesAddresses = await signer.getAddress();
  const startMoment = moment();
  const startTimestamp = Math.ceil(Date.now() / 1000);
  // const startTimestamp = Math.ceil(new Date().setFullYear(new Date().getFullYear() + 2) / 1000); // Test start not within 1 year
  // const durationSeconds = 60 * 60 * 24 * 365 * 2 + 1; // Test duration less than 2 years
  const durationSeconds = 900;
  const cliffDurationSeconds = 500;
  // const cliffDurationSeconds = durationSeconds + 1; // Test cliff larger than duration
  const [erc20, locking] = await Promise.all([
    deployErc20Contract(signer, erc20TotalSupply),
    deployDBLockingContract(
      [beneficiariesAddresses],
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

  console.log("expected start", startTimestamp);
  console.log("actual start", (await locking.start()).toString());
  console.log("=========================");
  console.log("expected durationSeconds", durationSeconds.toString());
  console.log("actual duration", (await locking.duration()).toString());
  console.log("=========================");
  console.log("expected cliff", cliffDurationSeconds);
  console.log("actual cliff", (await locking.cliffDuration()).toString());
  console.log("=========================");

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
