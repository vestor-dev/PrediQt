// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ForecastMarket} from "./ForecastMarket.sol";
import {RoomRegistry} from "./RoomRegistry.sol";
import {PredqCredit} from "./PredqCredit.sol";

/// @title MarketFactory — creates ForecastMarket instances within rooms
contract MarketFactory {
    PredqCredit public immutable credit;
    RoomRegistry public immutable rooms;
    address public immutable oracle;
    address public immutable owner;

    uint256 public nextMarketId = 1;

    struct MarketMeta {
        uint256 id;
        uint256 roomId;
        address market;          // deployed ForecastMarket address
        string question;
        address creator;
        uint64 resolveAt;
        uint64 createdAt;
        bool exists;
    }

    mapping(uint256 => MarketMeta) public markets;
    mapping(uint256 => uint256[]) public roomMarketIds;   // roomId → marketIds
    uint256[] public allMarketIds;

    event MarketCreated(
        uint256 indexed marketId,
        uint256 indexed roomId,
        address market,
        string question,
        address indexed creator
    );

    constructor(address _credit, address _rooms, address _oracle) {
        require(_oracle != address(0), "oracle required");
        credit = PredqCredit(_credit);
        rooms = RoomRegistry(_rooms);
        oracle = _oracle;
        owner = msg.sender;
    }

    function createMarket(
        uint256 roomId,
        string calldata question,
        uint64 resolveAt
    ) external returns (uint256 marketId, address marketAddr) {
        require(rooms.isMember(roomId, msg.sender), "not a room member");
        require(bytes(question).length > 0 && bytes(question).length <= 280, "question 1-280 chars");
        require(resolveAt > uint64(block.timestamp), "must resolve in future");

        marketId = nextMarketId++;

        ForecastMarket m = new ForecastMarket(
            marketId,
            roomId,
            address(credit),
            oracle,
            resolveAt
        );
        marketAddr = address(m);

        // Authorize the market to transfer PREDQ from bettors.
        credit.setAuthorizedSpender(marketAddr, true);

        markets[marketId] = MarketMeta({
            id: marketId,
            roomId: roomId,
            market: marketAddr,
            question: question,
            creator: msg.sender,
            resolveAt: resolveAt,
            createdAt: uint64(block.timestamp),
            exists: true
        });
        roomMarketIds[roomId].push(marketId);
        allMarketIds.push(marketId);

        emit MarketCreated(marketId, roomId, marketAddr, question, msg.sender);
    }

    // ─────────────────────────── VIEWS ───────────────────────────

    function getMarket(uint256 marketId) external view returns (MarketMeta memory) {
        return markets[marketId];
    }

    function getRoomMarketIds(uint256 roomId) external view returns (uint256[] memory) {
        return roomMarketIds[roomId];
    }

    function getMarketsBatch(uint256[] calldata ids)
        external
        view
        returns (MarketMeta[] memory out)
    {
        out = new MarketMeta[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            out[i] = markets[ids[i]];
        }
    }

    function totalMarkets() external view returns (uint256) {
        return allMarketIds.length;
    }

    function getAllMarketIds() external view returns (uint256[] memory) {
        return allMarketIds;
    }
}
