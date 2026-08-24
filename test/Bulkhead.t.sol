// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Bulkhead} from "../contracts/Bulkhead.sol";
import {BulkheadFactory} from "../contracts/BulkheadFactory.sol";

contract BulkheadTest {
    function testOnlyOverseerCanHalt() public {
        Bulkhead b = new Bulkhead(1, address(this));
        b.halt();
        require(b.halted(), "halt did not set state");
    }

    function testFactoryAssignsCluster() public {
        BulkheadFactory f = new BulkheadFactory(address(this));
        address[] memory created = f.createCluster(7, 2);
        require(created.length == 2, "wrong count");
        require(Bulkhead(created[0]).clusterId() == 7, "wrong cluster");
        require(Bulkhead(created[1]).clusterId() == 7, "wrong cluster");
        require(created[0] != created[1], "shared instance");
    }
}
