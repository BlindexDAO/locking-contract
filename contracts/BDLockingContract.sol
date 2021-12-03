// contracts/BDVestingContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
<<<<<<< HEAD
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// 1. release() - limit so only the beneficiaryAddress could execute it
// 2. implement release() which recieves an amount parameter to release specific amount
contract BDLockingContract is Context, Ownable {
    event ERC20Released(address indexed token, uint256 amount);
    event ERC20Withdrawal(address indexed token, uint256 amount);

    mapping(address => uint256) private _erc20Released;

    address[] private _beneficiaries;
    address private immutable _fundingAddress;
    uint256 private immutable _cliffDurationSeconds;
    uint256 private immutable _startTimestamp;
    uint256 private immutable _durationSeconds;

    constructor(
        address[] memory beneficiariesAddresses,
        address erc20FundingAddress,
        uint256 startTimestamp,
        uint256 durationSeconds,
        uint256 cliffDurationSeconds
    ) {
        for (
            uint256 index = 0;
            index < beneficiariesAddresses.length;
            index++
        ) {
            require(
                beneficiariesAddresses[index] != address(0),
                "BDLockingContract: A beneficiary is zero address"
            );
        }

        require(
            cliffDurationSeconds < durationSeconds,
            "BDLockingContract: The duration of the cliff period must end before the entire lockup period"
        );
        require(
            durationSeconds <= 365 * 2 days,
            "BDLockingContract: The duration of the locking period canoot exceed 2 years"
        );
        require(
            startTimestamp <= block.timestamp + 365 days,
            "BDLockingContract: The locking period must start within 365 from now"
        );

=======
import '@openzeppelin/contracts/utils/math/Math.sol';

// 1. release() - limit so only the beneficiaryAddress could execute it
// 2. implement release() which recieves an amount parameter to release specific amount
contract BDLockingContract is Context {
    event ERC20Released(address indexed token, uint256 amount);

    uint256 private _released;
    mapping(address => uint256) private _erc20Released;

    address[] private _beneficiaries;
    uint64 private immutable _cliffDurationSeconds;
    uint64 private immutable _startTimestamp;
    uint64 private immutable _durationSeconds;

    constructor(address[] memory beneficiariesAddresses, uint64 startTimestamp, uint64 durationSeconds, uint64 cliffDurationSeconds) {
        for (uint64 index = 0; index < beneficiariesAddresses.length; index++) {
            require(beneficiariesAddresses[index] != address(0), "BDLockingContract: A beneficiary is zero address");
        }
        
        require(cliffDurationSeconds < durationSeconds, "BDLockingContract: The duration of the cliff period must end before the entire lockup period");
        require(durationSeconds <= 365 * 2 days, "BDLockingContract: The duration of the locking period canoot exceed 2 years");
        require(startTimestamp <= block.timestamp + 365 days, "BDLockingContract: The locking period must start within 365 from now");
        
>>>>>>> d24cbc6867a16a8fd5aa18ee343f0d6350a20c5d
        _cliffDurationSeconds = cliffDurationSeconds;
        _beneficiaries = beneficiariesAddresses;
        _startTimestamp = startTimestamp;
        _durationSeconds = durationSeconds;
<<<<<<< HEAD
        _fundingAddress = erc20FundingAddress;
    }

    modifier onlyBeneficiary() {
        bool isBeneficiary = false;

        for (
            uint256 index = 0;
            index < _beneficiaries.length && !isBeneficiary;
            index++
        ) {
            isBeneficiary = _beneficiaries[index] == msg.sender;
        }

        require(
            isBeneficiary,
            "BDLockingContract: You are not one of the allowed beneficiaries, you cannot execute this function"
        );
        _;
=======
>>>>>>> d24cbc6867a16a8fd5aa18ee343f0d6350a20c5d
    }

    /**
     * @dev Getter for the beneficiaries addresses.
     */
    function beneficiaries() public view returns (address[] memory) {
        return _beneficiaries;
    }

    /**
<<<<<<< HEAD
     * @dev Getter for the funding address
     */
    function fundingAddress() public view returns (address) {
        return _fundingAddress;
    }

    /**
=======
>>>>>>> d24cbc6867a16a8fd5aa18ee343f0d6350a20c5d
     * @dev Getter for the start timestamp.
     */
    function start() public view returns (uint256) {
        return _startTimestamp;
    }

    /**
     * @dev Getter for the lockup duration.
     */
    function duration() public view returns (uint256) {
        return _durationSeconds;
    }

    /**
     * @dev Getter for the cliff duration (seconds).
     */
    function cliffDuration() public view returns (uint256) {
        return _cliffDurationSeconds;
    }

    /**
     * @dev Amount of token already released
     */
    function released(address token) public view returns (uint256) {
        return _erc20Released[token];
    }

    /**
<<<<<<< HEAD
     * @dev Amount of total initial alocation
     */
    function totalAllocation(address token) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this)) + released(token);
    }

    /**
     * @dev Release and send the freed ERC20 tokens to the beneficiaries in a fair split manner. This function can only be executed by a beneficiary.
     *
     * Emits a {TokensReleased} event.
     */
    function release(address token) external onlyBeneficiary {
        uint256 releasable = freedAmount(token, block.timestamp) -
            released(token);
        _erc20Released[token] += releasable;
        emit ERC20Released(token, releasable);

        // TODO: Fix the ceilling so that the transaction won't fail
        uint256 fairSplitReleasable = Math.ceilDiv(
            releasable,
            _beneficiaries.length
        );

        for (uint256 index = 0; index < _beneficiaries.length; index++) {
            SafeERC20.safeTransfer(
                IERC20(token),
                _beneficiaries[index],
                fairSplitReleasable
            );
        }
    }

    /**
     * @dev Withdraw all the locked ERC20 tokens back to the funding address
     */
    function withdrawLockedERC20(address token) external onlyOwner {
        uint256 withdrawalAmount = totalAllocation(token) -
            freedAmount(token, block.timestamp);
        require(
            withdrawalAmount > 0,
            "BDLockingContract: There is nothing left to withdraw"
        );

        SafeERC20.safeTransfer(
            IERC20(token),
            _fundingAddress,
            withdrawalAmount
        );
    }

    /**
     * @dev Calculates the amount of tokens that has already been freed.
     */
    function freedAmount(address token, uint256 timestamp)
