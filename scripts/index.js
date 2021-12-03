const moment = require("moment");
const { ethers } = require("hardhat");
const { deployErc20Contract } = require("./erc20");

async function deployDBLockingContract(
  beneficiariesAddresses,
  fundingAddress,
  startTimestamp,
  durationSeconds,
  cliffDurationSeconds
) {
  const factory = await ethers.getContractFactory("BDLockingContract");
  const contract = await factory.deploy(
    beneficiariesAddresses,
    fundingAddress,
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
  const [owner, treasury, addr1, addr2] = await ethers.getSigners();
  console.log("===============");
  console.log(addr1.address);
  console.log("===============");
  const beneficiariesAddresses = [addr1.address, addr2.address];
  // [
  //   await signer.getAddress(),
  //   "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  // ];
  const startMoment = moment();
  const startTimestamp = Math.ceil(Date.now() / 1000);
  // const startTimestamp = Math.ceil(new Date().setFullYear(new Date().getFullYear() + 2) / 1000); // Test start not within 1 year
  // const durationSeconds = 60 * 60 * 24 * 365 * 2 + 1; // Test duration less than 2 years
  const durationSeconds = 900;
  const cliffDurationSeconds = 500;
  // const cliffDurationSeconds = durationSeconds + 1; // Test cliff larger than duration

  const erc20 = await deployErc20Contract(signer, erc20TotalSupply);
  const locking = await deployDBLockingContract(
    beneficiariesAddresses,
    erc20.address,
    startTimestamp,
    durationSeconds,
    cliffDurationSeconds
  );

  const transferAmount = erc20TotalSupply;
  await erc20.transfer(treasury.address, transferAmount);
  await erc20.connect(treasury).transfer(locking.address, transferAmount);

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
  console.log("=========================");

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
  console.log("=========================");

  // TODO: Tests to add - release
  // Only one of the beneficiaries can call it - first one
  // Only one of the beneficiaries can call it - middle one
  // Only one of the beneficiaries can call it - last one
  // Someone who is not a beneficiar call it - should fail
  // When the number of tokens ends, it doesn't fail and just give someone the extra token

  // TODO: Tests to add - withdrawLockedTokens
  // Can only be called by the owner of the contract
  // When cliff didn't end
  // When cliff ended but not all the tokens were released
  // When the cliff ended and also the duration ended
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
