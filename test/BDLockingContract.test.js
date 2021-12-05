const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { ethers } = require("hardhat");
const { deployErc20Contract } = require("../scripts/erc20");
const { expect } = chai;
const { BigNumber } = ethers;

chai.use(solidity);

function calcExpectedFreed(totalAllocation, allocationTimestamp, startTimestamp, durationSeconds) {
  const timePassed = Math.max(allocationTimestamp - startTimestamp, 0);
  if (timePassed >= durationSeconds) {
    return totalAllocation;
  } else {
    return Math.floor(totalAllocation * (timePassed / durationSeconds));
  }
}

async function getCurrentTimestamp() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(blockNumber);
  return currentBlock.timestamp;
}

describe("BDLockingContract", function () {
  before(async function () {
    this.BDLockingContract = await ethers.getContractFactory("BDLockingContract");
  });

  durationSeconds = 10 * 24 * 60 * 60; // 10 days
  cliffDurationSeconds = 2 * 24 * 60 * 60; // 2 days
  erc20TotalSupply = BigNumber.from(98394797);
  percisionOffset = 150;

  beforeEach(async function () {
    // We must reset the account before every test so that their balances will be erased each time
    const [owner, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary] = await ethers.getSigners();
    this.beneficiariesAddresses = [firstBeneficiary.address, secondBeneficiary.address, thirdBeneficiary.address];
    this.owner = owner;
    this.treasury = treasury;
    this.firstBeneficiary = firstBeneficiary;
    this.secondBeneficiary = secondBeneficiary;
    this.thirdBeneficiary = thirdBeneficiary;
    this.startTimestamp = await getCurrentTimestamp();

    this.lockingContract = await this.BDLockingContract.deploy(
      this.beneficiariesAddresses,
      this.treasury.address,
      this.startTimestamp,
      durationSeconds,
      cliffDurationSeconds
    );
    await this.lockingContract.deployed();
    this.erc20Contract = await deployErc20Contract(erc20TotalSupply);

    // Mimic real world behavior where a certain treasury holds the funds and not the ERC20 contract itself
    await this.erc20Contract.transfer(this.treasury.address, erc20TotalSupply);
    await this.erc20Contract.connect(this.treasury).transfer(this.lockingContract.address, erc20TotalSupply);
  });

  describe("Initialization", function () {
    it("should initialize valid parameters on constructor", async function () {
      expect(await this.lockingContract.beneficiaries()).to.eql(this.beneficiariesAddresses);
      expect(await this.lockingContract.start()).to.equal(this.startTimestamp);
      expect(await this.lockingContract.lockingDuration()).to.equal(durationSeconds);
      expect(await this.lockingContract.cliffDuration()).to.equal(cliffDurationSeconds);
    });

    // TODO: Constractor tests
    // Some Beneficiary in the list is zero address
    // The list of Beneficiaries is empty
    // const cliffDurationSeconds = durationSeconds + 1; // Test cliff larger than duration
  });

  describe("Locking schedule", function () {
    it("should not free any tokens until the cliff period has ended", async function () {
      const unlockAllTimestamp = this.startTimestamp + cliffDurationSeconds - 1;
      expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp)).to.equal(0);
    });

    it("should free tokens after the cliff period has ended", async function () {
      const unlockAllTimestamp = this.startTimestamp + cliffDurationSeconds + 1;
      const expectedFreedTokens = calcExpectedFreed(erc20TotalSupply, unlockAllTimestamp, this.startTimestamp, durationSeconds);
      expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp)).to.equal(expectedFreedTokens);
    });

    it("should mark all tokens as freed after the locking duration time has passed", async function () {
      const unlockAllTimestamp = this.startTimestamp + durationSeconds + 1;
      expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp)).to.equal(erc20TotalSupply);
    });
  });

  describe("Releasing funds", function () {
    it("should not release any tokens before the cliff period ends", async function () {
      const releaseTimestamp = this.startTimestamp + cliffDurationSeconds / 2;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      expect(await this.lockingContract.released(this.erc20Contract.address)).to.equal(0);
    });

    it("should release tokens after the cliff period has ended", async function () {
      const currentTimestamp = await getCurrentTimestamp();
      const releaseTimestamp = currentTimestamp + cliffDurationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      await this.lockingContract.connect(this.secondBeneficiary).release(this.erc20Contract.address);

      const expectedFreed = calcExpectedFreed(erc20TotalSupply, releaseTimestamp, this.startTimestamp, durationSeconds);
      let rangeBottom = expectedFreed - percisionOffset;
      let rangeTop = expectedFreed + percisionOffset;

      expect(await this.lockingContract.released(this.erc20Contract.address)).to.be.within(rangeBottom, rangeTop);

      rangeBottom = Math.floor(rangeBottom / this.beneficiariesAddresses.length);
      rangeTop = Math.floor(rangeTop / this.beneficiariesAddresses.length);
      const firstBeneficiaryBalance = await this.erc20Contract.balanceOf(this.firstBeneficiary.address);
      const secondBeneficiaryBalance = await this.erc20Contract.balanceOf(this.secondBeneficiary.address);
      const thirdBeneficiaryBalance = await this.erc20Contract.balanceOf(this.thirdBeneficiary.address);

      expect(firstBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(secondBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(thirdBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
    });

    it("should release almost all tokens after the locking duration has ended - at most leave behind tokens like the number of beneficiaries", async function () {
      const releaseTimestamp = this.startTimestamp + durationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      await this.lockingContract.connect(this.firstBeneficiary).release(this.erc20Contract.address);

      let rangeBottom = erc20TotalSupply - this.beneficiariesAddresses.length;
      let rangeTop = erc20TotalSupply;

      expect(await this.lockingContract.released(this.erc20Contract.address)).to.be.within(rangeBottom, rangeTop);

      rangeBottom = Math.floor(rangeBottom / this.beneficiariesAddresses.length);
      rangeTop = Math.floor(rangeTop / this.beneficiariesAddresses.length);
      const firstBeneficiaryBalance = await this.erc20Contract.balanceOf(this.firstBeneficiary.address);
      const secondBeneficiaryBalance = await this.erc20Contract.balanceOf(this.secondBeneficiary.address);
      const thirdBeneficiaryBalance = await this.erc20Contract.balanceOf(this.thirdBeneficiary.address);

      expect(firstBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(secondBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(thirdBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
    });

    // TODO: Events
    // Test for - ERC20Released
    // Test for - ERC20ZeroReleased

    // TODO: Not working for some reason. We get twice the error
    // it("should only allow a beneficiary to call the release function - not even the owner", async function () {
    //   expect(async () => {
    //     await this.lockingContract.connect(this.owner).release(this.erc20Contract.address);
    //   }).to.throw();
    // });
  });

  describe("Withdraw locked funds", function () {
    // TODO: Not working for some reason. We get twice the error
    // it("should only allow an owner to withdraw funds", async function () {
    //   expect(async () => {
    //     await this.lockingContract.connect(this.firstBeneficiary).withdrawLockedERC20(this.erc20Contract.address, 100);
    //   }).to.throw();
    // });

    // TODO: Not working for some reason. We get twice the error
    // it("should make sure basis points is between 0 and 10,000", async function () {
    //   expect(async () => {
    //     await this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, 10001);
    //   }).to.throw();
    // });

    it("should be able to withdraw 10.7% of the locked tokens", async function () {
      const tokensAvilableForWithdrawl =
        erc20TotalSupply - (await this.lockingContract.freedAmount(this.erc20Contract.address, await getCurrentTimestamp()));
      const withdrawalBasisPPoints = 1070;

      expect(await this.erc20Contract.connect(this.treasury).balanceOf(this.erc20Contract.address)).to.equal(0);

      await this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, withdrawalBasisPPoints);
      const expectedTreasuryBalance = Math.floor(tokensAvilableForWithdrawl * (withdrawalBasisPPoints / 10000));
      const rangeBottom = expectedTreasuryBalance - percisionOffset;
      const rangeTop = expectedTreasuryBalance + percisionOffset;

      expect(await this.erc20Contract.balanceOf(this.treasury.address)).to.be.within(rangeBottom, rangeTop);
    });

    // TODO: Events
    // Test for - ERC20Withdrawal
    // Test for - ERC20ZeroWithdrawal
  });
});
