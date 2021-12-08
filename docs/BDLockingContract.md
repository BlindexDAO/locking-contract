## `BDLockingContract`

The BDLockingContract is used to hold funds given for a certian amount of time with a cliff period. There is also an option for the owner of the contract to withdraw back all the still locked funds - this option exists to allow a DAO/the owner to change the decision on the amount of locked funds at any time.

### `onlyBeneficiary()`

Modifier to protect functions that should be called only by one of the beneficiaries.

### `constructor(address[] beneficiariesAddresses, address erc20FundingAddress, uint256 startTimestamp, uint256 durationSeconds, uint256 cliffDurationSeconds)` (public)

### `beneficiaries() → address[]` (public)

Getter for the beneficiaries addresses.

### `fundingAddress() → address` (public)

Getter for the funding address

### `start() → uint256` (public)

Getter for the start timestamp.

### `lockingDuration() → uint256` (public)

Getter for the lockup duration.

### `cliffDuration() → uint256` (public)

Getter for the cliff duration (seconds).

### `released(address token) → uint256` (public)

Amount of tokens already released.

### `totalAllocation(address token) → uint256` (public)

Amount of the total initial alocation.

### `release(address token)` (external)

Release and send the freed ERC20 tokens to the beneficiaries in a fair split manner. This function can only be executed by a beneficiary.

Emits a ERC20Released event if there are funds to release, or ERC20ZeroReleased if there are no funds left to release.

### `withdrawLockedERC20(address token, uint256 withdrawalBasisPoints)` (external)

Withdraw all the locked ERC20 tokens back to the funding address, based on the given precentage (as basis points).

### `freedAmount(address token, uint256 timestamp) → uint256` (public)

Calculates the amount of tokens that has already been freed.

### `ERC20Released(address token, address to, uint256 amount)`

Emitted whenever a release request goes through.

### `ERC20ZeroReleased(address token)`

Emitted whenever a release request goes through, but there is nothing to release.

### `ERC20Withdrawal(address token, address to, uint256 amount)`

Emitted whenever a withdrawal request goes through.

### `ERC20ZeroWithdrawal(address token, address to)`

Emitted whenever a withdrawal request goes through, but there is nothing to withdraw.
