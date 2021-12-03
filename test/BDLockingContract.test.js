const chai = require("chai");
const { solidity, MockProvider } = require("ethereum-waffle");
const { deployErc20Contract } = require("../scripts/erc20");
const { expect } = chai;

chai.use(solidity);

describe("BDLockingContract", function () {
  before(async function () {
    this.BDLockingContract = await ethers.getContractFactory(
      "BDLockingContract"
    );

    const provider = new MockProvider();
    this.signer = provider.getSigner();
    const [wallet] = provider.getWallets();
    this.walletAddress = wallet.address;
  });

  const startTimestamp = Math.ceil(Date.now() / 1000);
  const durationSeconds = 900;
  const cliffDurationSeconds = 500;
  const totalSupply = 1000000;

  beforeEach(async function () {
    this.lockingContract = await this.BDLockingContract.deploy(
      this.walletAddress,
      startTimestamp,
      durationSeconds,
      cliffDurationSeconds
    );
    await this.lockingContract.deployed();
    this.erc20Contract = await deployErc20Contract(this.signer, totalSupply);
  });

  it("should initialize valid parameters on constructor", async function () {
    expect(await this.lockingContract.start()).to.equal(startTimestamp);
    expect(await this.lockingContract.duration()).to.equal(durationSeconds);
    expect(await this.lockingContract.cliffDuration()).to.equal(
      cliffDurationSeconds
    );
  });

  it("should transfer ERC20 tokens to locking contract", async function () {
    let lockingContractBalance = await this.erc20Contract.balanceOf(
      this.lockingContract.address
    );
    expect(lockingContractBalance).to.equal(0);

    const amount = 150000;
    await this.erc20Contract.transfer(this.lockingContract.address, amount);
    lockingContractBalance = await this.erc20Contract.balanceOf(
      this.lockingContract.address
    );
    expect(lockingContractBalance).to.equal(amount);
  });

  xit("should transfer free all deposit tokens when duartion from start is over", async function () {
    const totalLockAmount = 150000;
    await this.erc20Contract.transfer(
      this.lockingContract.address,
      totalLockAmount
    );
    const unlockAllTimestamp = startTimestamp + durationSeconds;
    expect(
      await this.lockingContract.freedAmount(
        this.erc20Contract.address,
        unlockAllTimestamp + 1
      )
    ).to.equal(totalLockAmount);
  });
});
