// contracts/BDLockingContract.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
@dev The BDLockingContract is used to hold funds given for a certain amount of time with a cliff period. There is also an option for the owner of the contract to withdraw back all the still locked funds - this option exists to allow a DAO/the owner to change the decision on the amount of locked funds at any time. Once the cliff period is over, any of the defined beneficiaries can invoke the release() function which will split the freed funds fairly between all the beneficiaries.
 */
contract BDLockingContract is Context, Ownable {
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
    /**
    @dev Emitted whenever a withdrawal request goes through, but there is nothing to withdraw.
     */
    event ERC20ZeroWithdrawal(address indexed token, address indexed to);

    mapping(address => uint256) private _erc20Released;

    address[] private _beneficiaries;
    address public immutable fundingAddress;
    uint256 public immutable cliffDurationSeconds;
    uint256 public immutable startTimestamp;
    uint256 public immutable lockingDurationSeconds;

    constructor(
        address[] memory beneficiariesAddresses,
        address erc20FundingAddress,
        uint256 start,
        uint256 durationSeconds,
        uint256 cliffDuration
    ) {
        require(
            beneficiariesAddresses.length > 0 && beneficiariesAddresses.length <= 100,
            "BDLockingContract: You must have at least one beneficiary and no more than 100"
        );
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

    /**
    @dev Modifier to protect functions that should be called only by one of the beneficiaries.
     */
    modifier onlyBeneficiary() {
        bool isBeneficiary = false;

        for (uint256 index = 0; index < _beneficiaries.length && !isBeneficiary; index++) {
            isBeneficiary = _beneficiaries[index] == msg.sender;
        }

        require(isBeneficiary, "BDLockingContract: You are not one of the allowed beneficiaries, you cannot execute this function");
        _;
    }

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
    function release(address token) external virtual onlyBeneficiary {
        uint256 releasable = freedAmount(token, block.timestamp) - released(token);

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
            uint256 fairSplitReleasable = releasable / _beneficiaries.length;

            for (uint256 index = 0; index < _beneficiaries.length; index++) {
                _erc20Released[token] += fairSplitReleasable;
                SafeERC20.safeTransfer(IERC20(token), _beneficiaries[index], fairSplitReleasable);
                emit ERC20Released(token, _beneficiaries[index], fairSplitReleasable);
            }
        }
    }

    /**
     * @dev Withdraw all the locked ERC20 tokens back to the funding address, based on the given precentage (as basis points).
     * @param token - the address of the token to withdraw
     * @param withdrawalBasisPoints - A basis points representation of the percentage we would like to withdraw out of the locked tokens. E.g. 1.85% would be 185 basis points.
     * Emits a ERC20Withdrawal event if there are funds to withdraw, or ERC20ZeroWithdrawal if there are no funds left to withdraw.
     */
    function withdrawLockedERC20(address token, uint256 withdrawalBasisPoints) external virtual onlyOwner {
        require(
            withdrawalBasisPoints > 0 && withdrawalBasisPoints <= 10000,
            "BDLockingContract: The percentage of the withdrawal must be between 1 to 10,000 basis points"
        );

        uint256 withdrawalAmount = totalAllocation(token) - freedAmount(token, block.timestamp);

        if (withdrawalAmount == 0) {
            emit ERC20ZeroWithdrawal(token, fundingAddress);
        } else {
            // In solidity 0.8+ overflow is automatically being checked and an error being thrown if needed and the transaction will fail.
            // We're dealing here with small enough numbers, so no need for special treatment.
            // Therefore, we'll multiply first and only then divid to improve precision.
            // Before solidity 0.8 it was safer to first divide and then multiply (or using Openzeppelin's SafeMath library)
            withdrawalAmount = (withdrawalAmount * withdrawalBasisPoints) / 10000;

            SafeERC20.safeTransfer(IERC20(token), fundingAddress, withdrawalAmount);
            emit ERC20Withdrawal(token, fundingAddress, withdrawalAmount);
        }
    }

    /**
     * @dev Calculates the amount of tokens that has already been freed.
     * The behavior is such that after the cliff period, a linear freeing curve has been implemented.
     */
    function freedAmount(address token, uint256 timestamp) public view virtual returns (uint256) {
        uint256 totalTokenAllocation = totalAllocation(token);

        if (timestamp < startTimestamp + cliffDurationSeconds) {
            return 0;
        } else if (timestamp > startTimestamp + lockingDurationSeconds) {
            return totalTokenAllocation;
        } else {
            return (totalTokenAllocation * (timestamp - startTimestamp)) / lockingDurationSeconds;
        }
    }
}
