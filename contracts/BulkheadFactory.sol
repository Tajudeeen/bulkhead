// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Bulkhead} from "./Bulkhead.sol";

contract BulkheadFactory {
    uint256 public constant DEFAULT_CLUSTER_SIZE = 7;
    address public immutable overseer;
    uint256 public nextClusterId;
    mapping(uint256 => address[]) private _clusters;
    address[] public allBulkheads;

    event BulkheadCreated(address indexed bulkhead, uint256 indexed clusterId, uint256 indexInCluster);

    constructor(address overseer_) {
        require(overseer_ != address(0), "overseer zero");
        overseer = overseer_;
    }

    function createBulkhead(uint256 clusterId) external returns (address instance) {
        require(msg.sender == overseer, "only overseer");
        require(_clusters[clusterId].length < DEFAULT_CLUSTER_SIZE, "cluster full");
        instance = address(new Bulkhead(clusterId, overseer));
        _clusters[clusterId].push(instance);
        allBulkheads.push(instance);
        emit BulkheadCreated(instance, clusterId, _clusters[clusterId].length - 1);
    }

    function createCluster(uint256 clusterId, uint256 count) external returns (address[] memory instances) {
        require(msg.sender == overseer, "only overseer");
        require(count > 0 && count <= DEFAULT_CLUSTER_SIZE, "invalid count");
        require(_clusters[clusterId].length == 0, "cluster exists");
        instances = new address[](count);
        for (uint256 i; i < count; ++i) {
            instances[i] = address(new Bulkhead(clusterId, overseer));
            _clusters[clusterId].push(instances[i]);
            allBulkheads.push(instances[i]);
            emit BulkheadCreated(instances[i], clusterId, i);
        }
    }

    function cluster(uint256 clusterId) external view returns (address[] memory) { return _clusters[clusterId]; }
}
