// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDistressSignal {
    event DistressSignal(address indexed bulkhead, uint256 indexed clusterId, uint256 distressBps);

    function emitDistress(address bulkhead, uint256 clusterId, uint256 distressBps) external {
        require(bulkhead != address(0), "bulkhead zero");
        emit DistressSignal(bulkhead, clusterId, distressBps);
    }
}
