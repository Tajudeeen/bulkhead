// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Bulkhead {
    error Unauthorized();
    error BulkheadHalted();
    error ZeroAmount();
    error InsufficientBalance();

    address public immutable overseer;
    uint256 public immutable clusterId;
    bool public halted;
    mapping(address => uint256) public deposits;

    // Invariants: only the configured Overseer changes halted; halted units reject
    // deposits and withdrawals; this contract never reads or calls sibling units.
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event Halted(address indexed overseer, uint256 indexed clusterId);

    constructor(uint256 clusterId_, address overseer_) {
        require(overseer_ != address(0), "overseer zero");
        clusterId = clusterId_;
        overseer = overseer_;
    }

    modifier onlyOverseer() {
        if (msg.sender != overseer) revert Unauthorized();
        _;
    }

    function deposit() external payable {
        if (halted) revert BulkheadHalted();
        if (msg.value == 0) revert ZeroAmount();
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (halted) revert BulkheadHalted();
        if (amount == 0) revert ZeroAmount();
        if (deposits[msg.sender] < amount) revert InsufficientBalance();
        deposits[msg.sender] -= amount;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function halt() external onlyOverseer {
        if (!halted) {
            halted = true;
            emit Halted(msg.sender, clusterId);
        }
    }
}
