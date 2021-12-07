const BDLockingContractAddress = "0xeb8eb3AFe11c125C92189f269F3F81B5ef22D2C6";

import { ethers } from "hardhat";
// const { deployErc20Contract } = require("./erc20");
// const { BigNumber } = ethers;

// function calcExpectedFreed(totalAllocation, allocationTimestamp, startTimestamp, durationSeconds) {
//   const timePassed = allocationTimestamp - startTimestamp;
//   if (timePassed >= durationSeconds) {
//     return totalAllocation;
//   } else {
//     return Math.floor(totalAllocation * (timePassed / durationSeconds));
//   }
// }

async function getCurrentTimestamp() {
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("blockNumber", blockNumber);
  const currentBlock = await ethers.provider.getBlock(blockNumber);
  return currentBlock.timestamp;
}

async function main() {
  const timestamp = await getCurrentTimestamp();
  console.log("timestamp", timestamp);

  const [deployer, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary, anotherOne] = await ethers.getSigners();
  console.log("deployer.address", deployer.address);
  console.log("anotherOne", anotherOne.address);
}

// async function main() {
//   const erc20TotalSupply = BigNumber.from(98394797);
//   const [owner, treasury, firstBeneficiary, secondBeneficiary] = await ethers.getSigners();
//   const beneficiariesAddresses = [firstBeneficiary.address, secondBeneficiary.address];

//   const startTimestamp = await getCurrentTimestamp();
//   const lockingDurationSeconds = 10 * 24 * 60 * 60; // 10 days
//   const cliffDurationSeconds = 2 * 24 * 60 * 60; // 2 days

//   const erc20 = await deployErc20Contract(erc20TotalSupply);
//   const locking = await deployDBLockingContract(
//     beneficiariesAddresses,
//     treasury.address,
//     startTimestamp,
//     lockingDurationSeconds,
//     cliffDurationSeconds
//   );

//   const transferAmount = erc20TotalSupply;
//   await erc20.transfer(treasury.address, transferAmount);
//   await erc20.connect(treasury).transfer(locking.address, transferAmount);

//   let allocationTimestamp = startTimestamp + 10;

//   console.log("expected start", startTimestamp);
//   console.log("actual start", (await locking.start()).toString());
//   console.log("============Duration=============");
//   console.log("expected durationSeconds", lockingDurationSeconds.toString());
//   console.log("actual duration", (await locking.lockingDuration()).toString());
//   console.log("============Cliff=============");
//   console.log("expected cliff", cliffDurationSeconds);
//   console.log("actual cliff", (await locking.cliffDuration()).toString());
//   console.log("============freedAmount - before cliff's end=============");

//   const expectedTotalAllocation = transferAmount;

//   console.log("totalAllocation", expectedTotalAllocation.toString());
//   console.log("timestamp - start()", allocationTimestamp - startTimestamp);
//   console.log("expected Freed", 0);

//   let freed = await locking.freedAmount(erc20.address, allocationTimestamp);
//   console.log("actual Freed", freed.toString());
//   console.log("===========freedAmount - after cliff's end==============");

//   allocationTimestamp += cliffDurationSeconds;

//   let expectedFreed = calcExpectedFreed(expectedTotalAllocation, allocationTimestamp, startTimestamp, lockingDurationSeconds);

//   console.log("timestamp - start()", allocationTimestamp - startTimestamp);
//   console.log("expected Freed", expectedFreed);

//   freed = await locking.freedAmount(erc20.address, allocationTimestamp);
//   console.log("actual Freed", freed.toString());
//   console.log("=============Release - before cliff ends============");

//   console.log("First Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("Second Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());

//   let currentTimestamp = await getCurrentTimestamp();
//   console.log("Current timestamp: ", currentTimestamp);
//   console.log("Increasing block timestamp on the network and releasing amount...");
//   let releaseTimestamp = currentTimestamp + 1 * 24 * 60 * 60; // Adds 1 days to the current timestamp
//   console.log("Release timestamp: ", releaseTimestamp);
//   await ethers.provider.send("evm_mine", [releaseTimestamp]);
//   await locking.connect(firstBeneficiary).release(erc20.address);

//   console.log("Expected released for each beneficiary (before floor): ", 0 / beneficiariesAddresses.length);
//   console.log("FIrst Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("Second Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("=============Release - after cliff ends============");

//   console.log("First Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("Second Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());

