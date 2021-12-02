const moment = require("moment");
const { ethers } = require("hardhat");
const BigNumber = ethers.BigNumber;
const { formatEther } = ethers.utils;

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

async function deployDBVestingContract(
  signer,
  beneficiaryAddress,
  startTimestamp,
  durationSeconds
) {
  const bytecode =
    "0x60e060405234801561001057600080fd5b50604051610cc2380380610cc283398101604081905261002f916100f3565b8282826001600160a01b03831661009f5760405162461bcd60e51b815260206004820152602a60248201527f56657374696e6757616c6c65743a2062656e6566696369617279206973207a65604482015269726f206164647265737360b01b606482015260840160405180910390fd5b60609290921b6001600160601b03191660805260c090811b6001600160c01b031990811660a05291811b909116905250610142915050565b80516001600160401b03811681146100ee57600080fd5b919050565b600080600060608486031215610107578283fd5b83516001600160a01b038116811461011d578384fd5b925061012b602085016100d7565b9150610139604085016100d7565b90509250925092565b60805160601c60a05160c01c60c05160c01c610b2d6101956000396000818160e30152818161035601526103ab0152600061030e01526000818161014d015281816102c001526104a00152610b2d6000f3fe6080604052600436106100955760003560e01c806386d1a69f1161005957806386d1a69f1461019757806396132521146101ac5780639852595c146101c1578063be9a6555146101e1578063bfb1e568146101f657600080fd5b80630a17b06b146100a15780630fb5a6b4146100d4578063191655871461011157806338af3eed14610133578063810ec23b1461017757600080fd5b3661009c57005b600080fd5b3480156100ad57600080fd5b506100c16100bc3660046109da565b610216565b6040519081526020015b60405180910390f35b3480156100e057600080fd5b507f000000000000000000000000000000000000000000000000000000000000000067ffffffffffffffff166100c1565b34801561011d57600080fd5b5061013161012c366004610934565b61023a565b005b34801561013f57600080fd5b506040516001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001681526020016100cb565b34801561018357600080fd5b506100c161019236600461094e565b610246565b3480156101a357600080fd5b50610131610259565b3480156101b857600080fd5b506000546100c1565b3480156101cd57600080fd5b506100c16101dc366004610934565b6102e5565b3480156101ed57600080fd5b506100c1610303565b34801561020257600080fd5b506100c16102113660046109b8565b610331565b600061023461022460005490565b61022e9047610a43565b83610331565b92915050565b6102438161040b565b50565b600061025283836104c9565b9392505050565b6000805461026642610216565b6102709190610a9a565b9050806000808282546102839190610a43565b90915550506040518181527fda9d4e5f101b8b9b1c5b76d0c5a9f7923571acfc02376aa076b75a8c080c956b9060200160405180910390a16102437f000000000000000000000000000000000000000000000000000000000000000082610558565b6001600160a01b038116600090815260016020526040812054610234565b67ffffffffffffffff7f00000000000000000000000000000000000000000000000000000000000000001690565b600061033b610303565b8267ffffffffffffffff16101561035457506000610234565b7f000000000000000000000000000000000000000000000000000000000000000067ffffffffffffffff16610387610303565b6103919190610a43565b8267ffffffffffffffff1611156103a9575081610234565b7f000000000000000000000000000000000000000000000000000000000000000067ffffffffffffffff166103dc610303565b6103f09067ffffffffffffffff8516610a9a565b6103fa9085610a7b565b6104049190610a5b565b9050610234565b6000610416826102e5565b6104208342610246565b61042a9190610a9a565b6001600160a01b038316600090815260016020526040812080549293508392909190610457908490610a43565b90915550506040518181526001600160a01b038316907fc0e523490dd523c33b1878c9eb14ff46991e3f5b2cd33710918618f2a39cba1b9060200160405180910390a26104c5827f00000000000000000000000000000000000000000000000000000000000000008361067b565b5050565b60006102526104d7846102e5565b6040516370a0823160e01b81523060048201526001600160a01b038616906370a082319060240160206040518083038186803b15801561051657600080fd5b505afa15801561052a573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061054e91906109a0565b61022e9190610a43565b804710156105ad5760405162461bcd60e51b815260206004820152601d60248201527f416464726573733a20696e73756666696369656e742062616c616e636500000060448201526064015b60405180910390fd5b6000826001600160a01b03168260405160006040518083038185875af1925050503d80600081146105fa576040519150601f19603f3d011682016040523d82523d6000602084013e6105ff565b606091505b50509050806106765760405162461bcd60e51b815260206004820152603a60248201527f416464726573733a20756e61626c6520746f2073656e642076616c75652c207260448201527f6563697069656e74206d6179206861766520726576657274656400000000000060648201526084016105a4565b505050565b604080516001600160a01b03848116602483015260448083018590528351808403909101815260649092018352602080830180516001600160e01b031663a9059cbb60e01b17905283518085019094528084527f5361666545524332303a206c6f772d6c6576656c2063616c6c206661696c6564908401526106769286929160009161070b918516908490610788565b80519091501561067657808060200190518101906107299190610980565b6106765760405162461bcd60e51b815260206004820152602a60248201527f5361666545524332303a204552433230206f7065726174696f6e20646964206e6044820152691bdd081cdd58d8d9595960b21b60648201526084016105a4565b6060610797848460008561079f565b949350505050565b6060824710156108005760405162461bcd60e51b815260206004820152602660248201527f416464726573733a20696e73756666696369656e742062616c616e636520666f6044820152651c8818d85b1b60d21b60648201526084016105a4565b843b61084e5760405162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e747261637400000060448201526064016105a4565b600080866001600160a01b0316858760405161086a91906109f4565b60006040518083038185875af1925050503d80600081146108a7576040519150601f19603f3d011682016040523d82523d6000602084013e6108ac565b606091505b50915091506108bc8282866108c7565b979650505050505050565b606083156108d6575081610252565b8251156108e65782518084602001fd5b8160405162461bcd60e51b81526004016105a49190610a10565b80356001600160a01b038116811461091757600080fd5b919050565b803567ffffffffffffffff8116811461091757600080fd5b600060208284031215610945578081fd5b61025282610900565b60008060408385031215610960578081fd5b61096983610900565b91506109776020840161091c565b90509250929050565b600060208284031215610991578081fd5b81518015158114610252578182fd5b6000602082840312156109b1578081fd5b5051919050565b600080604083850312156109ca578182fd5b823591506109776020840161091c565b6000602082840312156109eb578081fd5b6102528261091c565b60008251610a06818460208701610ab1565b9190910192915050565b6020815260008251806020840152610a2f816040850160208701610ab1565b601f01601f19169190910160400192915050565b60008219821115610a5657610a56610ae1565b500190565b600082610a7657634e487b7160e01b81526012600452602481fd5b500490565b6000816000190483118215151615610a9557610a95610ae1565b500290565b600082821015610aac57610aac610ae1565b500390565b60005b83811015610acc578181015183820152602001610ab4565b83811115610adb576000848401525b50505050565b634e487b7160e01b600052601160045260246000fdfea2646970667358221220891f31e711f9daaf1f6aa21aa0a7d4f36a3fb3cc277d93058c2f8b8694b1e70064736f6c63430008040033";

  const abi = [
    "constructor(address beneficiaryAddress, uint64 startTimestamp, uint64 durationSeconds)",
    "function vestedAmount(address token, uint64 timestamp) public view returns (uint256)",
    "function vestingSchedule(uint256 totalAllocation, uint64 timestamp) public view returns (uint256)",
    "function start() public view returns (uint256)",
    "function duration() public view returns (uint256)",
  ];

  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(
    beneficiaryAddress,
    startTimestamp,
    durationSeconds
  );
  console.log("BDVestingContract deployed to:", contract.address);

  await contract.deployTransaction.wait();
  return contract;
}

