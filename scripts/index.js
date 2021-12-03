const moment = require("moment");
const { ethers } = require("hardhat");
const { formatEther } = ethers.utils;
const { abi, bytecode } = require("../artifacts/contracts/BDLockingContract.sol/BDLockingContract.json")

async function deployErc20Contract(signer, totalSupply) {
  const bytecode =
    "0x608060405234801561001057600080fd5b506040516103bc3803806103bc83398101604081905261002f9161007c565b60405181815233906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a333600090815260208190526040902055610094565b60006020828403121561008d578081fd5b5051919050565b610319806100a36000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c8063313ce5671461005157806370a082311461006557806395d89b411461009c578063a9059cbb146100c5575b600080fd5b604051601281526020015b60405180910390f35b61008e610073366004610201565b6001600160a01b031660009081526020819052604090205490565b60405190815260200161005c565b604080518082018252600781526626bcaa37b5b2b760c91b6020820152905161005c919061024b565b6100d86100d3366004610222565b6100e8565b604051901515815260200161005c565b3360009081526020819052604081205482111561014b5760405162461bcd60e51b815260206004820152601a60248201527f696e73756666696369656e7420746f6b656e2062616c616e6365000000000000604482015260640160405180910390fd5b336000908152602081905260408120805484929061016a9084906102b6565b90915550506001600160a01b0383166000908152602081905260408120805484929061019790849061029e565b90915550506040518281526001600160a01b0384169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a350600192915050565b80356001600160a01b03811681146101fc57600080fd5b919050565b600060208284031215610212578081fd5b61021b826101e5565b9392505050565b60008060408385031215610234578081fd5b61023d836101e5565b946020939093013593505050565b6000602080835283518082850152825b818110156102775785810183015185820160400152820161025b565b818111156102885783604083870101525b50601f01601f1916929092016040019392505050565b600082198211156102b1576102b16102cd565b500190565b6000828210156102c8576102c86102cd565b500390565b634e487b7160e01b600052601160045260246000fdfea2646970667358221220d80384ce584e101c5b92e4ee9b7871262285070dbcd2d71f99601f0f4fcecd2364736f6c63430008040033";

  // A Human-Readable ABI; we only need to specify relevant fragments,
  // in the case of deployment this means the constructor
  const abi = [
    "constructor(uint totalSupply)",

    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",

    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",

    // Events
    "event Transfer(address indexed from, address indexed to, uint amount)",
  ];

  const factory = new ethers.ContractFactory(abi, bytecode, signer);

  // Deploy, setting total supply to 100 tokens (assigned to the deployer)
  const erc20Contract = await factory.deploy(totalSupply);

  // Wait until the contract has been deployed before interacting
  // with it; returns the receipt for the deployemnt transaction
  await erc20Contract.deployTransaction.wait();
  return erc20Contract;
}

async function deployDBLockingContract(
  signer,
  beneficiaryAddress,
  startTimestamp,
  durationSeconds,
  cliffDurationSeconds
) {
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(
    beneficiaryAddress,
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

// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

async function main() {
  const signer = createSigner();

  const erc20TotalSupply = 100000;
  const beneficiaryAddress = await signer.getAddress();
  const startMoment = moment();
  const startTimestamp = Math.ceil(Date.now() / 1000);
  const durationSeconds = 900;
  const cliffDurationSeconds = 500;
  const [erc20, locking] = await Promise.all([
    deployErc20Contract(signer, erc20TotalSupply),
    deployDBLockingContract(
      signer,
      beneficiaryAddress,
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

  console.log("actual start", (await locking.start()).toString());
  console.log("expected durationSeconds", durationSeconds.toString());
  console.log("actual duration", (await locking.duration()).toString());
  console.log("expected cliff", cliffDurationSeconds);
  console.log("actual cliff", (await locking.cliffDuration()).toString());

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
