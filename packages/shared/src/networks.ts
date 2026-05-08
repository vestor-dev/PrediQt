export const SUPPORTED_CHAINS = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Sepolia',
    rpcUrl: 'https://eth-sepolia.public.blastapi.io',
    explorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    fhevmRelayer: 'https://relayer.testnet.zama.cloud',
  },
  localhost: {
    chainId: 31337,
    chainIdHex: '0x7a69',
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: '',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    fhevmRelayer: '',
  },
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

export const DEFAULT_CHAIN: ChainKey = 'sepolia';
