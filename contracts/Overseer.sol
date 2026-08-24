// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Bulkhead} from "./Bulkhead.sol";

interface IAttestationGateway {
    event VerifiedData(bytes32 indexed queryId, uint64 indexed chainKey, uint64 indexed height, bytes encodedTransaction);
}

contract Overseer {
    uint256 public constant DISTRESS_THRESHOLD_BPS = 2_000;
    address public immutable gateway;
    address public immutable registryAdmin;
    mapping(uint256 => address[]) public clusterBulkheads;
    mapping(bytes32 => bool) public processedQuery;

    event ClusterRegistered(uint256 indexed clusterId, address[] bulkheads);
    event BulkheadHalted(
        address indexed bulkhead,
        uint256 indexed clusterId,
        bytes32 indexed queryId,
        uint256 distressBps,
        uint256 thresholdBps
    );

    // Fixed formula: a source event encodes distressBps; halt iff distressBps
    // is at least 2,000 bps (20%). No owner or EOA can invoke this path.
    constructor(address gateway_) {
        require(gateway_ != address(0), "gateway zero");
        gateway = gateway_;
        registryAdmin = msg.sender;
    }

    function registerCluster(uint256 clusterId, address[] calldata bulkheads) external {
        require(msg.sender == registryAdmin, "only registry admin");
        require(clusterBulkheads[clusterId].length == 0, "cluster exists");
        require(bulkheads.length > 0 && bulkheads.length <= 7, "invalid cluster");
        clusterBulkheads[clusterId] = bulkheads;
        emit ClusterRegistered(clusterId, bulkheads);
    }

    function processVerifiedData(bytes32 queryId, uint256 clusterId, uint256 distressBps) external {
        require(msg.sender == gateway, "only gateway");
        require(!processedQuery[queryId], "query processed");
        processedQuery[queryId] = true;
        if (distressBps < DISTRESS_THRESHOLD_BPS) return;
        address[] storage units = clusterBulkheads[clusterId];
        for (uint256 i; i < units.length; ++i) {
            Bulkhead(units[i]).halt();
            emit BulkheadHalted(units[i], clusterId, queryId, distressBps, DISTRESS_THRESHOLD_BPS);
        }
    }
}
