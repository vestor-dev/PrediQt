// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RoomRegistry — public + private prediction-market rooms
/// @notice Membership and posting permissions. Markets themselves live in
///         per-room MarketFactory deployments (Week 2).
contract RoomRegistry {
    enum RoomType {
        Public,
        Private
    }

    struct Room {
        uint256 id;
        string name;
        string description;
        address creator;
        RoomType roomType;
        uint64 createdAt;
        uint32 memberCount;
        bool exists;
    }

    address public immutable owner;
    uint256 public nextRoomId = 1;

    mapping(uint256 => Room) private _rooms;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => address[]) private _roomMembers;
    mapping(address => uint256[]) private _userRooms;

    uint256[] private _publicRoomIds;

    event RoomCreated(
        uint256 indexed roomId,
        address indexed creator,
        RoomType roomType,
        string name
    );
    event MemberAdded(uint256 indexed roomId, address indexed member, address indexed by);
    event MemberRemoved(uint256 indexed roomId, address indexed member);

    constructor() {
        owner = msg.sender;
        // Pre-seed the public canon. These exist from genesis so the app
        // is never empty for a new user.
        _createRoom(
            "Global",
            "World events, sports, crypto, politics",
            msg.sender,
            RoomType.Public
        );
        _createRoom("Sports", "Across all leagues", msg.sender, RoomType.Public);
        _createRoom("Crypto", "Markets, protocols, prices", msg.sender, RoomType.Public);
        _createRoom("Tech", "Products, launches, AI", msg.sender, RoomType.Public);
        _createRoom("Politics", "Elections, policy, geopolitics", msg.sender, RoomType.Public);
    }

    // ───────────────────────── ROOM CREATION ─────────────────────

    function createPublicRoom(string calldata name_, string calldata description_)
        external
        returns (uint256 roomId)
    {
        require(bytes(name_).length > 0 && bytes(name_).length <= 48, "name 1-48 chars");
        require(bytes(description_).length <= 240, "desc <= 240 chars");
        roomId = _createRoom(name_, description_, msg.sender, RoomType.Public);
    }

    function createPrivateRoom(
        string calldata name_,
        string calldata description_,
        address[] calldata invitees
    ) external returns (uint256 roomId) {
        require(bytes(name_).length > 0 && bytes(name_).length <= 48, "name 1-48 chars");
        require(bytes(description_).length <= 240, "desc <= 240 chars");
        require(invitees.length <= 64, "<= 64 invitees");
        roomId = _createRoom(name_, description_, msg.sender, RoomType.Private);
        for (uint256 i = 0; i < invitees.length; i++) {
            address invitee = invitees[i];
            if (invitee != address(0) && invitee != msg.sender && !isMember[roomId][invitee]) {
                _addMember(roomId, invitee, msg.sender);
            }
        }
    }

    // ───────────────────────── MEMBERSHIP ────────────────────────

    function joinPublicRoom(uint256 roomId) external {
        Room storage r = _rooms[roomId];
        require(r.exists, "no room");
        require(r.roomType == RoomType.Public, "private");
        require(!isMember[roomId][msg.sender], "already member");
        _addMember(roomId, msg.sender, msg.sender);
    }

    function inviteMember(uint256 roomId, address invitee) external {
        Room storage r = _rooms[roomId];
        require(r.exists, "no room");
        require(r.creator == msg.sender, "only creator");
        require(invitee != address(0), "zero addr");
        require(!isMember[roomId][invitee], "already member");
        _addMember(roomId, invitee, msg.sender);
    }

    function leaveRoom(uint256 roomId) external {
        Room storage r = _rooms[roomId];
        require(r.exists, "no room");
        require(isMember[roomId][msg.sender], "not member");
        require(msg.sender != r.creator, "creator cannot leave");
        isMember[roomId][msg.sender] = false;
        r.memberCount -= 1;
        emit MemberRemoved(roomId, msg.sender);
    }

    // ───────────────────────── INTERNAL ──────────────────────────

    function _createRoom(
        string memory name_,
        string memory description_,
        address creator,
        RoomType roomType
    ) internal returns (uint256 roomId) {
        roomId = nextRoomId++;
        _rooms[roomId] = Room({
            id: roomId,
            name: name_,
            description: description_,
            creator: creator,
            roomType: roomType,
            createdAt: uint64(block.timestamp),
            memberCount: 0,
            exists: true
        });
        if (roomType == RoomType.Public) {
            _publicRoomIds.push(roomId);
        }
        emit RoomCreated(roomId, creator, roomType, name_);
        _addMember(roomId, creator, creator);
    }

    function _addMember(uint256 roomId, address member, address by) internal {
        isMember[roomId][member] = true;
        _roomMembers[roomId].push(member);
        _userRooms[member].push(roomId);
        _rooms[roomId].memberCount += 1;
        emit MemberAdded(roomId, member, by);
    }

    // ─────────────────────────── VIEWS ───────────────────────────

    function getRoom(uint256 roomId) external view returns (Room memory) {
        return _rooms[roomId];
    }

    function getMembers(uint256 roomId) external view returns (address[] memory) {
        return _roomMembers[roomId];
    }

    function getUserRooms(address user) external view returns (uint256[] memory) {
        return _userRooms[user];
    }

    function getPublicRoomIds() external view returns (uint256[] memory) {
        return _publicRoomIds;
    }

    function publicRoomCount() external view returns (uint256) {
        return _publicRoomIds.length;
    }

    /// Batch fetch — saves the UI from N sequential RPCs.
    function getRoomsBatch(uint256[] calldata ids) external view returns (Room[] memory out) {
        out = new Room[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            out[i] = _rooms[ids[i]];
        }
    }
}
