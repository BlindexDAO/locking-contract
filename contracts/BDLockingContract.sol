// contracts/BDVestingContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

// 1. release() - limit so only the beneficiaryAddress could execute it
// 2. implement release() which recieves an amount parameter to release specific amount
contract BDLockingContract is VestingWallet {
    uint64 private immutable _cliffDurationSeconds;

    constructor(address beneficiaryAddress, uint64 startTimestamp, uint64 durationSeconds, uint64 cliffDurationSeconds)
        VestingWallet(beneficiaryAddress, startTimestamp, durationSeconds)
    {
        require(cliffDurationSeconds < durationSeconds, "The duration of the cliff period must end before the entire lockup period");
        require(durationSeconds <= 365 * 2 days, "The duration of the locking period canoot exceed 2 years");
        require(startTimestamp <= block.timestamp + 365 days, "The locking period must start within 365 from now");
        
        _cliffDurationSeconds = cliffDurationSeconds;
    }

    /**
     * @dev Getter for the cliff duration (seconds).
     */
    function cliffDuration() public view virtual returns (uint256) {
        return _cliffDurationSeconds;
    }

    function freedAmount(address token, uint64 timestamp)
        public
        view
        returns (uint256)
    {
        return super.vestedAmount(token, timestamp);
    }

    /**
     * @dev Virtual implementation of the vesting formula. This returns the amout vested, as a function of time, for
     * an asset given its total historical allocation.
     */
    function _vestingSchedule(uint256 totalAllocation, uint64 timestamp) internal view override returns (uint256) {
        return _freeingSchedule(totalAllocation, timestamp);
    }

    /**
     * @dev Virtual implementation of the vesting formula. This returns the amout vested, as a function of time, for
     * an asset given its total historical allocation.
     */
    function _freeingSchedule(uint256 totalAllocation, uint64 timestamp) internal view returns (uint256) {
        if (timestamp < start() || timestamp < start() + cliffDuration()) {
            return 0;
        } else if (timestamp > start() + duration()) {
            return totalAllocation;
        } else {
            return (totalAllocation * (timestamp - start())) / duration();
        }
    }
}
