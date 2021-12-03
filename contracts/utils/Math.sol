// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.0 (utils/math/Math.sol)

pragma solidity ^0.8.0;

/**
 * @dev Standard math utilities.
 */
library Math {
  function floorDiv(uint256 number, uint256 divider) internal pure returns (uint256) {
    return number / divider - (number % divider == 0 ? 0 : 1);
  }
}