//   currentTimestamp = await getCurrentTimestamp();
//   console.log("Current timestamp: ", currentTimestamp);
//   console.log("Increasing block timestamp on the network and releasing amount...");
//   releaseTimestamp = currentTimestamp + cliffDurationSeconds;
//   console.log("Release timestamp: ", releaseTimestamp);
//   await ethers.provider.send("evm_mine", [releaseTimestamp]);
//   await locking.connect(secondBeneficiary).release(erc20.address);

//   expectedFreed = calcExpectedFreed(expectedTotalAllocation, releaseTimestamp, startTimestamp, lockingDurationSeconds);
//   console.log("Expected released for each beneficiary (before floor): ", expectedFreed / beneficiariesAddresses.length);
//   console.log("First Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("Second Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("=============Withdraw - non owner should fail============");
//   try {
//     await locking.connect(firstBeneficiary).withdrawLockedERC20(erc20.address, 100);
//     throw new Exception("Oops, for some reason a non owner address was able to call this function. Please check it out.");
//   } catch (e) {
//     console.log("GREAT!! Only the owner can call this fuction");
//   }
//   console.log("=============Withdraw - basis points validation============");
//   try {
//     await locking.connect(owner).withdrawLockedERC20(erc20.address, 10001);
//     throw new Exception("Oops, for some reason you were able to send an invalid basis points to the function. Please check it out.");
//   } catch (e) {
//     console.log("GREAT!! Basis points should be between 0 and 10,000");
//   }
//   console.log("=============Withdraw - 10.7%============");
//   const tokensAvilableForWithdrawl = expectedTotalAllocation - (await locking.freedAmount(erc20.address, await getCurrentTimestamp()));
//   console.log("Total tokens avilable for Withdrawal:", tokensAvilableForWithdrawl);
//   const withdrawalCostBasis = 1070;
//   const expectedTreasuryBalance = Math.floor(tokensAvilableForWithdrawl * (withdrawalCostBasis / 10000));

//   let treasuryBalance = await erc20.connect(treasury).balanceOf(erc20.address);
//   console.log("Treasury balance before the withdrawal:", treasuryBalance.toString());

//   await locking.connect(owner).withdrawLockedERC20(erc20.address, withdrawalCostBasis);

//   treasuryBalance = await erc20.balanceOf(treasury.address);
//   console.log("Expected treasury balance:", expectedTreasuryBalance);
//   console.log("Actual treasury balance:", treasuryBalance.toString());
//   console.log("=============Release - duration ends============");

//   console.log("First Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("Second Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());

//   currentTimestamp = await getCurrentTimestamp();
//   console.log("Current timestamp: ", currentTimestamp);
//   console.log("Increasing block timestamp on the network and releasing amount...");
//   releaseTimestamp = currentTimestamp + lockingDurationSeconds;
//   console.log("Release timestamp: ", releaseTimestamp);
//   await ethers.provider.send("evm_mine", [releaseTimestamp]);
//   await locking.connect(secondBeneficiary).release(erc20.address);

//   expectedFreed = calcExpectedFreed(expectedTotalAllocation, releaseTimestamp, startTimestamp, lockingDurationSeconds);
//   console.log("Expected released for each beneficiary (before floor): ", expectedFreed / beneficiariesAddresses.length);
//   console.log("First Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("Second Beneficiary amount: ", (await erc20.balanceOf(firstBeneficiary.address)).toString());
//   console.log("=============Non Beneficiary Trying to release============");
//   try {
//     await locking.connect(owner).release(erc20.address);
//     throw new Exception("YOU FAILED!! Non beneficiary SHOULD NOT be able to release the funds. Even not the owner of the contract");
//   } catch (e) {
//     console.log("GREAT!! Non beneficiary (the owner) tried to call the release function and you stopped it!");
//   }

//   // TODO: Tests to add - release
//   // When the number of tokens ends, it doesn't fail and just give someone the extra token

//   // TODO: Tests to add - withdrawLockedTokens
//   // Can only be called by the owner of the contract
//   // When cliff didn't end
//   // When cliff ended but not all the tokens were released
//   // When the cliff ended and also the duration ended

//   // TODO: Constractor tests
//   // Some Beneficiary in the list is zero address
//   // The list of Beneficiaries is empty
//   // const cliffDurationSeconds = durationSeconds + 1; // Test cliff larger than duration
// }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });