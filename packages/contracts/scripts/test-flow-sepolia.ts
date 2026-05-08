import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');

/**
 * Live end-to-end smoke test on Sepolia:
 *   sign up → create market → bet → oracle resolves → claim payout.
 *
 * Burns real gas (≈0.01 ETH) so don't run it on a loop.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const dep = JSON.parse(
    fs.readFileSync(path.join(DEPLOYMENTS_DIR, `${chainId}.json`), 'utf8'),
  );
  const { PredqCredit, RoomRegistry, MarketFactory, ResolutionOracle } = dep.contracts;

  console.log(`━━ Live flow test on ${network.name} ━━`);
  console.log(`  Account: ${deployer.address}\n`);

  const credit = await ethers.getContractAt('PredqCredit', PredqCredit);
  const rooms = await ethers.getContractAt('RoomRegistry', RoomRegistry);
  const factory = await ethers.getContractAt('MarketFactory', MarketFactory);
  const oracle = await ethers.getContractAt('ResolutionOracle', ResolutionOracle);

  // 1. Signup credits
  const claimed = await credit.hasClaimedSignup(deployer.address);
  if (!claimed) {
    console.log('→ Claiming signup credits...');
    const tx = await credit.claimSignupCredits();
    await tx.wait();
    console.log('   ✓ 1,000 PREDQ minted (encrypted)\n');
  } else {
    console.log('→ Signup already claimed — skipping\n');
  }

  // 2. Join Global room (id 1) if not a member
  const isMember = await rooms.isMember(1n, deployer.address);
  if (!isMember) {
    console.log('→ Joining room #1 (Global)...');
    const tx = await rooms.joinPublicRoom(1n);
    await tx.wait();
    console.log('   ✓ Joined\n');
  } else {
    console.log('→ Already a member of room #1\n');
  }

  // 3. Create a market with a 90-second resolveAt (resolution can happen any
  //    time — the oracle pushes the outcome; the deadline only blocks new bets)
  const now = (await ethers.provider.getBlock('latest'))!.timestamp;
  const resolveAt = now + 90;
  const question = `Smoke test ${new Date().toISOString()}`;
  console.log(`→ Creating market: "${question}"...`);
  const tx1 = await factory.createMarket(1n, question, resolveAt, { gasLimit: 2_500_000 });
  const r1 = await tx1.wait();
  const ev = r1!.logs
    .map((l: any) => { try { return factory.interface.parseLog(l); } catch { return null; } })
    .find((e: any) => e?.name === 'MarketCreated');
  const marketAddr = ev!.args.market;
  const marketId = ev!.args.marketId;
  console.log(`   marketId:  ${marketId.toString()}`);
  console.log(`   address:   ${marketAddr}\n`);

  const market = await ethers.getContractAt('ForecastMarket', marketAddr);
  console.log(`   market.oracle()    = ${await market.oracle()}`);
  console.log(`   market.resolveAt() = ${await market.resolveAt()}\n`);

  // 4. Place a 5 PREDQ bet on YES
  const betAmount = 5_000_000n; // 5 PREDQ at 6 decimals
  console.log('→ Placing 5 PREDQ bet on YES...');
  const tx2 = await market.bet(true, betAmount, { gasLimit: 800_000 });
  const r2 = await tx2.wait();
  const yesShares = await market.yesShares(deployer.address);
  console.log(`   yesShares: ${yesShares.toString()}\n`);

  // 5. Oracle resolves YES
  console.log('→ Oracle resolving YES...');
  const tx3 = await oracle.resolve(marketAddr, true, { gasLimit: 250_000 });
  await tx3.wait();
  const status = await market.status();
  const outcome = await market.outcome();
  console.log(`   market.status()  = ${status} (1 = Resolved)`);
  console.log(`   market.outcome() = ${outcome}\n`);

  if (status !== 1n || outcome !== true) {
    throw new Error('Resolution did not stick — check oracle wiring.');
  }

  // 6. Claim payout
  console.log('→ Claiming payout...');
  const tx4 = await market.claimPayout({ gasLimit: 1_500_000 });
  const r4 = await tx4.wait();
  const claimed2 = await market.hasClaimed(deployer.address);
  console.log(`   hasClaimed: ${claimed2}`);
  console.log(`   gas used:   ${r4!.gasUsed.toString()}\n`);

  console.log('✓ End-to-end flow succeeded on Sepolia.');
  console.log(`  → https://sepolia.etherscan.io/address/${marketAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
