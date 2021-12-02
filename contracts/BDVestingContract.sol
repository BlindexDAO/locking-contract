// contracts/BDVestingContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

// 1. release() - limit so only the beneficiaryAddress could execute it
// 2. implement release() which recieves an amount parameter to release specific amount
contract BDVestingContract is VestingWallet {
    address beneficiaryAddress =
        address(0x1d827461beC8BC392E38d48357E065dfceC23553);
    uint64 startTimestamp = uint64(block.timestamp);
    uint64 durationSeconds = 3600;

    constructor()
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
