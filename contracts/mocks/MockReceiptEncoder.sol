// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockReceiptEncoder {
    function encode(uint8 status) external pure returns (bytes memory) {
        // EvmV1Decoder expects a top-level bytes[] transaction representation;
        // the final chunk contains abi.encode(receiptStatus, gasUsed, logs, bloom).
        bytes[] memory chunks = new bytes[](2);
        chunks[0] = hex"00";
        chunks[1] = abi.encode(status, uint64(0), new TupleLog[](0), new bytes(0));
        return abi.encode(chunks);
    }
}

struct TupleLog { address address_; bytes32[] topics; bytes data; }
