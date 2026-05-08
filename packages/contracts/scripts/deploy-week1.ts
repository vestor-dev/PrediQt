import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');

type DeploymentRecord = {
  chainId: number;
  network: string;
  deployedAt: string;
  contracts: Record<string, string>;
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Prediqt — Week 1 Deployment`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Network:     ${network.name} (chainId ${chainId})`);
  console.log(`  Deployer:    ${deployer.address}`);
  console.log(`  Balance:     ${ethers.formatEther(balance)} ETH`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (balance === 0n && network.name !== 'hardhat' && network.name !== 'localhost') {
    throw new Error('Deployer has 0 ETH. Fund it before running.');
  }

  // ─── PredqCredit ────────────────────────────────────────────
  console.log('→ Deploying PredqCredit...');
  const PredqCredit = await ethers.getContractFactory('PredqCredit');
  const credit = await PredqCredit.deploy();
  await credit.waitForDeployment();
  const creditAddr = await credit.getAddress();
  console.log(`   PredqCredit:   ${creditAddr}`);

  // ─── RoomRegistry ────────────────────────────────────────────
  console.log('→ Deploying RoomRegistry...');
  const RoomRegistry = await ethers.getContractFactory('RoomRegistry');
  const registry = await RoomRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`   RoomRegistry:  ${registryAddr}\n`);

  // ─── Persist addresses for the web app ───────────────────────
  const record: DeploymentRecord = {
    chainId,
    network: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      PredqCredit: creditAddr,
      RoomRegistry: registryAddr,
    },
  };

  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  const outPath = path.join(DEPLOYMENTS_DIR, `${chainId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n');
  console.log(`✓ Wrote ${path.relative(process.cwd(), outPath)}`);

  if (chainId === 11155111) {
    console.log('\n→ Etherscan:');
    console.log(`   https://sepolia.etherscan.io/address/${creditAddr}`);
    console.log(`   https://sepolia.etherscan.io/address/${registryAddr}`);
    console.log('\n→ Verify with:');
    console.log(`   pnpm --filter @prediqt/contracts verify:sepolia ${creditAddr}`);
    console.log(`   pnpm --filter @prediqt/contracts verify:sepolia ${registryAddr}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
