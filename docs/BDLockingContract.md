## `BDLockingContract`



The BDLockingContract is used to hold funds given for a certain amount of time with a cliff period. There is also an option for the owner of the contract to withdraw back all the still locked funds - this option exists to allow a DAO/the owner to change the decision on the amount of locked funds during the cliff period. After that, the DAO cannot change the allocation to the team. Once the cliff period is over, any of the defined beneficiaries can invoke the release() function which will split the freed funds fairly between all the beneficiaries.

### `onlyBeneficiary()`



Modifier to protect functions that should be called only by one of the beneficiaries.


### `constructor(address[] beneficiariesAddresses, address erc20FundingAddress, uint256 start, uint256 durationSeconds, uint256 cliffDuration)` (public)





### `beneficiaries() → address[]` (public)



Getter for the beneficiaries addresses.

### `released(address token) → uint256` (public)



Amount of tokens already released.

### `totalAllocation(address token) → uint256` (public)



Amount of the total funds deposited to the contract.

### `setFundingAddress(address newFundingAddress)` (external)





### `release(address token)` (external)



Release and send the freed ERC20 tokens to the beneficiaries in a fair split manner. This function can only be executed by a beneficiary.

Emits a ERC20Released event if there are funds to release, or ERC20ZeroReleased if there are no funds left to release.

### `withdrawLockedERC20(address token, uint256 withdrawalAmount)` (external)



Withdraw the ERC20 tokens back to the funding address. Withdrawal is only possible during the cliff's duration period.


### `freedAmount(address token) → uint256` (public)



Calculates the amount of tokens that has already been freed.
The behavior is such that after the cliff period, a linear freeing curve has been implemented.


### `ERC20Released(address token, address to, uint256 amount)`



Emitted whenever a release request goes through.

### `ERC20ZeroReleased(address token)`



Emitted whenever a release request goes through, but there is nothing to release.

### `ERC20Withdrawal(address token, address to, uint256 amount)`



Emitted whenever a withdrawal request goes through.

### `SetFundingAddress(address fundingAddress)`



Emitted whenever a new funding address is being set.



