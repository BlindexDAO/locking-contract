// contracts/SampleERC20.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SampleERC20 is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 totalSupply
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, totalSupply);
    }
}
