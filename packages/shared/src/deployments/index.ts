import type { DeploymentRecord } from '../types';
import sepolia from './11155111.json';
import localhost from './31337.json';

// Both deployment records exist as JSON files. If a network hasn't been
// deployed yet, its `contracts` map is empty.
export const DEPLOYMENTS: Record<number, DeploymentRecord> = {
  11155111: sepolia as DeploymentRecord,
  31337: localhost as DeploymentRecord,
};

export function getDeployment(chainId: number): DeploymentRecord | null {
  const dep = DEPLOYMENTS[chainId];
  if (!dep || Object.keys(dep.contracts).length === 0) return null;
  return dep;
}
