// contracts/BDVestingContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

contract BDVestingContract is VestingWallet {
    address beneficiaryAddress =
        address(0x1d827461beC8BC392E38d48357E065dfceC23553);
    uint64 startTimestamp = uint64(block.timestamp);
    uint64 durationSeconds = 3600;

    constructor()
        VestingWallet(beneficiaryAddress, startTimestamp, durationSeconds)
    {}

    // 1. release() - limit so only the beneficiaryAddress could execute it
    // 2. implement release() which recieves an amount parameter to release specific amount
}
