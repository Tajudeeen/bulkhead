// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockReceiptEncoder {
    function encode(uint8 status, address signal, address bulkhead, uint256 clusterId, uint256 distressBps)
        external pure returns (bytes memory)
    {
        // EvmV1Decoder expects a top-level bytes[] transaction representation;
        // the final chunk contains abi.encode(receiptStatus, gasUsed, logs, bloom).
        bytes[] memory chunks = new bytes[](3);
        chunks[0] = hex"00";
        chunks[1] = hex"00";
        TupleLog[] memory logs = new TupleLog[](1);
        logs[0] = TupleLog({
            address_: signal,
            topics: new bytes32[](3),
            data: abi.encode(distressBps)
        });
        logs[0].topics[0] = keccak256("DistressSignal(address,uint256,uint256)");
        logs[0].topics[1] = bytes32(uint256(uint160(bulkhead)));
        logs[0].topics[2] = bytes32(clusterId);
        chunks[2] = abi.encode(status, uint64(0), logs, new bytes(0));
        return abi.encode(uint8(0), chunks);
    }
}

struct TupleLog { address address_; bytes32[] topics; bytes data; }
