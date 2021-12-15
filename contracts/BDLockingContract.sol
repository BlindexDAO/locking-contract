// contracts/BDLockingContract.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
@dev The BDLockingContract is used to hold funds given for a certain amount of time with a cliff period. There is also an option for the owner of the contract to withdraw back all the still locked funds - this option exists to allow a DAO/the owner to change the decision on the amount of locked funds at any time. Once the cliff period is over, any of the defined beneficiaries can invoke the release() function which will split the freed funds fairly between all the beneficiaries.
 */
contract BDLockingContract is Context, Ownable, ReentrancyGuard {
    /**
    @dev Emitted whenever a release request goes through.
     */
    event ERC20Released(address indexed token, address indexed to, uint256 amount);
    /**
    @dev Emitted whenever a release request goes through, but there is nothing to release.
     */
    event ERC20ZeroReleased(address indexed token);
    /**
    @dev Emitted whenever a withdrawal request goes through.
     */
    event ERC20Withdrawal(address indexed token, address indexed to, uint256 amount);

    mapping(address => uint256) private _erc20Released;

    address[] private _beneficiaries;
    address public immutable fundingAddress;
    uint256 public immutable cliffDurationSeconds;
    uint256 public immutable startTimestamp;
    uint256 public immutable lockingDurationSeconds;
    uint256 public lastWithdrawalTimestamp;

    constructor(
        address[] memory beneficiariesAddresses,
        address erc20FundingAddress,
        uint256 start,
        uint256 durationSeconds,
        uint256 cliffDuration
    ) {
        require(beneficiariesAddresses.length == 3, "BDLockingContract: You must have exactly three beneficiaries");
        for (uint256 index = 0; index < beneficiariesAddresses.length; index++) {
            require(beneficiariesAddresses[index] != address(0), "BDLockingContract: A beneficiary is zero address");
        }

        require(cliffDuration < durationSeconds, "BDLockingContract: The duration of the cliff period must end before the entire lockup period");

        require(erc20FundingAddress != address(0), "BDLockingContract: Funding is zero address");

        _beneficiaries = beneficiariesAddresses;
        cliffDurationSeconds = cliffDuration;
        startTimestamp = start;
        lockingDurationSeconds = durationSeconds;
        fundingAddress = erc20FundingAddress;
    }

    // /**
    // @dev Modifier to protect functions that should be called only by one of the beneficiaries.
    //  */
    // modifier onlyBeneficiary() {
    //     bool isBeneficiary = false;

    //     for (uint256 index = 0; index < _beneficiaries.length && !isBeneficiary; index++) {
    //         isBeneficiary = _beneficiaries[index] == msg.sender;
    //     }

    //     require(isBeneficiary, "BDLockingContract: You are not one of the allowed beneficiaries, you cannot execute this function");
    //     _;
    // }

    /**
     * @dev Getter for the beneficiaries addresses.
     */
    function beneficiaries() public view returns (address[] memory) {
        return _beneficiaries;
    }

    /**
     * @dev Amount of tokens already released.
     */
    function released(address token) public view returns (uint256) {
        return _erc20Released[token];
    }

    /**
     * @dev Amount of the total funds deposited to the contract, minus the funds released or withdrawn from the contract.
     */
    function totalAllocation(address token) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this)) + released(token);
    }

    /**
     * @dev Release and send the freed ERC20 tokens to the beneficiaries in a fair split manner. This function can only be executed by a beneficiary.
     *
     * Emits a ERC20Released event if there are funds to release, or ERC20ZeroReleased if there are no funds left to release.
     */
    function release(address token) public nonReentrant {
        uint256 releasable = freedAmount(token) - released(token);

        // We might have less to release than what we have in the balance of the contract because of the owner's option to withdraw
        // back locked funds
        releasable = Math.min(IERC20(token).balanceOf(address(this)), releasable);

        if (releasable == 0) {
            emit ERC20ZeroReleased(token);
        } else {
            // Solidity rounds down the numbers when one of them is uint[256] so that we'll never fail the transaction
            // due to exceeding the number of available tokens. When there are few tokens left in the contract, we can either keep
            // them there or transfer more funds to the contract so that the remaining funds will be divided equally between the beneficiaries.
            // At most, the amount of tokens that might be left behind is just a little under the number of beneficiaries.
            uint256 roundedDownFairSplitReleasable = releasable / _beneficiaries.length;
            _erc20Released[token] += roundedDownFairSplitReleasable * _beneficiaries.length;

            for (uint256 index = 0; index < _beneficiaries.length; index++) {
                SafeERC20.safeTransfer(IERC20(token), _beneficiaries[index], roundedDownFairSplitReleasable);
                emit ERC20Released(token, _beneficiaries[index], roundedDownFairSplitReleasable);
            }
        }
    }

    /**
     * @dev Withdraw all the locked ERC20 tokens back to the funding address, based on the given precentage (as basis points).
     * @param token - the address of the token to withdraw
     * @param withdrawalAmount - The amount of tokens to withdraw out of the locked tokens.
     * Emits a ERC20Withdrawal event if there are funds to withdraw.
     */
    function withdrawLockedERC20(address token, uint256 withdrawalAmount) external onlyOwner {
        uint256 lockedAmount = totalAllocation(token) - freedAmount(token);
        require(
            lockedAmount >= withdrawalAmount && withdrawalAmount > 0,
            "BDLockingContract: The withdrawal amount must be between 1 to the amount of locked tokens"
        );

        // Whenever there is a withdrawal, we'll release all the freed tokens to their beneficiaries and set the last withdrawal time for future freedAmount calculations
        // We first release and only then set the last withrawal timestamp
        release(token);
        _erc20Released[token] = 0;
        lastWithdrawalTimestamp = block.timestamp;

        SafeERC20.safeTransfer(IERC20(token), fundingAddress, withdrawalAmount);
        emit ERC20Withdrawal(token, fundingAddress, withdrawalAmount);
    }

    /**
     * @dev Calculates the amount of tokens that has already been freed.
     * The behavior is such that after the cliff period, a linear freeing curve has been implemented.
     */
    function freedAmount(address token) public view returns (uint256) {
        uint256 totalTokenAllocation = totalAllocation(token);

        if (block.timestamp < startTimestamp + cliffDurationSeconds) {
            return 0;
        } else if (block.timestamp > startTimestamp + lockingDurationSeconds) {
            return totalTokenAllocation;
        } else {
            uint256 rangeStartTimestamp = Math.max(startTimestamp, lastWithdrawalTimestamp);
            uint256 rangeDureationTimestamp = lockingDurationSeconds - (rangeStartTimestamp - startTimestamp);
            return (totalTokenAllocation * (block.timestamp - rangeStartTimestamp)) / rangeDureationTimestamp;
        }
    }
}
