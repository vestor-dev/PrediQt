import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');
const KEYS_OUT = path.resolve(__dirname, '../.agents.json');

/**
 * One-shot: generate N agent wallets, fund each with a small ETH drip from the
 * deployer (so they can pay gas), claim signup PREDQ for each, and register
 * them in AgentRegistry. Writes private keys to packages/contracts/.agents.json
 * (gitignored). Copy the keys into apps/web/.env.local as AGENT_KEY_<NAME>.
 */
const AGENTS = [
  {
    name: 'Quanta',
    persona:
      'Analytical, risk-averse. Bets small (5-25 PREDQ) and only when prices are near extremes. Reads questions literally and prefers NO when in doubt.',
  },
  {
    name: 'Hawk',
    persona:
      'Momentum follower. Bets medium (20-60 PREDQ) on whichever side is leading. Believes the crowd usually knows. Skips markets too close to 50/50.',
  },
  {
    name: 'Doubt',
    persona:
      'Contrarian. Bets medium (20-50 PREDQ) against the leading side when the crowd seems overconfident (price > 70% or < 30%). Skips balanced markets.',
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const dep = JSON.parse(
    fs.readFileSync(path.join(DEPLOYMENTS_DIR, `${chainId}.json`), 'utf8'),
  );
  const registry = await ethers.getContractAt('AgentRegistry', dep.contracts.AgentRegistry);
  const credit = await ethers.getContractAt('PredqCredit', dep.contracts.PredqCredit);

  console.log(`━━ Agent setup on ${network.name} ━━\n`);

  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`  deployer ETH: ${ethers.formatEther(deployerBalance)}\n`);

  type AgentRecord = { name: string; address: string; privateKey: string };
  const records: AgentRecord[] = [];

  for (const a of AGENTS) {
    console.log(`→ ${a.name}`);
    // Generate a fresh wallet
    const w = ethers.Wallet.createRandom().connect(ethers.provider);
    console.log(`   address:    ${w.address}`);

    // Drip 0.01 ETH for gas
    const drip = await deployer.sendTransaction({
      to: w.address,
      value: ethers.parseEther('0.01'),
    });
    await drip.wait();
    console.log(`   funded:     0.01 ETH`);

    // Claim signup PREDQ from the agent's wallet
    const creditW = credit.connect(w) as any;
    const claimTx = await creditW.claimSignupCredits({ gasLimit: 1_500_000 });
    await claimTx.wait();
    console.log(`   PREDQ:      1,000 (signup claimed)`);

    // Register in AgentRegistry from the deployer (registry owner)
    const regTx = await registry.registerAgent(a.name, a.persona, w.address);
    const r = await regTx.wait();
    const ev = r!.logs
      .map((l: any) => { try { return registry.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === 'AgentRegistered');
    console.log(`   registered: id=${ev?.args.id}\n`);

    records.push({ name: a.name, address: w.address, privateKey: w.privateKey });
  }

  fs.writeFileSync(KEYS_OUT, JSON.stringify(records, null, 2) + '\n');
  console.log(`✓ Wrote ${records.length} agent keys to ${path.relative(process.cwd(), KEYS_OUT)}`);
  console.log('  (this file is gitignored — copy keys into apps/web/.env.local)\n');

  console.log('Add these to apps/web/.env.local:');
  for (const r of records) {
    console.log(`  AGENT_KEY_${r.name.toUpperCase()}=${r.privateKey}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
