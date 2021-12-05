import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
import deployErc20Contract from "../scripts/erc20";
const { expect } = chai;
import { SampleERC20, BDLockingContract } from "../typechain";

chai.use(solidity);

function calcExpectedFreed(totalAllocation: number, allocationTimestamp: number, startTimestamp: number, durationSeconds: number): number {
  const timePassed: number = Math.max(allocationTimestamp - startTimestamp, 0);
  if (timePassed >= durationSeconds) {
    return totalAllocation;
  } else {
    return Math.floor(totalAllocation * (timePassed / durationSeconds));
  }
}

async function getCurrentTimestamp(): Promise<number> {
  const blockNumber: number = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(blockNumber);
  return currentBlock.timestamp;
}

describe("BDLockingContract", function () {
  before(async function (this: any) {
    this.BDLockingContract = await ethers.getContractFactory("BDLockingContract");
    const [owner, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary] = await ethers.getSigners();
    this.beneficiariesAddresses = [firstBeneficiary.address, secondBeneficiary.address, thirdBeneficiary.address];
    this.owner = owner;
    this.treasury = treasury;
    this.firstBeneficiary = firstBeneficiary;
    this.secondBeneficiary = secondBeneficiary;
    this.thirdBeneficiary = thirdBeneficiary;
  });

  const durationSeconds: number = 10 * 24 * 60 * 60; // 10 days
  const cliffDurationSeconds: number = 2 * 24 * 60 * 60; // 2 days
  const erc20TotalSupply: number = BigNumber.from(98394797).toNumber();
  const percisionOffset: number = 150;

  beforeEach(async function (this: any) {
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
    it("should initialize valid parameters on constructor", async function (this: any) {
      expect(await this.lockingContract.beneficiaries()).to.eql(this.beneficiariesAddresses);
      expect(await this.lockingContract.start()).to.equal(this.startTimestamp);
      expect(await this.lockingContract.lockingDuration()).to.equal(durationSeconds);
      expect(await this.lockingContract.cliffDuration()).to.equal(cliffDurationSeconds);
    });

    // TODO: Constractor tests
    // Some Beneficiary in the list is zero address
    // The list of Beneficiaries is empty
    // Test cliff larger than duration
  });

  describe("Locking schedule", function () {
    it("should not free any tokens until the cliff period has ended", async function (this: any) {
      const unlockAllTimestamp = this.startTimestamp + cliffDurationSeconds - 1;
      expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp)).to.equal(0);
    });

    it("should free tokens after the cliff period has ended", async function (this: any) {
      const unlockAllTimestamp = this.startTimestamp + cliffDurationSeconds + 1;
      const expectedFreedTokens = calcExpectedFreed(erc20TotalSupply, unlockAllTimestamp, this.startTimestamp, durationSeconds);
      expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp)).to.equal(expectedFreedTokens);
    });

    it("should mark all tokens as freed after the locking duration time has passed", async function (this: any) {
      const unlockAllTimestamp = this.startTimestamp + durationSeconds + 1;
      expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp)).to.equal(erc20TotalSupply);
    });
  });

  describe("Releasing funds", function () {
    it("should not release any tokens before the cliff period ends", async function (this: any) {
      const releaseTimestamp = this.startTimestamp + cliffDurationSeconds / 2;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      expect(await this.lockingContract.released(this.erc20Contract.address)).to.equal(0);
    });

    it("should release tokens after the cliff period has ended", async function (this: any) {
      const releaseTimestamp = (await getCurrentTimestamp()) + cliffDurationSeconds;
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

    it("should be able to release tokens multiple times", async function (this: any) {
      // First release
      let releaseTimestamp = (await getCurrentTimestamp()) + cliffDurationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      await this.lockingContract.connect(this.secondBeneficiary).release(this.erc20Contract.address);

      let expectedFreed = calcExpectedFreed(erc20TotalSupply, releaseTimestamp, this.startTimestamp, durationSeconds);
      let rangeBottom = expectedFreed - percisionOffset;
      let rangeTop = expectedFreed + percisionOffset;

      expect(await this.lockingContract.released(this.erc20Contract.address)).to.be.within(rangeBottom, rangeTop);

      rangeBottom = Math.floor(rangeBottom / this.beneficiariesAddresses.length);
      rangeTop = Math.floor(rangeTop / this.beneficiariesAddresses.length);
      let firstBeneficiaryBalance = await this.erc20Contract.balanceOf(this.firstBeneficiary.address);
      let secondBeneficiaryBalance = await this.erc20Contract.balanceOf(this.secondBeneficiary.address);
      let thirdBeneficiaryBalance = await this.erc20Contract.balanceOf(this.thirdBeneficiary.address);

      expect(firstBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(secondBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(thirdBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);

      // Second release
      releaseTimestamp += (this.startTimestamp + durationSeconds - releaseTimestamp) / 2;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);

      await this.lockingContract.connect(this.secondBeneficiary).release(this.erc20Contract.address);

      expectedFreed = calcExpectedFreed(erc20TotalSupply, releaseTimestamp, this.startTimestamp, durationSeconds);
      rangeBottom = expectedFreed - percisionOffset;
      rangeTop = expectedFreed + percisionOffset;

      expect(await this.lockingContract.released(this.erc20Contract.address)).to.be.within(rangeBottom, rangeTop);

      rangeBottom = Math.floor(rangeBottom / this.beneficiariesAddresses.length);
      rangeTop = Math.floor(rangeTop / this.beneficiariesAddresses.length);
      firstBeneficiaryBalance = await this.erc20Contract.balanceOf(this.firstBeneficiary.address);
      secondBeneficiaryBalance = await this.erc20Contract.balanceOf(this.secondBeneficiary.address);
      thirdBeneficiaryBalance = await this.erc20Contract.balanceOf(this.thirdBeneficiary.address);

      expect(firstBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(secondBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
      expect(thirdBeneficiaryBalance).to.be.within(rangeBottom, rangeTop);
    });

    it("should release almost all tokens after the locking duration has ended - at most leave behind tokens like the number of beneficiaries", async function (this: any) {
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

    it("should be able to withdraw 10.7% of the locked tokens", async function (this: any) {
      const tokensAvilableForWithdrawl =
        erc20TotalSupply - (await this.lockingContract.freedAmount(this.erc20Contract.address, await getCurrentTimestamp()));
      const withdrawalBasisPoints = 1070;

      expect(await this.erc20Contract.connect(this.treasury).balanceOf(this.erc20Contract.address)).to.equal(0);

      await this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, withdrawalBasisPoints);
      const expectedTreasuryBalance = Math.floor(tokensAvilableForWithdrawl * (withdrawalBasisPoints / 10000));
      const rangeBottom = expectedTreasuryBalance - percisionOffset;
      const rangeTop = expectedTreasuryBalance + percisionOffset;

      expect(await this.erc20Contract.balanceOf(this.treasury.address)).to.be.within(rangeBottom, rangeTop);
    });

    it("should be able to withdraw and then release", async function (this: any) {
      const withdrawalBasisPoints = 9500;
      await this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, withdrawalBasisPoints);

      // Release after duration's end - should remain about (10,000 - withdrawalBasisPoints) of the tokens minus the number of beneficiaries
      const releaseTimestamp = this.startTimestamp + durationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      await this.lockingContract.connect(this.firstBeneficiary).release(this.erc20Contract.address);

      let rangeBottom: number = Math.floor(erc20TotalSupply * (1 - withdrawalBasisPoints / 10000) - this.beneficiariesAddresses.length);
      let rangeTop: number = Math.floor(erc20TotalSupply * (1 - withdrawalBasisPoints / 10000));

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
    // Test for - ERC20Withdrawal
    // Test for - ERC20ZeroWithdrawal
  });
});
