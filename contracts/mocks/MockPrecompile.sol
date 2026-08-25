// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPrecompile {
    bool public shouldVerify = true;
    event VerifyCalled(uint64 chainKey, uint64 height);

    function configure(bool verify_) external { shouldVerify = verify_; }

    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata,
        MerkleProof calldata,
        ContinuityProof calldata
    ) external returns (bool) {
        emit VerifyCalled(chainKey, height);
        return shouldVerify;
    }
}