function createSigner() {
  const url = "http://localhost:8545";
  const provider = new ethers.providers.JsonRpcProvider(url);
  const signer = provider.getSigner();
  return signer;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const signer = createSigner();

  const erc20TotalSupply = 100000;
  const beneficiaryAddress = await signer.getAddress();
  const startMoment = moment();
  const startTimestamp = BigNumber.from(
    Math.ceil(Date.now() / 1000).toString()
  );
  const durationSeconds = BigNumber.from(900);
  const [erc20, vesting] = await Promise.all([
    deployErc20Contract(signer, erc20TotalSupply),
    deployDBVestingContract(
      signer,
      beneficiaryAddress,
      startTimestamp,
      durationSeconds
    ),
  ]);

  const transferAmount = erc20TotalSupply;
  await erc20.transfer(vesting.address, transferAmount);

  const allocationTimestamp = BigNumber.from(
    Math.ceil(startMoment.add(10, "s").toDate().getTime() / 1000).toString()
  );

  console.log("actual start", (await vesting.start()).toString());
  console.log("expected durationSeconds", durationSeconds.toString());
  console.log("actual duration", (await vesting.duration()).toString());

  const expectedTotalAllocation = transferAmount;
  const expectedVested =
    (expectedTotalAllocation * (allocationTimestamp - startTimestamp)) /
    durationSeconds;

  console.log("totalAllocation", expectedTotalAllocation);
  console.log(
    "timestamp - start()",
    allocationTimestamp.sub(startTimestamp).toString()
  );
  console.log("expected Vested", expectedVested);

  const vested = await vesting.vestedAmount(erc20.address, allocationTimestamp);
  console.log("actual Vested", vested.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
