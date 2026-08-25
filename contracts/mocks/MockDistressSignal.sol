// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDistressSignal {
    error Unauthorized();

    address public immutable operator;
    event DistressSignal(address indexed bulkhead, uint256 indexed clusterId, uint256 distressBps);

    constructor(address operator_) {
        require(operator_ != address(0), "operator zero");
        operator = operator_;
    }

    function emitDistress(address bulkhead, uint256 clusterId, uint256 distressBps) external {
        if (msg.sender != operator) revert Unauthorized();
        require(bulkhead != address(0), "bulkhead zero");
        require(distressBps <= 10_000, "bps out of range");
        emit DistressSignal(bulkhead, clusterId, distressBps);
    }
}
