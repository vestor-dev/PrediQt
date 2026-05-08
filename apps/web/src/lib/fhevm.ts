'use client';

/**
 * Zama FHEVM relayer SDK — used to encrypt user inputs and decrypt
 * handles the user has ACL for. Initialized lazily on first use.
 */
import { SUPPORTED_CHAINS } from '@prediqt/shared';

let _instance: any | null = null;
let _initPromise: Promise<any> | null = null;

export async function getFhevm() {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const chainKey =
      (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost') ?? 'sepolia';
    const chain = SUPPORTED_CHAINS[chainKey];
    const relayer = process.env.NEXT_PUBLIC_FHEVM_RELAYER ?? chain.fhevmRelayer;

    // Lazy import — the SDK ships ESM and bundles WASM.
    const sdk = await import('@zama-fhe/relayer-sdk/bundle');
    await sdk.initSDK();

    const config = {
      ...sdk.SepoliaConfig,
      network:
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? chain.rpcUrl,
      relayerUrl: relayer,
    };

    const instance = await sdk.createInstance(config);
    _instance = instance;
    return instance;
  })();

  return _initPromise;
}

/** Convenience helper — encrypt a single uint64 amount for `contract` from `user`. */
export async function encryptAmount64(
  contractAddress: string,
  userAddress: string,
  amount: bigint,
) {
  const fhevm = await getFhevm();
  const input = fhevm.createEncryptedInput(contractAddress, userAddress);
  input.add64(amount);
  return await input.encrypt();
}
