/**
 * Server-only contract helpers. These read private keys from env and return
 * ethers Wallets / Contracts. Never imported from client components.
 */
import 'server-only';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { ABIS, getDeployment, SUPPORTED_CHAINS } from '@prediqt/shared';

export type AgentName = 'Quanta' | 'Hawk' | 'Doubt';

export const AGENT_NAMES: AgentName[] = ['Quanta', 'Hawk', 'Doubt'];

function getChainKey(): 'sepolia' | 'localhost' {
  return (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost') ?? 'sepolia';
}

export function getServerProvider(): JsonRpcProvider {
  const key = getChainKey();
  const chain = SUPPORTED_CHAINS[key];
  const url =
    key === 'sepolia'
      ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? chain.rpcUrl
      : chain.rpcUrl;
  return new JsonRpcProvider(url, chain.chainId);
}

function getDeploymentRecord() {
  const key = getChainKey();
  const chainId = SUPPORTED_CHAINS[key].chainId;
  const dep = getDeployment(chainId);
  if (!dep) throw new Error(`No deployment for chainId ${chainId}`);
  return dep;
}

export function getAddress(name: keyof typeof ABIS): string {
  const dep = getDeploymentRecord();
  const addr = dep.contracts[name];
  if (!addr) throw new Error(`No address for ${name} on chain ${dep.chainId}`);
  return addr;
}

export function readContract(name: keyof typeof ABIS, addrOverride?: string): Contract {
  const addr = addrOverride ?? getAddress(name);
  return new Contract(addr, ABIS[name] as any, getServerProvider());
}

export function getAgentWallet(name: AgentName): Wallet {
  const env = `AGENT_KEY_${name.toUpperCase()}`;
  const key = process.env[env];
  if (!key) throw new Error(`Missing ${env}`);
  return new Wallet(key, getServerProvider());
}

export function getDeployerWallet(): Wallet {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('Missing DEPLOYER_PRIVATE_KEY');
  return new Wallet(key, getServerProvider());
}
