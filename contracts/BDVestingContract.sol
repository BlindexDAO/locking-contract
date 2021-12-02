// contracts/BDVestingContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

// 1. release() - limit so only the beneficiaryAddress could execute it
// 2. implement release() which recieves an amount parameter to release specific amount
contract BDVestingContract is VestingWallet {
    constructor(address beneficiaryAddress, uint64 startTimestamp, uint64 durationSeconds)
        VestingWallet(beneficiaryAddress, startTimestamp, durationSeconds)
    {}

    function released(address token)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return VestingWallet.released(token);
    }

    function release(address token) public virtual override {
        return VestingWallet.release(token);
    }

    function vestedAmount(address token, uint64 timestamp)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return VestingWallet.vestedAmount(token, timestamp);
    }
}
