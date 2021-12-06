import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
import deployErc20Contract from "./scripts/SampleERC20";
import { BDLockingContract } from "../typechain";

// Override default Mocha context so we could have type safe on everything we set on the `this` context
declare module "mocha" {
  export interface Context {
    erc20Contract: Contract;
    lockingContract: BDLockingContract;
    beneficiariesAddresses: string[];
    owner: SignerWithAddress;
    treasury: SignerWithAddress;
    firstBeneficiary: SignerWithAddress;
    secondBeneficiary: SignerWithAddress;
    thirdBeneficiary: SignerWithAddress;
    startTimestamp: number;
  }
}

const { expect } = chai;

chai.use(chaiAsPromised);
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
  before(async function () {
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
  const erc20TotalSupply: number = 98394797;
  const percisionOffset: number = 150;

  beforeEach(async function () {
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
      expect(await this.lockingContract.fundingAddress()).to.equal(this.treasury.address);
      expect(await this.lockingContract.start()).to.equal(this.startTimestamp);
      expect(await this.lockingContract.lockingDuration()).to.equal(durationSeconds);
      expect(await this.lockingContract.cliffDuration()).to.equal(cliffDurationSeconds);
    });

    it("should fail to deploy when one of the beneficiaries is zero address", function () {
      expect(
        this.BDLockingContract.deploy(
          [...this.beneficiariesAddresses, ethers.constants.AddressZero],
          this.treasury.address,
          this.startTimestamp,
          durationSeconds,
          cliffDurationSeconds
        )
      ).to.be.rejectedWith(/BDLockingContract: A beneficiary is zero address/);
    });

    it("should fail to deploy when the list of beneficiaries is empty", function () {
      expect(this.BDLockingContract.deploy([], this.treasury.address, this.startTimestamp, durationSeconds, cliffDurationSeconds)).to.be.rejectedWith(
        /BDLockingContract: You must have at least one beneficiary/
      );
    });

    it("should fail to deploy when cliff is greater than duration", function () {
      const cliffDuration = durationSeconds + 100;
      expect(
        this.BDLockingContract.deploy(this.beneficiariesAddresses, this.treasury.address, this.startTimestamp, durationSeconds, cliffDuration)
      ).to.be.rejectedWith(/BDLockingContract: The duration of the cliff period must end before the entire lockup period/);
    });
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
      const releaseTx = await this.lockingContract.connect(this.thirdBeneficiary).release(this.erc20Contract.address);
      expect(releaseTx).to.emit(this.lockingContract, "ERC20ZeroReleased").withArgs(this.erc20Contract.address);

      expect(await this.lockingContract.released(this.erc20Contract.address)).to.equal(0);
    });

    it("should release tokens after the cliff period has ended", async function () {
      const releaseTimestamp = (await getCurrentTimestamp()) + cliffDurationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      const releaseTx = await this.lockingContract.connect(this.secondBeneficiary).release(this.erc20Contract.address);

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

      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.firstBeneficiary.address, firstBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.secondBeneficiary.address, secondBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.thirdBeneficiary.address, thirdBeneficiaryBalance);
    });

    it("should be able to release tokens multiple times", async function () {
      // First release
      let releaseTimestamp = (await getCurrentTimestamp()) + cliffDurationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      let releaseTx = await this.lockingContract.connect(this.secondBeneficiary).release(this.erc20Contract.address);

      let expectedFreed = calcExpectedFreed(erc20TotalSupply, releaseTimestamp, this.startTimestamp, durationSeconds);
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

      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.firstBeneficiary.address, firstBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.secondBeneficiary.address, secondBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.thirdBeneficiary.address, thirdBeneficiaryBalance);

      // Second release
      releaseTimestamp += (this.startTimestamp + durationSeconds - releaseTimestamp) / 2;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);

      releaseTx = await this.lockingContract.connect(this.secondBeneficiary).release(this.erc20Contract.address);

      expectedFreed = calcExpectedFreed(erc20TotalSupply, releaseTimestamp, this.startTimestamp, durationSeconds);
      rangeBottom = expectedFreed - percisionOffset;
      rangeTop = expectedFreed + percisionOffset;

      expect(await this.lockingContract.released(this.erc20Contract.address)).to.be.within(rangeBottom, rangeTop);

      rangeBottom = Math.floor(rangeBottom / this.beneficiariesAddresses.length);
      rangeTop = Math.floor(rangeTop / this.beneficiariesAddresses.length);
      const firstBeneficiarySecondReleaseBalance = await this.erc20Contract.balanceOf(this.firstBeneficiary.address);
      const secondBeneficiarySecondReleaseBalance = await this.erc20Contract.balanceOf(this.secondBeneficiary.address);
      const thirdBeneficiarySecondReleaseBalance = await this.erc20Contract.balanceOf(this.thirdBeneficiary.address);

      expect(firstBeneficiarySecondReleaseBalance).to.be.within(rangeBottom, rangeTop);
      expect(secondBeneficiarySecondReleaseBalance).to.be.within(rangeBottom, rangeTop);
      expect(thirdBeneficiarySecondReleaseBalance).to.be.within(rangeBottom, rangeTop);

      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.firstBeneficiary.address, secondBeneficiarySecondReleaseBalance - firstBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.secondBeneficiary.address, secondBeneficiarySecondReleaseBalance - secondBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.thirdBeneficiary.address, thirdBeneficiarySecondReleaseBalance - thirdBeneficiaryBalance);
    });

    it("should release almost all tokens after the locking duration has ended - at most leave behind tokens like the number of beneficiaries", async function () {
      const releaseTimestamp = this.startTimestamp + durationSeconds;
      await ethers.provider.send("evm_mine", [releaseTimestamp]);
      const releaseTx = await this.lockingContract.connect(this.firstBeneficiary).release(this.erc20Contract.address);

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

      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.firstBeneficiary.address, firstBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.secondBeneficiary.address, secondBeneficiaryBalance);
      expect(releaseTx)
        .to.emit(this.lockingContract, "ERC20Released")
        .withArgs(this.erc20Contract.address, this.thirdBeneficiary.address, thirdBeneficiaryBalance);
    });

    it("should only allow a beneficiary to call the release function - not even the owner", function () {
      expect(this.lockingContract.connect(this.owner).release(this.erc20Contract.address)).to.be.rejectedWith(
        /BDLockingContract: You are not one of the allowed beneficiaries, you cannot execute this function/
      );
    });
  });

  describe("Withdraw locked funds", function () {
    it("should only allow an owner to withdraw funds", function () {
      expect(this.lockingContract.connect(this.firstBeneficiary).withdrawLockedERC20(this.erc20Contract.address, 100)).to.be.rejectedWith(
        /Ownable: caller is not the owner/
      );
    });

    it("should make sure basis points is greater than 0", function () {
      expect(this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, 0)).to.be.rejectedWith(
        /BDLockingContract: The percentage of the withdrawal must be between 1 to 10,000 basis points/
      );
    });

    it("should make sure basis points is lower than 10000", function () {
      expect(this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, 10001)).to.be.rejectedWith(
        /BDLockingContract: The percentage of the withdrawal must be between 1 to 10,000 basis points/
      );
    });

    it("should be able to withdraw 10.7% of the locked tokens", async function () {
      const tokensAvilableForWithdrawl =
        erc20TotalSupply - (await this.lockingContract.freedAmount(this.erc20Contract.address, await getCurrentTimestamp())).toNumber();
      const withdrawalBasisPoints = 1070;

      expect(await this.erc20Contract.connect(this.treasury).balanceOf(this.erc20Contract.address)).to.equal(0);

      const withdrawTx = await this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, withdrawalBasisPoints);
      const expectedTreasuryBalance = Math.floor(tokensAvilableForWithdrawl * (withdrawalBasisPoints / 10000));
      const rangeBottom = expectedTreasuryBalance - percisionOffset;
      const rangeTop = expectedTreasuryBalance + percisionOffset;

      const withdrawalAmount = await this.erc20Contract.balanceOf(this.treasury.address);
      expect(withdrawalAmount).to.be.within(rangeBottom, rangeTop);

      expect(withdrawTx)
        .to.emit(this.lockingContract, "ERC20Withdrawal")
        .withArgs(this.erc20Contract.address, this.treasury.address, withdrawalAmount);
    });

    it("should be able to withdraw and then release", async function () {
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

    it("should withdraw no tokens after all tokens are unlocked", async function () {
      const releaseAllTimestamp = this.startTimestamp + durationSeconds;
      await ethers.provider.send("evm_mine", [releaseAllTimestamp]);
      const withdrawTx = await this.lockingContract.connect(this.owner).withdrawLockedERC20(this.erc20Contract.address, 10);
      expect(await this.lockingContract.released(this.erc20Contract.address)).to.be.equal(0);
      expect(withdrawTx).to.emit(this.lockingContract, "ERC20ZeroWithdrawal").withArgs(this.erc20Contract.address, this.treasury.address);
    });
  });
});
