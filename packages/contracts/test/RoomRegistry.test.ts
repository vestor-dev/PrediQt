import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RoomRegistry } from '../typechain-types';

describe('RoomRegistry', function () {
  let registry: RoomRegistry;
  let owner: any, alice: any, bob: any, carol: any;

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('RoomRegistry');
    registry = (await Factory.deploy()) as RoomRegistry;
    await registry.waitForDeployment();
  });

  describe('genesis seeding', function () {
    it('pre-seeds 5 public rooms', async function () {
      const ids = await registry.getPublicRoomIds();
      expect(ids.length).to.equal(5);
      expect(await registry.publicRoomCount()).to.equal(5n);
    });

    it('first room is Global', async function () {
      const room = await registry.getRoom(1n);
      expect(room.name).to.equal('Global');
      expect(room.roomType).to.equal(0n); // Public
      expect(room.exists).to.equal(true);
    });
  });

  describe('createPublicRoom', function () {
    it('creates a public room and adds creator as member', async function () {
      const tx = await registry
        .connect(alice)
        .createPublicRoom('Lakers', 'Friendly NBA betting');
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'RoomCreated');
      expect(event).to.not.be.null;
      const roomId = event!.args.roomId;

      const room = await registry.getRoom(roomId);
      expect(room.name).to.equal('Lakers');
      expect(room.creator).to.equal(alice.address);
      expect(room.memberCount).to.equal(1n);
      expect(await registry.isMember(roomId, alice.address)).to.equal(true);
    });

    it('rejects empty name', async function () {
      await expect(registry.connect(alice).createPublicRoom('', 'desc')).to.be.revertedWith(
        'name 1-48 chars',
      );
    });
  });

  describe('createPrivateRoom', function () {
    it('creates private room with invitees', async function () {
      const tx = await registry
        .connect(alice)
        .createPrivateRoom('Acme Corp', 'internal forecasts', [bob.address, carol.address]);
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'RoomCreated');
      const roomId = event!.args.roomId;

      const room = await registry.getRoom(roomId);
      expect(room.roomType).to.equal(1n); // Private
      expect(room.memberCount).to.equal(3n);
      expect(await registry.isMember(roomId, alice.address)).to.equal(true);
      expect(await registry.isMember(roomId, bob.address)).to.equal(true);
      expect(await registry.isMember(roomId, carol.address)).to.equal(true);

      const publicIds = await registry.getPublicRoomIds();
      expect(publicIds.includes(roomId)).to.equal(false);
    });

    it('dedupes the creator from invitees', async function () {
      const tx = await registry
        .connect(alice)
        .createPrivateRoom('R', 'd', [alice.address, bob.address]);
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'RoomCreated');
      const roomId = event!.args.roomId;
      const room = await registry.getRoom(roomId);
      expect(room.memberCount).to.equal(2n);
    });
  });

  describe('membership', function () {
    let roomId: bigint;
    beforeEach(async function () {
      roomId = 1n; // Global, public, owner-created
    });

    it('joinPublicRoom adds the caller', async function () {
      await registry.connect(alice).joinPublicRoom(roomId);
      expect(await registry.isMember(roomId, alice.address)).to.equal(true);
      const userRooms = await registry.getUserRooms(alice.address);
      expect(userRooms.includes(roomId)).to.equal(true);
    });

    it('rejects duplicate join', async function () {
      await registry.connect(alice).joinPublicRoom(roomId);
      await expect(registry.connect(alice).joinPublicRoom(roomId)).to.be.revertedWith(
        'already member',
      );
    });

    it('private room rejects joinPublicRoom', async function () {
      const tx = await registry.connect(alice).createPrivateRoom('P', 'd', []);
      const r = await tx.wait();
      const event = r!.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'RoomCreated');
      const privId = event!.args.roomId;

      await expect(registry.connect(bob).joinPublicRoom(privId)).to.be.revertedWith(
        'private',
      );
    });

    it('only creator can invite to private room', async function () {
      const tx = await registry.connect(alice).createPrivateRoom('P', 'd', []);
      const r = await tx.wait();
      const event = r!.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'RoomCreated');
      const privId = event!.args.roomId;

      await expect(
        registry.connect(bob).inviteMember(privId, carol.address),
      ).to.be.revertedWith('only creator');

      await registry.connect(alice).inviteMember(privId, carol.address);
      expect(await registry.isMember(privId, carol.address)).to.equal(true);
    });

    it('member can leave but creator cannot', async function () {
      const tx = await registry.connect(alice).createPrivateRoom('P', 'd', [bob.address]);
      const r = await tx.wait();
      const event = r!.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === 'RoomCreated');
      const privId = event!.args.roomId;

      await registry.connect(bob).leaveRoom(privId);
      expect(await registry.isMember(privId, bob.address)).to.equal(false);

      await expect(registry.connect(alice).leaveRoom(privId)).to.be.revertedWith(
        'creator cannot leave',
      );
    });
  });

  describe('getRoomsBatch', function () {
    it('returns rooms by ID list', async function () {
      const rooms = await registry.getRoomsBatch([1n, 2n, 3n]);
      expect(rooms.length).to.equal(3);
      expect(rooms[0].name).to.equal('Global');
      expect(rooms[1].name).to.equal('Sports');
      expect(rooms[2].name).to.equal('Crypto');
    });
  });
});
