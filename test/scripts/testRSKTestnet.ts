import { formatEther } from "@ethersproject/units";
import { ethers } from "hardhat";
import { BDLockingContract } from "../../typechain";

function getERC20(address: string) {
  const ERC20_ABI = JSON.stringify([
    {
      constant: true,
      inputs: [],
      name: "name",
      outputs: [
        {
          name: "",
          type: "string"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: false,
      inputs: [
        {
          name: "_spender",
          type: "address"
        },
        {
          name: "_value",
          type: "uint256"
        }
      ],
      name: "approve",
      outputs: [
        {
          name: "",
          type: "bool"
        }
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: true,
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          name: "",
          type: "uint256"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: false,
      inputs: [
        {
          name: "_from",
          type: "address"
        },
        {
          name: "_to",
          type: "address"
        },
        {
          name: "_value",
          type: "uint256"
        }
      ],
      name: "transferFrom",
      outputs: [
        {
          name: "",
          type: "bool"
        }
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [
        {
          name: "",
          type: "uint8"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: true,
      inputs: [
        {
          name: "_owner",
          type: "address"
        }
      ],
      name: "balanceOf",
      outputs: [
        {
          name: "balance",
          type: "uint256"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [
        {
          name: "",
          type: "string"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: false,
      inputs: [
        {
          name: "_to",
          type: "address"
        },
        {
          name: "_value",
          type: "uint256"
        }
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool"
        }
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: true,
      inputs: [
        {
          name: "_owner",
          type: "address"
        },
        {
          name: "_spender",
          type: "address"
        }
      ],
      name: "allowance",
      outputs: [
        {
          name: "",
          type: "uint256"
        }
      ],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      payable: true,
      stateMutability: "payable",
      type: "fallback"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "owner",
          type: "address"
        },
        {
          indexed: true,
          name: "spender",
          type: "address"
        },
        {
          indexed: false,
          name: "value",
          type: "uint256"
        }
      ],
      name: "Approval",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "from",
          type: "address"
        },
        {
          indexed: true,
          name: "to",
          type: "address"
        },
        {
          indexed: false,
          name: "value",
          type: "uint256"
        }
      ],
      name: "Transfer",
      type: "event"
    }
  ]);

  return new ethers.Contract(address.toLowerCase(), ERC20_ABI, ethers.provider);
}

async function main() {
  const USDT_ADDRESS = "0x4D5a316D23eBE168d8f887b4447bf8DbFA4901CC";
  const BDLockingContractAddress = "0xeb8eb3AFe11c125C92189f269F3F81B5ef22D2C6";
  const EXPLORER_BASE_PATH = "https://explorer.testnet.rsk.co";
  const explorerTransaction = `${EXPLORER_BASE_PATH}/tx/%s`;

  const [deployer, treasury, firstBeneficiary, secondBeneficiary, thirdBeneficiary] = await ethers.getSigners();
  console.log("deployer.address", deployer.address);

  console.log("locking contract RBTC balance", (await ethers.provider.getBalance(BDLockingContractAddress.toLowerCase())).toNumber());

  const lockingContract: BDLockingContract = await ethers.getContractAt("BDLockingContract", BDLockingContractAddress.toLowerCase());
  console.log("beneficiaries", await lockingContract.beneficiaries());
  console.log("Start", (await lockingContract.startTimestamp()).toString());
  console.log("Duration", (await lockingContract.lockingDurationSeconds()).toString());
  console.log("Cliff", (await lockingContract.cliffDurationSeconds()).toString());
  console.log("===================================================");
  const usdtContract = getERC20(USDT_ADDRESS);
  console.log("Treasury ERC20 balance", formatEther(await usdtContract.balanceOf(treasury.address)));
  console.log("Locking contract ERC20 balance", formatEther(await usdtContract.balanceOf(lockingContract.address)));
  const tx = await usdtContract.connect(treasury).transfer(lockingContract.address, 500);
  console.log(`Transaction: ${explorerTransaction}`, tx.hash);
  console.log("Transffering funds from the treasury to the locking contract...");
  await tx.wait();
  console.log("Treasury ERC20 balance", formatEther(await usdtContract.balanceOf(treasury.address)));
  console.log("Locking contract ERC20 balance", formatEther(await usdtContract.balanceOf(lockingContract.address)));
  console.log("===================================================");
  console.log("Total allocation", formatEther(await lockingContract.totalAllocation(usdtContract.address)));
  console.log("Freed amount", formatEther(await lockingContract.freedAmount(usdtContract.address)));
  console.log("===================================================");
  console.log("First beneficiary ERC20 balance", formatEther(await usdtContract.balanceOf(firstBeneficiary.address)));
  console.log("First beneficiary ERC20 balance", formatEther(await usdtContract.balanceOf(secondBeneficiary.address)));
  console.log("First beneficiary ERC20 balance", formatEther(await usdtContract.balanceOf(thirdBeneficiary.address)));
  const releasetx = await lockingContract.connect(firstBeneficiary).release(usdtContract.address);
  console.log(`Transaction: ${explorerTransaction}`, releasetx.hash);
  console.log("Releasing funds...");
  await releasetx.wait();
  console.log("First beneficiary ERC20 balance", formatEther(await usdtContract.balanceOf(firstBeneficiary.address)));
  console.log("First beneficiary ERC20 balance", formatEther(await usdtContract.balanceOf(secondBeneficiary.address)));
  console.log("First beneficiary ERC20 balance", formatEther(await usdtContract.balanceOf(thirdBeneficiary.address)));
  console.log("===================================================");
  console.log("Locking contract ERC20 balance", formatEther(await usdtContract.balanceOf(lockingContract.address)));
  console.log("Freed amount", formatEther(await lockingContract.freedAmount(usdtContract.address)));
  console.log("Released so far", formatEther(await lockingContract.released(usdtContract.address)));
  console.log("===================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
