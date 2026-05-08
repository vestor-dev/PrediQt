import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');

/**
 * Week 3: deploy ResolutionOracle and re-deploy MarketFactory wired to it.
 * The factory constructor now requires an oracle address, so the old factory
 * (with `creator-as-resolver`) is replaced. Old markets stay readable on-chain
 * but won't appear under the new factory's index — fresh start for resolution.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Prediqt — Week 3 Deployment (ResolutionOracle)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Network:     ${network.name} (chainId ${chainId})`);
  console.log(`  Deployer:    ${deployer.address}`);
  console.log(`  Balance:     ${ethers.formatEther(balance)} ETH`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const recordPath = path.join(DEPLOYMENTS_DIR, `${chainId}.json`);
  const existing = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const creditAddr = existing.contracts.PredqCredit;
  const roomsAddr = existing.contracts.RoomRegistry;

  if (!creditAddr || !roomsAddr) {
    throw new Error('Week 1 contracts missing. Run deploy-week1 first.');
  }

  console.log(`  Using PredqCredit:   ${creditAddr}`);
  console.log(`  Using RoomRegistry:  ${roomsAddr}\n`);

  // ─── ResolutionOracle ───────────────────────────────────────
  console.log('→ Deploying ResolutionOracle...');
  const Oracle = await ethers.getContractFactory('ResolutionOracle');
  const oracle = await Oracle.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log(`   ResolutionOracle: ${oracleAddr}`);
  console.log(`   Owner:            ${deployer.address}\n`);

  // ─── MarketFactory (re-deploy wired to oracle) ──────────────
  console.log('→ Deploying MarketFactory wired to oracle...');
  const Factory = await ethers.getContractFactory('MarketFactory');
  const factory = await Factory.deploy(creditAddr, roomsAddr, oracleAddr);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`   MarketFactory:    ${factoryAddr}\n`);

  // ─── Re-point PredqCredit at the new factory ────────────────
  console.log('→ Updating PredqCredit.factory...');
  const credit = await ethers.getContractAt('PredqCredit', creditAddr);
  const tx = await credit.setFactory(factoryAddr);
  await tx.wait();
  console.log('   ✓ New factory authorized to register market spenders\n');

  // ─── Persist ─────────────────────────────────────────────────
  existing.contracts.ResolutionOracle = oracleAddr;
  existing.contracts.MarketFactory = factoryAddr;
  existing.deployedAt = new Date().toISOString();
  fs.writeFileSync(recordPath, JSON.stringify(existing, null, 2) + '\n');
  console.log(`✓ Updated ${path.relative(process.cwd(), recordPath)}`);

  if (chainId === 11155111) {
    console.log('\n→ Etherscan:');
    console.log(`   Oracle:   https://sepolia.etherscan.io/address/${oracleAddr}`);
    console.log(`   Factory:  https://sepolia.etherscan.io/address/${factoryAddr}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
