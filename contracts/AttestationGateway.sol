// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";

interface INativeQueryVerifier {
    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }
    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}

contract AttestationGateway {
    error VerificationFailed();
    error SourceTransactionFailed();
    error EmptyBatch();
    error BatchTooLarge();

    address public constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;

    struct Query {
        uint64 chainKey;
        uint64 height;
        bytes encodedTransaction;
        INativeQueryVerifier.MerkleProof merkleProof;
        INativeQueryVerifier.ContinuityProof continuityProof;
    }

    event VerifiedData(
        bytes32 indexed queryId,
        uint64 indexed chainKey,
        uint64 indexed height,
        bytes encodedTransaction
    );

    // USC caps one continuity proof batch at 10 queries; seven points exactly
    // covers a full Bulkhead cluster while leaving protocol headroom.
    function verify(Query calldata query) external returns (bytes32 queryId) {
        queryId = _verify(query);
    }

    function verifyBatch(Query[] calldata queries) external returns (bytes32[] memory queryIds) {
        uint256 length = queries.length;
        if (length == 0) revert EmptyBatch();
        if (length > 10) revert BatchTooLarge();
        queryIds = new bytes32[](length);
        for (uint256 i; i < length; ++i) {
            queryIds[i] = _verify(queries[i]);
        }
    }

    function _verify(Query calldata query) internal returns (bytes32 queryId) {
        bool verified = INativeQueryVerifier(PRECOMPILE_ADDRESS).verifyAndEmit(
            query.chainKey,
            query.height,
            query.encodedTransaction,
            query.merkleProof,
            query.continuityProof
        );
        if (!verified) revert VerificationFailed();

        // Proof verification is not enough: the source-chain receipt status is
        // decoded independently and must explicitly equal 1.
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(query.encodedTransaction);
        if (receipt.receiptStatus != 1) revert SourceTransactionFailed();

        queryId = keccak256(abi.encode(query.chainKey, query.height, query.encodedTransaction));
        emit VerifiedData(queryId, query.chainKey, query.height, query.encodedTransaction);
    }
}
