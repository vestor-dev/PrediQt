export type Address = `0x${string}`;

export enum RoomType {
  Public = 0,
  Private = 1,
}

export interface Room {
  id: bigint;
  name: string;
  description: string;
  creator: Address;
  roomType: RoomType;
  createdAt: bigint;
  memberCount: number;
  exists: boolean;
}

export interface DeploymentRecord {
  chainId: number;
  network: string;
  deployedAt: string;
  contracts: {
    PredqCredit?: Address;
    RoomRegistry?: Address;
    MarketFactory?: Address;
    ResolutionOracle?: Address;
    AgentRegistry?: Address;
    [key: string]: Address | undefined;
  };
}
