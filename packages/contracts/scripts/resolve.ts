import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI: resolve a market via the ResolutionOracle.
 *
 * Usage:
 *   MARKET=0xabc... OUTCOME=yes npx hardhat run scripts/resolve.ts --network sepolia
 *   MARKET=0xabc... OUTCOME=no  npx hardhat run scripts/resolve.ts --network sepolia
 *
 * Only the oracle owner can run this — the PRIVATE_KEY in .env must match
 * `oracle.owner()`.
 */
async function main() {
  const marketAddr = process.env.MARKET;
  const outcomeStr = (process.env.OUTCOME ?? '').toLowerCase();

  if (!marketAddr || !outcomeStr) {
    console.error('Usage: MARKET=0x... OUTCOME=yes|no npx hardhat run scripts/resolve.ts --network sepolia');
    process.exit(1);
  }
  if (outcomeStr !== 'yes' && outcomeStr !== 'no') {
    console.error(`OUTCOME must be 'yes' or 'no' (got '${outcomeStr}')`);
    process.exit(1);
  }
  const outcome = outcomeStr === 'yes';

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const dep = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, `../../shared/src/deployments/${chainId}.json`),
      'utf8',
    ),
  );

  const [signer] = await ethers.getSigners();
  const oracle = await ethers.getContractAt('ResolutionOracle', dep.contracts.ResolutionOracle);
  const owner = await oracle.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error(`✗ Signer ${signer.address} is not the oracle owner.`);
    console.error(`  Oracle owner: ${owner}`);
    console.error(`  Set the matching PRIVATE_KEY in packages/contracts/.env and retry.`);
    process.exit(1);
  }

  const market = await ethers.getContractAt('ForecastMarket', marketAddr);
  const status = Number(await market.status());
  if (status !== 0) {
    const o = await market.outcome();
    console.error(`✗ Market is already resolved (outcome: ${o ? 'YES' : 'NO'}).`);
    process.exit(1);
  }

  console.log(`→ Resolving ${marketAddr} as ${outcome ? 'YES' : 'NO'} on ${network.name}...`);
  const tx = await oracle.resolve(marketAddr, outcome, { gasLimit: 300_000 });
  console.log(`  tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`  status: ${receipt!.status === 1 ? 'OK' : 'FAILED'}  gas: ${receipt!.gasUsed}`);

  const finalStatus = Number(await market.status());
  const finalOutcome = await market.outcome();
  console.log(`✓ market.status() = ${finalStatus}, outcome = ${finalOutcome ? 'YES' : 'NO'}`);
  if (chainId === 11155111) {
    console.log(`  https://sepolia.etherscan.io/tx/${tx.hash}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
