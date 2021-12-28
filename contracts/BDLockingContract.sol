// contracts/BDLockingContract.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
@dev The BDLockingContract is used to hold funds given for a certain amount of time with a cliff period. There is also an option for the owner of the contract to withdraw back all the still locked funds - this option exists to allow a DAO/the owner to change the decision on the amount of locked funds during the cliff period. After that, the DAO cannot change the allocation to the team. Once the cliff period is over, any of the defined beneficiaries can invoke the release() function which will split the freed funds fairly between all the beneficiaries.
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

    /**
    @dev Emitted whenever a new funding address is being set.
    */
    event SetFundingAddress(address indexed previousFundingAddress, address indexed newFundingAddress);

    /**
    @dev Emitted whenever a beneficiary is removed.
     */
    event BeneficiaryRemoved(address indexed beneficiaryAddress);

    address[] private _beneficiaries;
    uint256 public tokensReleased;
    address public fundingAddress;
    uint256 public immutable cliffDurationSeconds;
    uint256 public immutable startTimestamp;
    uint256 public immutable lockingDurationSeconds;
    address public immutable tokenAddress;

    constructor(
        address[] memory beneficiariesAddresses,
        address erc20FundingAddress,
        uint256 start,
        uint256 durationSeconds,
        uint256 cliffDuration,
        address erc20token
    ) {
        require(beneficiariesAddresses.length == 3, "BDLockingContract: You must have exactly three beneficiaries");
        for (uint256 index = 0; index < beneficiariesAddresses.length; index++) {
            require(beneficiariesAddresses[index] != address(0), "BDLockingContract: A beneficiary is zero address");
        }

        require(cliffDuration < durationSeconds, "BDLockingContract: The duration of the cliff period must end before the entire lockup period");

        require(erc20FundingAddress != address(0), "BDLockingContract: Funding is zero address");

        require(erc20token != address(0), "BDLockingContract: Locked token is zero address");

        _beneficiaries = beneficiariesAddresses;
        cliffDurationSeconds = cliffDuration;
        startTimestamp = start;
        lockingDurationSeconds = durationSeconds;
        fundingAddress = erc20FundingAddress;
        tokenAddress = erc20token;
    }

    /**
     * @dev Getter for the beneficiaries addresses.
     */
    function beneficiaries() public view returns (address[] memory) {
        return _beneficiaries;
    }

    /**
     * @dev Amount of the total funds deposited to the contract.
     */
    function totalAllocation() public view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this)) + tokensReleased;
    }

    /**
     * @dev Setter for the funding address.
     */
    function setFundingAddress(address newFundingAddress) external onlyOwner {
        require(newFundingAddress != address(0), "BDLockingContract: Funding address cannot be set to the zero address");
        emit SetFundingAddress(fundingAddress, newFundingAddress);
        fundingAddress = newFundingAddress;
    }

    /**
     * @dev Removes a beneficiary by address.
     * Calling release before removing the beneficiary to ensure fair split.
     * Emits a BeneficiaryRemoved event on removal.
     */
    function removeBeneficiary(address beneficiaryAddress) external onlyOwner {
        require(
            _beneficiaries.length > 1,
            "BDLockingContract: The beneficiary address provided does not match any of the beneficiaries stored by this contract"
        );

        bool isBeneficiary = false;
        uint256 index;
        for (index = 0; index < _beneficiaries.length && !isBeneficiary; index++) {
            isBeneficiary = _beneficiaries[index] == beneficiaryAddress;
        }

        require(isBeneficiary, "BDLockingContract: Invalid beneficiary address");

        // We are aware the this function doesn't follow the Checks-Effects-Interactions pattern as we're calling the release
        // function and only after that changing the state of the beneficiaries. We had some thoughts to split the release function
        // so we will be able to release the funds fairly after removing the beneficiary, but decided eventually to keep it as it,
        // since the release function marked as nonReentrant, so this attack vector will fail anyway on the second release.
        // Adding to that we know the erc20 token contract in this case (BDX), so we're safe.
        release();

        _beneficiaries[index - 1] = _beneficiaries[_beneficiaries.length - 1];
        _beneficiaries.pop();

        emit BeneficiaryRemoved(beneficiaryAddress);
    }

    /**
     * @dev Release and send the freed ERC20 tokens to the beneficiaries in a fair split manner. This function can only be executed by a beneficiary.
     *
     * Emits a ERC20Released event if there are funds to release, or ERC20ZeroReleased if there are no funds left to release.
     */
    function release() public nonReentrant {
        uint256 releasable = freedAmount() - tokensReleased;

        if (releasable == 0) {
            emit ERC20ZeroReleased(tokenAddress);
        } else {
            // Solidity rounds down the numbers when one of them is uint[256] so that we'll never fail the transaction
            // due to exceeding the number of available tokens. When there are few tokens left in the contract, we can either keep
            // them there or transfer more funds to the contract so that the remaining funds will be divided equally between the beneficiaries.
            // At most, the amount of tokens that might be left behind is just a little under the number of beneficiaries.
            uint256 roundedDownFairSplitReleasable = releasable / _beneficiaries.length;
            tokensReleased += roundedDownFairSplitReleasable * _beneficiaries.length;

            for (uint256 index = 0; index < _beneficiaries.length; index++) {
                SafeERC20.safeTransfer(IERC20(tokenAddress), _beneficiaries[index], roundedDownFairSplitReleasable);
                emit ERC20Released(tokenAddress, _beneficiaries[index], roundedDownFairSplitReleasable);
            }
        }
    }

    /**
     * @dev Withdraw the ERC20 tokens back to the funding address. Withdrawal is only possible during the cliff's duration period.
     * @param withdrawalAmount - The amount of tokens to withdraw out of the locked tokens.
     * Emits a ERC20Withdrawal event if there are funds to withdraw.
     */
    function withdrawLockedERC20(uint256 withdrawalAmount) external onlyOwner {
        require(
            block.timestamp < startTimestamp + cliffDurationSeconds,
            "BDLockingContract: Withdrawal is only possible during the cliff's duration period"
        );

        // From this point we can assume the total locked tokens is equal to the total allocation of tokens in the contract (which is just the balanceOf the token in the contract).
        // That is because the cliff period hasn't ended just yet, so all the tokens are still locked.
        require(
            withdrawalAmount > 0 && withdrawalAmount <= totalAllocation(),
            "BDLockingContract: The withdrawal amount must be between 1 to the amount of locked tokens"
        );

        SafeERC20.safeTransfer(IERC20(tokenAddress), fundingAddress, withdrawalAmount);
        emit ERC20Withdrawal(tokenAddress, fundingAddress, withdrawalAmount);
    }

    /**
     * @dev Calculates the amount of tokens that has already been freed.
     * The behavior is such that after the cliff period, a linear freeing curve has been implemented.
     */
    function freedAmount() public view returns (uint256) {
        uint256 totalTokenAllocation = totalAllocation();

        if (block.timestamp < startTimestamp + cliffDurationSeconds) {
            return 0;
        } else if (block.timestamp > startTimestamp + lockingDurationSeconds) {
            return totalTokenAllocation;
        } else {
            return (totalTokenAllocation * (block.timestamp - startTimestamp)) / lockingDurationSeconds;
        }
    }
}
