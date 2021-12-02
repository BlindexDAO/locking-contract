// scripts/deploy.js
async function main() {
  // We get the contract to deploy
  const BDVestingContract = await ethers.getContractFactory(
    "BDVestingContract"
  );
  console.log("Deploying BDVestingContract...");
  const vesting = await BDVestingContract.deploy();
  await vesting.deployed();
  console.log("BDVestingContract deployed to:", vesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
