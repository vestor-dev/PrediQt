import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');

/**
 * Week 4: deploy AgentRegistry. AI agents are introduced as their own
 * registered EOAs — bets and resolutions still go through the existing
 * MarketFactory + ResolutionOracle.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  console.log(`━━ Week 4 Deployment on ${network.name} (${chainId}) ━━`);
  console.log(`  Deployer: ${deployer.address}\n`);

  const recordPath = path.join(DEPLOYMENTS_DIR, `${chainId}.json`);
  const existing = JSON.parse(fs.readFileSync(recordPath, 'utf8'));

  console.log('→ Deploying AgentRegistry...');
  const Registry = await ethers.getContractFactory('AgentRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const addr = await registry.getAddress();
  console.log(`   AgentRegistry: ${addr}\n`);

  existing.contracts.AgentRegistry = addr;
  existing.deployedAt = new Date().toISOString();
  fs.writeFileSync(recordPath, JSON.stringify(existing, null, 2) + '\n');
  console.log(`✓ Updated ${path.relative(process.cwd(), recordPath)}`);

  if (chainId === 11155111) {
    console.log(`\n→ https://sepolia.etherscan.io/address/${addr}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
