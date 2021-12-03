const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { deployErc20Contract } = require("../scripts/erc20");
const { expect } = chai;

chai.use(solidity);

describe("BDLockingContract", function () {
  before(async function () {
    this.BDLockingContract = await ethers.getContractFactory("BDLockingContract");

    const [owner, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary] = await ethers.getSigners();
    this.walletsAddresses = [firstBeneficiary.address, secondBeneficiary.address, thirdBeneficiary.address];
    this.owner = owner;
    this.treasury = treasury;
  });

  const startTimestamp = Math.ceil(Date.now() / 1000);
  const lockingDurationSeconds = 900;
  const cliffDurationSeconds = 500;
  const totalSupply = 1000000;

  beforeEach(async function () {
    this.lockingContract = await this.BDLockingContract.deploy(
      this.walletsAddresses,
      this.treasury.address,
      startTimestamp,
      lockingDurationSeconds,
      cliffDurationSeconds
    );
    await this.lockingContract.deployed();
    this.erc20Contract = await deployErc20Contract(totalSupply);
  });

  it("should initialize valid parameters on constructor", async function () {
    expect(await this.lockingContract.beneficiaries()).to.eql(this.walletsAddresses);
    expect(await this.lockingContract.start()).to.equal(startTimestamp);
    expect(await this.lockingContract.lockingDuration()).to.equal(lockingDurationSeconds);
    expect(await this.lockingContract.cliffDuration()).to.equal(cliffDurationSeconds);
  });

  it("should transfer ERC20 tokens to locking contract", async function () {
    let lockingContractBalance = await this.erc20Contract.balanceOf(this.lockingContract.address);
    expect(lockingContractBalance).to.equal(0);

    const amount = 150000;
    await this.erc20Contract.transfer(this.lockingContract.address, amount);
    lockingContractBalance = await this.erc20Contract.balanceOf(this.lockingContract.address);
    expect(lockingContractBalance).to.equal(amount);
  });

  it("should release no tokens before cliff", async function () {
    const released = await this.lockingContract.released(this.erc20Contract.address);
    expect(released.toNumber()).to.equal(0);
  });

  it("should transfer free all deposit tokens when duartion from start is over", async function () {
    const totalLockAmount = 150000;
    await this.erc20Contract.transfer(this.lockingContract.address, totalLockAmount);
    const unlockAllTimestamp = startTimestamp + lockingDurationSeconds;
    expect(await this.lockingContract.freedAmount(this.erc20Contract.address, unlockAllTimestamp + 1)).to.equal(totalLockAmount);
  });
});
