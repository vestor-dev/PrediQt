// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IForecastMarket {
    function submitResolution(bool outcome) external;
}

/// @title ResolutionOracle — single trusted authority for market resolution.
/// @notice Markets trust this contract's address (not their creator EOA).
///         Owner pushes outcomes via `resolve(market, outcome)`. v2 swaps the
///         owner for an AI-driven resolver that ingests off-chain news/data.
contract ResolutionOracle {
    address public owner;

    event MarketResolved(address indexed market, bool outcome, address indexed by);
    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address _owner) {
        owner = _owner == address(0) ? msg.sender : _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not oracle owner");
        _;
    }

    function resolve(address market, bool outcome) external onlyOwner {
        IForecastMarket(market).submitResolution(outcome);
        emit MarketResolved(market, outcome, msg.sender);
    }

    /// Batch-resolve multiple markets in one tx (useful for AI-driven sweeps).
    function resolveBatch(address[] calldata markets, bool[] calldata outcomes) external onlyOwner {
        require(markets.length == outcomes.length, "length mismatch");
        for (uint256 i = 0; i < markets.length; i++) {
            IForecastMarket(markets[i]).submitResolution(outcomes[i]);
            emit MarketResolved(markets[i], outcomes[i], msg.sender);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }
}
