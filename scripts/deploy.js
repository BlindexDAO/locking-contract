// scripts/deploy.js
async function main() {
  // We get the contract to deploy
  const BDLockingContract = await ethers.getContractFactory("BDLockingContract");
  console.log("Deploying BDLockingContract...");
  const locking = await BDLockingContract.deploy();
  await locking.deployed();
  console.log("BDLockingContract deployed to:", locking.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
