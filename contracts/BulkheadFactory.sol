// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Bulkhead} from "./Bulkhead.sol";

contract BulkheadFactory {
    error Unauthorized();
    error ClusterFull();
    error ClusterFinalized();
    error InvalidCluster();
    error ClusterExists();

    // Cluster membership is controlled by the deployment operator and must be
    // finalized before the Overseer registers the snapshot.
    uint256 public constant DEFAULT_CLUSTER_SIZE = 7;
    address public immutable overseer;
    address public immutable operator;
    uint256 public nextClusterId;
    mapping(uint256 => address[]) private _clusters;
    mapping(uint256 => bool) public clusterFinalized;
    address[] public allBulkheads;

    event BulkheadCreated(address indexed bulkhead, uint256 indexed clusterId, uint256 indexInCluster);

    constructor(address overseer_) {
        require(overseer_ != address(0), "overseer zero");
        overseer = overseer_;
        operator = msg.sender;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert Unauthorized();
        _;
    }

    function createBulkhead(uint256 clusterId) external onlyOperator returns (address instance) {
        if (clusterFinalized[clusterId]) revert ClusterFinalized();
        if (_clusters[clusterId].length >= DEFAULT_CLUSTER_SIZE) revert ClusterFull();
        instance = address(new Bulkhead(clusterId, overseer));
        _clusters[clusterId].push(instance);
        allBulkheads.push(instance);
        emit BulkheadCreated(instance, clusterId, _clusters[clusterId].length - 1);
    }

    function createCluster(uint256 clusterId, uint256 count) external onlyOperator returns (address[] memory instances) {
        if (clusterFinalized[clusterId]) revert ClusterFinalized();
        if (count == 0 || count > DEFAULT_CLUSTER_SIZE) revert InvalidCluster();
        if (_clusters[clusterId].length != 0) revert ClusterExists();
        instances = new address[](count);
        for (uint256 i; i < count; ++i) {
            instances[i] = address(new Bulkhead(clusterId, overseer));
            _clusters[clusterId].push(instances[i]);
            allBulkheads.push(instances[i]);
            emit BulkheadCreated(instances[i], clusterId, i);
        }
    }

    function finalizeCluster(uint256 clusterId) external onlyOperator {
        if (_clusters[clusterId].length == 0) revert InvalidCluster();
        if (clusterFinalized[clusterId]) revert ClusterFinalized();
        clusterFinalized[clusterId] = true;
    }

    function cluster(uint256 clusterId) external view returns (address[] memory) { return _clusters[clusterId]; }
}
