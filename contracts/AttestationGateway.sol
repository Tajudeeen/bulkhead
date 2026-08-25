// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
    error Unauthorized();
    error AlreadyConfigured();
    error DistressSignalMissing();
    error DistressSignalAmbiguous();
    error WrongSourceContract();
    error InvalidDistressSignal();

    address public constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;
    address public immutable admin;
    address public overseer;
    address public sourceSignal;
    uint64 public sourceChainKey;
    bytes32 public constant DISTRESS_SIGNAL_EVENT = keccak256("DistressSignal(address,uint256,uint256)");

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

    constructor(address admin_) {
        if (admin_ == address(0)) revert Unauthorized();
        admin = admin_;
    }

    struct LogEntry { address address_; bytes32[] topics; bytes data; }

    function configure(address overseer_, address sourceSignal_, uint64 sourceChainKey_) external {
        if (msg.sender != admin) revert Unauthorized();
        if (overseer != address(0) || sourceSignal != address(0)) revert AlreadyConfigured();
        if (overseer_ == address(0) || sourceSignal_ == address(0) || sourceChainKey_ == 0) {
            revert InvalidDistressSignal();
        }
        overseer = overseer_;
        sourceSignal = sourceSignal_;
        sourceChainKey = sourceChainKey_;
    }

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

    function verifyAndProcess(Query calldata query) external returns (bytes32 queryId) {
        address bulkhead;
        uint256 clusterId;
        uint256 distressBps;
        (queryId, bulkhead, clusterId, distressBps) = _verifyDistress(query);
        if (overseer == address(0)) revert InvalidDistressSignal();
        (bool ok,) = overseer.call(
            abi.encodeWithSignature(
                "processVerifiedData(bytes32,address,uint256,uint256)", queryId, bulkhead, clusterId, distressBps
            )
        );
        require(ok, "overseer callback failed");
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
        (uint8 receiptStatus,) = _decodeReceipt(query.encodedTransaction);
        if (receiptStatus != 1) revert SourceTransactionFailed();

        queryId = keccak256(abi.encode(query.chainKey, query.height, query.encodedTransaction));
        emit VerifiedData(queryId, query.chainKey, query.height, query.encodedTransaction);
    }

    function _verifyDistress(Query calldata query)
        internal
        returns (bytes32 queryId, address bulkhead, uint256 clusterId, uint256 distressBps)
    {
        if (query.chainKey != sourceChainKey) revert WrongSourceContract();
        queryId = _verify(query);
        (, LogEntry[] memory logs) = _decodeReceipt(query.encodedTransaction);
        uint256 matches;
        uint256 matchIndex;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == DISTRESS_SIGNAL_EVENT) {
                matches++;
                matchIndex = i;
            }
        }
        if (matches == 0) revert DistressSignalMissing();
        if (matches != 1) revert DistressSignalAmbiguous();

        LogEntry memory distressLog = logs[matchIndex];
        if (sourceSignal == address(0) || distressLog.address_ != sourceSignal) revert WrongSourceContract();
        if (distressLog.topics.length != 3 || distressLog.data.length != 32) revert InvalidDistressSignal();
        bulkhead = address(uint160(uint256(distressLog.topics[1])));
        clusterId = uint256(distressLog.topics[2]);
        distressBps = abi.decode(distressLog.data, (uint256));
        if (bulkhead == address(0) || distressBps > 10_000) revert InvalidDistressSignal();
    }

    function _decodeReceipt(bytes calldata encodedTransaction)
        internal pure returns (uint8 receiptStatus, LogEntry[] memory logs)
    {
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        if (txType > 4) revert InvalidDistressSignal();
        uint256 receiptChunkIndex = txType <= 2 ? 2 : 3;
        if (chunks.length != receiptChunkIndex + 1) revert InvalidDistressSignal();
        (receiptStatus,, logs,) = abi.decode(
            chunks[receiptChunkIndex], (uint8, uint64, LogEntry[], bytes)
        );
    }
}
