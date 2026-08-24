// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDistressSignal {
    event DistressSignal(uint256 indexed clusterId, uint256 distressBps);

    function emitDistress(uint256 clusterId, uint256 distressBps) external {
        emit DistressSignal(clusterId, distressBps);
    }
}
