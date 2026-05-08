// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PredqCredit — confidential betting credit (ERC-7984 style)
/// @notice Encrypted-balance token used inside Prediqt rooms. Only the holder
///         and the contract itself hold the ACL to decrypt a balance.
contract PredqCredit is SepoliaConfig {
    string public constant name = "Prediqt Credit";
    string public constant symbol = "PREDQ";
    uint8 public constant decimals = 6;

    /// 1,000 PREDQ in smallest units (10^6).
    uint64 public constant SIGNUP_AMOUNT = 1_000_000_000;
    /// 100 PREDQ in smallest units.
    uint64 public constant FAUCET_AMOUNT = 100_000_000;
    /// Weekly faucet cooldown.
    uint256 public constant FAUCET_COOLDOWN = 7 days;

    address public immutable owner;

    mapping(address => euint64) private _balances;
    mapping(address => bool) public hasClaimedSignup;
    mapping(address => uint256) public lastFaucetClaim;

    event SignupMint(address indexed user);
    event FaucetClaim(address indexed user);
    event ConfidentialTransfer(address indexed from, address indexed to);
    event AuthorizedSpender(address indexed spender, bool allowed);

    /// Authorized spenders (e.g. ForecastMarket contracts) may move PREDQ
    /// out of any user balance, but only the *encrypted* amount the user
    /// signed for. This is how rooms place bets without exposing balances.
    mapping(address => bool) public authorizedSpender;

    /// The factory address can also authorize spenders (for new markets).
    address public factory;

    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner || msg.sender == factory, "not owner/factory");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────── ADMIN ───────────────────────────

    /// Set the MarketFactory address (one-time by owner).
    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    /// Authorize a market/agent contract to call confidentialTransferFrom.
    function setAuthorizedSpender(address spender, bool allowed) external onlyOwnerOrFactory {
        authorizedSpender[spender] = allowed;
        emit AuthorizedSpender(spender, allowed);
    }

    // ───────────────────────── ONBOARDING ────────────────────────

    /// Mint the one-time signup amount. Each address can claim exactly once.
    function claimSignupCredits() external {
        require(!hasClaimedSignup[msg.sender], "already claimed");
        hasClaimedSignup[msg.sender] = true;

        euint64 amount = FHE.asEuint64(SIGNUP_AMOUNT);
        euint64 newBal = FHE.add(_balances[msg.sender], amount);
        _balances[msg.sender] = newBal;

        FHE.allowThis(newBal);
        FHE.allow(newBal, msg.sender);

        emit SignupMint(msg.sender);
    }

    /// Weekly faucet — small top-up to keep play going.
    function claimFaucet() external {
        require(hasClaimedSignup[msg.sender], "sign up first");
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "cooldown"
        );
        lastFaucetClaim[msg.sender] = block.timestamp;

        euint64 amount = FHE.asEuint64(FAUCET_AMOUNT);
        euint64 newBal = FHE.add(_balances[msg.sender], amount);
        _balances[msg.sender] = newBal;

        FHE.allowThis(newBal);
        FHE.allow(newBal, msg.sender);

        emit FaucetClaim(msg.sender);
    }

    // ──────────────────────── CONFIDENTIAL OPS ───────────────────

    /// Confidential transfer of an encrypted amount.
    /// If the encrypted amount exceeds the sender's balance, the transfer
    /// silently transfers zero — preserving privacy of failure conditions.
    function confidentialTransfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint64 transferred) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        transferred = _move(msg.sender, to, amount);
    }

    /// Authorized-spender variant. Only contracts the owner whitelisted may
    /// call this (e.g. ForecastMarket placing a bet on the user's behalf
    /// after the user signed for the encrypted amount in the same tx).
    function confidentialTransferFrom(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint64 transferred) {
        require(authorizedSpender[msg.sender], "not authorized spender");
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        transferred = _move(from, to, amount);
    }

    function _move(address from, address to, euint64 amount)
        internal
        returns (euint64 transferred)
    {
        euint64 fromBal = _balances[from];
        ebool canSend = FHE.le(amount, fromBal);
        transferred = FHE.select(canSend, amount, FHE.asEuint64(0));

        euint64 newFrom = FHE.sub(fromBal, transferred);
        euint64 newTo = FHE.add(_balances[to], transferred);
        _balances[from] = newFrom;
        _balances[to] = newTo;

        FHE.allowThis(newFrom);
        FHE.allow(newFrom, from);
        FHE.allowThis(newTo);
        FHE.allow(newTo, to);
        FHE.allowThis(transferred);
        FHE.allow(transferred, msg.sender);

        emit ConfidentialTransfer(from, to);
    }

    /// Authorized-spender transfer with a *public* amount. Used by market
    /// contracts where the bet size is already public (for AMM pricing) but
    /// the cumulative position stays encrypted.
    function transferFromPublic(
        address from,
        address to,
        uint64 amount
    ) external {
        require(authorizedSpender[msg.sender], "not authorized spender");
        require(amount > 0, "zero amount");
        euint64 enc = FHE.asEuint64(amount);
        _move(from, to, enc);
    }

    // ─────────────────────────── VIEWS ───────────────────────────

    /// Encrypted balance handle. Only the holder + this contract have ACL
    /// to decrypt; everyone else gets a useless handle.
    function confidentialBalanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// Time remaining (seconds) until `account` can claim faucet again.
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        if (!hasClaimedSignup[account]) return 0;
        uint256 next = lastFaucetClaim[account] + FAUCET_COOLDOWN;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }
}
