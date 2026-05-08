#!/usr/bin/env node
/**
 * Pulls ABI JSON out of hardhat artifacts so the web app has a typed,
 * version-controlled snapshot to import.
 *
 * Run after `pnpm contracts:compile`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = join(__dirname, '../../contracts/artifacts/contracts');
const OUT = join(__dirname, '../src/abis');

const targets = ['PredqCredit', 'RoomRegistry', 'MarketFactory', 'ForecastMarket', 'ResolutionOracle', 'AgentRegistry'];

if (!existsSync(ARTIFACTS)) {
  console.error(
    `! No artifacts at ${ARTIFACTS}. Run 'pnpm contracts:compile' first.`,
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

for (const name of targets) {
  const artifactPath = join(ARTIFACTS, `${name}.sol`, `${name}.json`);
  if (!existsSync(artifactPath)) {
    console.error(`! Missing artifact: ${artifactPath}`);
    process.exit(1);
  }
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  const outPath = join(OUT, `${name}.json`);
  writeFileSync(outPath, JSON.stringify(abi, null, 2) + '\n');
  console.log(`✓ ${name} → ${outPath}`);
}
