// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry — directory of AI agents that bet alongside humans.
/// @notice Each agent has its own EOA wallet (server-held key). The registry
///         is the on-chain source of truth for who's active and what their
///         persona is. Bets are made by the agent's wallet via standard
///         ForecastMarket.bet calls — no special privileges.
contract AgentRegistry {
    struct Agent {
        uint256 id;
        string name;          // display name, e.g. "Quanta"
        string persona;       // short prompt-context phrase
        address wallet;       // EOA that places bets on this agent's behalf
        uint64 createdAt;
        bool active;
        bool exists;
    }

    address public immutable owner;
    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public agentByWallet;
    uint256[] public allAgentIds;

    event AgentRegistered(uint256 indexed id, string name, address indexed wallet);
    event AgentUpdated(uint256 indexed id, string name, string persona, bool active);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not registry owner");
        _;
    }

    function registerAgent(string calldata name, string calldata persona, address wallet)
        external
        onlyOwner
        returns (uint256 id)
    {
        require(wallet != address(0), "zero wallet");
        require(agentByWallet[wallet] == 0, "wallet already registered");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "name 1-32 chars");

        id = nextAgentId++;
        agents[id] = Agent({
            id: id,
            name: name,
            persona: persona,
            wallet: wallet,
            createdAt: uint64(block.timestamp),
            active: true,
            exists: true
        });
        agentByWallet[wallet] = id;
        allAgentIds.push(id);

        emit AgentRegistered(id, name, wallet);
    }

    function updateAgent(uint256 id, string calldata name, string calldata persona, bool active)
        external
        onlyOwner
    {
        require(agents[id].exists, "not found");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "name 1-32 chars");
        agents[id].name = name;
        agents[id].persona = persona;
        agents[id].active = active;
        emit AgentUpdated(id, name, persona, active);
    }

    // ─────────────────────────── VIEWS ───────────────────────────

    function getAgent(uint256 id) external view returns (Agent memory) {
        return agents[id];
    }

    function getAgentByWallet(address wallet) external view returns (Agent memory) {
        uint256 id = agentByWallet[wallet];
        return agents[id];
    }

    function isAgent(address wallet) external view returns (bool) {
        return agentByWallet[wallet] != 0;
    }

    function getAllAgentIds() external view returns (uint256[] memory) {
        return allAgentIds;
    }

    function getActiveAgents() external view returns (Agent[] memory out) {
        // First pass — count
        uint256 count = 0;
        for (uint256 i = 0; i < allAgentIds.length; i++) {
            if (agents[allAgentIds[i]].active) count++;
        }
        out = new Agent[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < allAgentIds.length; i++) {
            Agent storage a = agents[allAgentIds[i]];
            if (a.active) {
                out[j++] = a;
            }
        }
    }

    function totalAgents() external view returns (uint256) {
        return allAgentIds.length;
    }
}
