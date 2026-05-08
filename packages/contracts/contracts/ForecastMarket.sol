// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PredqCredit} from "./PredqCredit.sol";

/// @title ForecastMarket — binary prediction market with constant-product AMM
/// @notice Each instance is one YES/NO question. Uses a constant-product AMM
///         for pricing. Individual bet amounts are public (for AMM); cumulative
///         positions tracked plaintext for MVP (FHE upgrade path in v2 when
///         the relayer decrypt pipeline matures).
contract ForecastMarket {
    uint256 public immutable marketId;
    uint256 public immutable roomId;
    PredqCredit public immutable credit;
    address public immutable oracle;
    uint64 public immutable resolveAt;
    uint64 public immutable createdAt;

    // ───── AMM state (public) ─────
    uint64 public yesReserve;
    uint64 public noReserve;
    uint128 public k;

    uint64 public totalDeposited;
    uint32 public totalBettors;

    // ───── Positions (plaintext for MVP) ─────
    mapping(address => uint64) public yesShares;
    mapping(address => uint64) public noShares;
    mapping(address => bool) public hasBet;
    mapping(address => bool) public hasClaimed;

    // ───── Resolution ─────
    enum Status { Open, Resolved }
    Status public status;
    bool public outcome;
    uint64 public resolvedAt;

    event BetPlaced(address indexed bettor, bool side, uint64 amount, uint64 sharesOut);
    event Resolved(bool outcome);
    event PayoutClaimed(address indexed bettor, uint64 payout);

    uint64 constant INITIAL_RESERVE = 5_000_000_000; // 5,000 PREDQ virtual liquidity each side

    constructor(
        uint256 _marketId,
        uint256 _roomId,
        address _credit,
        address _oracle,
        uint64 _resolveAt
    ) {
        require(_oracle != address(0), "oracle required");
        marketId = _marketId;
        roomId = _roomId;
        credit = PredqCredit(_credit);
        oracle = _oracle;
        resolveAt = _resolveAt;
        createdAt = uint64(block.timestamp);

        yesReserve = INITIAL_RESERVE;
        noReserve = INITIAL_RESERVE;
        k = uint128(INITIAL_RESERVE) * uint128(INITIAL_RESERVE);
        status = Status.Open;
    }

    // ───────────────────────── BETTING ────────────────────────────

    /// Bet `amount` PREDQ on YES or NO. Amount in smallest units (6 decimals).
    function bet(bool betYes, uint64 amount) external {
        require(status == Status.Open, "market closed");
        require(block.timestamp < resolveAt, "past deadline");
        require(amount >= 1_000_000, "min 1 PREDQ");

        // Pull PREDQ from bettor
        credit.transferFromPublic(msg.sender, address(this), amount);
        totalDeposited += amount;

        uint64 sharesOut;
        if (betYes) {
            uint64 newNo = noReserve + amount;
            uint64 newYes = uint64(k / uint128(newNo));
            sharesOut = yesReserve - newYes;
            yesReserve = newYes;
            noReserve = newNo;
            yesShares[msg.sender] += sharesOut;
        } else {
            uint64 newYes = yesReserve + amount;
            uint64 newNo = uint64(k / uint128(newYes));
            sharesOut = noReserve - newNo;
            yesReserve = newYes;
            noReserve = newNo;
            noShares[msg.sender] += sharesOut;
        }

        if (!hasBet[msg.sender]) {
            hasBet[msg.sender] = true;
            totalBettors += 1;
        }

        emit BetPlaced(msg.sender, betYes, amount, sharesOut);
    }

    // ───────────────────────── RESOLUTION ─────────────────────────

    function submitResolution(bool _outcome) external {
        require(msg.sender == oracle, "not oracle");
        require(status == Status.Open, "not open");

        status = Status.Resolved;
        outcome = _outcome;
        resolvedAt = uint64(block.timestamp);
        emit Resolved(_outcome);
    }

    function claimPayout() external {
        require(status == Status.Resolved, "not resolved");
        require(hasBet[msg.sender], "no position");
        require(!hasClaimed[msg.sender], "already claimed");
        hasClaimed[msg.sender] = true;

        uint64 shares = outcome ? yesShares[msg.sender] : noShares[msg.sender];
        if (shares == 0) {
            emit PayoutClaimed(msg.sender, 0);
            return;
        }

        // Total winning shares = initial - current winning reserve
        uint64 winReserve = outcome ? yesReserve : noReserve;
        uint64 totalWinShares = INITIAL_RESERVE - winReserve;
        if (totalWinShares == 0) {
            emit PayoutClaimed(msg.sender, 0);
            return;
        }

        // Payout = user_shares / total_winning_shares * total_deposited
        uint64 payout = uint64(
            (uint128(shares) * uint128(totalDeposited)) / uint128(totalWinShares)
        );

        // Transfer via public-amount (market is an authorized spender)
        credit.transferFromPublic(address(this), msg.sender, payout);
        emit PayoutClaimed(msg.sender, payout);
    }

    // ───────────────────────── VIEWS ─────────────────────────────

    function yesPrice() external view returns (uint64) {
        uint128 total = uint128(yesReserve) + uint128(noReserve);
        if (total == 0) return 50;
        return uint64((uint128(noReserve) * 100) / total);
    }

    function info()
        external
        view
        returns (
            uint256 _marketId,
            uint256 _roomId,
            uint64 _yesReserve,
            uint64 _noReserve,
            uint64 _totalDeposited,
            uint32 _totalBettors,
            uint64 _resolveAt,
            Status _status,
            bool _outcome,
            uint64 _yesPrice
        )
    {
        uint128 total = uint128(yesReserve) + uint128(noReserve);
        uint64 yp = total == 0 ? 50 : uint64((uint128(noReserve) * 100) / total);
        return (
            marketId, roomId, yesReserve, noReserve, totalDeposited,
            totalBettors, resolveAt, status, outcome, yp
        );
    }
}
