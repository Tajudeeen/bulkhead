// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPrecompile {
    bool public shouldVerify;
    uint8 public receiptStatus;
    bytes public txData;
    event VerifyCalled(uint64 chainKey, uint64 height, uint8 receiptStatus);

    function configure(bool verify_, uint8 status_, bytes calldata txData_) external {
        shouldVerify = verify_;
        receiptStatus = status_;
        txData = txData_;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata,
        bytes calldata,
        bytes calldata
    ) external returns (bool, uint8, bytes memory) {
        emit VerifyCalled(chainKey, height, receiptStatus);
        return (shouldVerify, receiptStatus, txData);
    }
}
