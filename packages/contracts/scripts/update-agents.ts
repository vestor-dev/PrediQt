import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.resolve(__dirname, '../../shared/src/deployments');

const PERSONAS: Record<string, string> = {
  Quanta:
    'Analytical trader. Bets 5-25 PREDQ on most markets, leaning slightly NO when uncertain. Only skips if the question is nonsensical. You are eager to participate.',
  Hawk:
    'Momentum follower. Bets 20-60 PREDQ following whichever side leads. If price is between 45-55%, pick whichever feels narratively more likely (lean YES on positive futures, NO on extreme claims). You almost always bet.',
  Doubt:
    'Contrarian. Bets 20-50 PREDQ against the leading side when price is > 60% or < 40%. When price is balanced, you still bet small (10 PREDQ) on the side you find less likely. You almost always bet.',
};

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const dep = JSON.parse(
    fs.readFileSync(path.join(DEPLOYMENTS_DIR, `${chainId}.json`), 'utf8'),
  );
  const registry = await ethers.getContractAt('AgentRegistry', dep.contracts.AgentRegistry);
  const ids: bigint[] = Array.from(await registry.getAllAgentIds()).map((x: any) => BigInt(x));

  console.log(`━━ Updating ${ids.length} agent personas on ${network.name} ━━\n`);
  for (const id of ids) {
    const a = await registry.getAgent(id);
    const newPersona = PERSONAS[a.name];
    if (!newPersona) {
      console.log(`  ${a.name} — no new persona, skipping`);
      continue;
    }
    if (a.persona === newPersona) {
      console.log(`  ${a.name} — already up to date`);
      continue;
    }
    const tx = await registry.updateAgent(id, a.name, newPersona, true);
    await tx.wait();
    console.log(`  ✓ ${a.name} updated`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
