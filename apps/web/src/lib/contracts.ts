'use client';

import { Contract, JsonRpcSigner, BrowserProvider, type Provider } from 'ethers';
import { ABIS, getDeployment, SUPPORTED_CHAINS, type DeploymentRecord } from '@prediqt/shared';

export type ContractName = 'PredqCredit' | 'RoomRegistry' | 'MarketFactory' | 'ForecastMarket' | 'ResolutionOracle' | 'AgentRegistry';

export function getActiveChainKey(): 'sepolia' | 'localhost' {
  return (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost') ?? 'sepolia';
}

export function getActiveChainId(): number {
  return SUPPORTED_CHAINS[getActiveChainKey()].chainId;
}

export function getDeploymentOrThrow(): DeploymentRecord {
  const chainId = getActiveChainId();
  const dep = getDeployment(chainId);
  if (!dep) {
    throw new Error(
      `No deployment record for chainId ${chainId}. Run 'pnpm contracts:deploy:sepolia' first.`,
    );
  }
  return dep;
}

export function getContractAddress(name: ContractName): string {
  const dep = getDeploymentOrThrow();
  const addr = dep.contracts[name];
  if (!addr) {
    throw new Error(`No address for ${name} on chainId ${dep.chainId}`);
  }
  return addr;
}

export function getContract(
  name: ContractName,
  runner: Provider | JsonRpcSigner,
): Contract {
  return new Contract(getContractAddress(name), ABIS[name] as any, runner as any);
}

/** Create a BrowserProvider from a Web3Auth provider object. */
export function makeBrowserProvider(rawProvider: any): BrowserProvider {
  return new BrowserProvider(rawProvider);
}
