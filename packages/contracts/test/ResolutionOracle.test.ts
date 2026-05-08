import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  PredqCredit,
  RoomRegistry,
  MarketFactory,
  ResolutionOracle,
  ForecastMarket,
} from '../typechain-types';

describe('ResolutionOracle — end-to-end flow', function () {
  let credit: PredqCredit;
  let rooms: RoomRegistry;
  let oracle: ResolutionOracle;
  let factory: MarketFactory;
  let owner: any, alice: any, bob: any, mallory: any;

  beforeEach(async function () {
    [owner, alice, bob, mallory] = await ethers.getSigners();

    credit = (await (await ethers.getContractFactory('PredqCredit')).deploy()) as any;
    await credit.waitForDeployment();

    rooms = (await (await ethers.getContractFactory('RoomRegistry')).deploy()) as any;
    await rooms.waitForDeployment();

    oracle = (await (await ethers.getContractFactory('ResolutionOracle')).deploy(owner.address)) as any;
    await oracle.waitForDeployment();

    factory = (await (await ethers.getContractFactory('MarketFactory')).deploy(
      await credit.getAddress(),
      await rooms.getAddress(),
      await oracle.getAddress(),
    )) as any;
    await factory.waitForDeployment();

    await credit.setFactory(await factory.getAddress());
  });

  it('factory exposes the oracle address', async function () {
    expect(await factory.oracle()).to.equal(await oracle.getAddress());
  });

  it('oracle starts owned by deployer', async function () {
    expect(await oracle.owner()).to.equal(owner.address);
  });

  it('newly created markets trust the oracle, not the creator', async function () {
    // alice creates a public room, then a market in it
    await rooms.connect(alice).createPublicRoom('Sports', 'football');
    const aliceRoomId = (await rooms.getPublicRoomIds())[5]; // 5 genesis + alice's

    const resolveAt = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;
    const tx = await factory
      .connect(alice)
      .createMarket(aliceRoomId, 'Will France win the cup?', resolveAt);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find((e) => e?.name === 'MarketCreated');
    const marketAddr = event!.args.market;

    const market = (await ethers.getContractAt('ForecastMarket', marketAddr)) as ForecastMarket;
    expect(await market.oracle()).to.equal(await oracle.getAddress());
  });

  it('only the oracle owner can resolve a market', async function () {
    await rooms.connect(alice).createPublicRoom('Sports', 'football');
    const aliceRoomId = (await rooms.getPublicRoomIds())[5];
    const resolveAt = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;

    const tx = await factory
      .connect(alice)
      .createMarket(aliceRoomId, 'Q?', resolveAt);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find((e) => e?.name === 'MarketCreated');
    const marketAddr = event!.args.market;

    // mallory (not the oracle owner) tries to resolve via the oracle
    await expect(
      oracle.connect(mallory).resolve(marketAddr, true),
    ).to.be.revertedWith('not oracle owner');

    // alice (market creator, not oracle owner) tries to call submitResolution directly
    const market = (await ethers.getContractAt('ForecastMarket', marketAddr)) as ForecastMarket;
    await expect(market.connect(alice).submitResolution(true)).to.be.revertedWith('not oracle');

    // owner resolves through the oracle
    const ok = await oracle.connect(owner).resolve(marketAddr, true);
    await ok.wait();

    expect(await market.status()).to.equal(1n); // Resolved
    expect(await market.outcome()).to.equal(true);
  });

  it('transferOwnership swaps the resolver authority', async function () {
    await oracle.connect(owner).transferOwnership(alice.address);
    expect(await oracle.owner()).to.equal(alice.address);

    // owner can no longer resolve
    await rooms.connect(bob).createPublicRoom('R', '');
    const roomId = (await rooms.getPublicRoomIds())[5];
    const resolveAt = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;
    const tx = await factory.connect(bob).createMarket(roomId, 'Q', resolveAt);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find((e) => e?.name === 'MarketCreated');
    const marketAddr = event!.args.market;

    await expect(
      oracle.connect(owner).resolve(marketAddr, true),
    ).to.be.revertedWith('not oracle owner');
    await expect(oracle.connect(alice).resolve(marketAddr, false)).to.not.be.reverted;
  });

  it('resolveBatch resolves multiple markets atomically', async function () {
    await rooms.connect(alice).createPublicRoom('R', '');
    const roomId = (await rooms.getPublicRoomIds())[5];
    const resolveAt = (await ethers.provider.getBlock('latest'))!.timestamp + 3600;

    const addrs: string[] = [];
    for (let i = 0; i < 3; i++) {
      const tx = await factory.connect(alice).createMarket(roomId, `Q${i}`, resolveAt);
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
        .find((e) => e?.name === 'MarketCreated');
      addrs.push(event!.args.market);
    }

    await oracle.connect(owner).resolveBatch(addrs, [true, false, true]);

    const m0 = await ethers.getContractAt('ForecastMarket', addrs[0]);
    const m1 = await ethers.getContractAt('ForecastMarket', addrs[1]);
    const m2 = await ethers.getContractAt('ForecastMarket', addrs[2]);
    expect(await m0.outcome()).to.equal(true);
    expect(await m1.outcome()).to.equal(false);
    expect(await m2.outcome()).to.equal(true);
  });
});