=======
     * @dev Release the tokens that have already freed.
     *
     * Emits a {TokensReleased} event.
     */
    function release(address token) public {
        // TODO: Add protection that only the beneficiaries could call this function

        uint256 releasable = freedAmount(token, uint64(block.timestamp)) - released(token);
        _erc20Released[token] += releasable;
        emit ERC20Released(token, releasable);

        address[] memory sendToBeneficiaries = beneficiaries();

        // TODO: Fix the ceilling so that the transaction won't fail
        // TODO: Add test specific for this ceilling use case
        uint256 fairSplitReleasable = Math.ceilDiv(releasable, sendToBeneficiaries.length);

        for (uint256 index = 0; index < sendToBeneficiaries.length; index++) {
            SafeERC20.safeTransfer(IERC20(token), sendToBeneficiaries[index], fairSplitReleasable);
        }
    }

     /**
     * @dev Calculates the amount of tokens that has already been freed.
     */
    function freedAmount(address token, uint64 timestamp)
>>>>>>> d24cbc6867a16a8fd5aa18ee343f0d6350a20c5d
        public
        view
        returns (uint256)
    {
<<<<<<< HEAD
        return _freeingSchedule(totalAllocation(token), timestamp);
    }

=======
        uint256 totalAllocation = IERC20(token).balanceOf(address(this)) + released(token);
        return _freeingSchedule(totalAllocation, timestamp);
    }
    
>>>>>>> d24cbc6867a16a8fd5aa18ee343f0d6350a20c5d
    /**
     * @dev Implementation of the locking formula. This returns the amout freed, as a function of time, for
     * an asset given its total historical allocation.
     * The behavior is such that after the cliff period a linear freeing curve has been implemented.
     */
<<<<<<< HEAD
    function _freeingSchedule(uint256 totalTokenAllocation, uint256 timestamp)
        private
        view
        returns (uint256)
    {
        if (timestamp < start() || timestamp < start() + cliffDuration()) {
            return 0;
        } else if (timestamp > start() + duration()) {
            return totalTokenAllocation;
        } else {
            return (totalTokenAllocation * (timestamp - start())) / duration();
=======
    function _freeingSchedule(uint256 totalAllocation, uint64 timestamp) private view returns (uint256) {
        if (timestamp < start() || timestamp < start() + cliffDuration()) {
            return 0;
        } else if (timestamp > start() + duration()) {
            return totalAllocation;
        } else {
            return (totalAllocation * (timestamp - start())) / duration();
>>>>>>> d24cbc6867a16a8fd5aa18ee343f0d6350a20c5d
        }
    }
}
