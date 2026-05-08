import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');

/**
 * Read-only sanity check that the live deployment is wired correctly.
 * Verifies: oracle.owner, factory.oracle, factory.credit, credit.factory.
 */
async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const recordPath = path.join(DEPLOYMENTS_DIR, `${chainId}.json`);
  const dep = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const { PredqCredit, RoomRegistry, MarketFactory, ResolutionOracle } = dep.contracts;

  console.log(`━━ Verifying ${network.name} (chainId ${chainId}) ━━\n`);

  const oracle = await ethers.getContractAt('ResolutionOracle', ResolutionOracle);
  const factory = await ethers.getContractAt('MarketFactory', MarketFactory);
  const credit = await ethers.getContractAt('PredqCredit', PredqCredit);

  const checks: [string, string, string][] = [];

  const oracleOwner = await oracle.owner();
  checks.push(['oracle.owner()', oracleOwner, '(should be deployer)']);

  const factoryOracle = await factory.oracle();
  checks.push([
    'factory.oracle()',
    factoryOracle,
    factoryOracle.toLowerCase() === ResolutionOracle.toLowerCase() ? 'OK' : 'MISMATCH',
  ]);

  const factoryCredit = await factory.credit();
  checks.push([
    'factory.credit()',
    factoryCredit,
    factoryCredit.toLowerCase() === PredqCredit.toLowerCase() ? 'OK' : 'MISMATCH',
  ]);

  const factoryRooms = await factory.rooms();
  checks.push([
    'factory.rooms()',
    factoryRooms,
    factoryRooms.toLowerCase() === RoomRegistry.toLowerCase() ? 'OK' : 'MISMATCH',
  ]);

  const creditFactory = await credit.factory();
  checks.push([
    'credit.factory()',
    creditFactory,
    creditFactory.toLowerCase() === MarketFactory.toLowerCase() ? 'OK' : 'MISMATCH',
  ]);

  const nextId = await factory.nextMarketId();
  checks.push(['factory.nextMarketId()', nextId.toString(), '(fresh factory should be 1)']);

  for (const [k, v, note] of checks) {
    console.log(`  ${k.padEnd(28)} ${v}    ${note}`);
  }

  const allOk =
    factoryOracle.toLowerCase() === ResolutionOracle.toLowerCase() &&
    factoryCredit.toLowerCase() === PredqCredit.toLowerCase() &&
    factoryRooms.toLowerCase() === RoomRegistry.toLowerCase() &&
    creditFactory.toLowerCase() === MarketFactory.toLowerCase();

  console.log(allOk ? '\n✓ All wiring correct.' : '\n✗ Wiring mismatch — check deploy-week3.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
