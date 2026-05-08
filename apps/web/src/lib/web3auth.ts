'use client';

/**
 * Web3Auth (no-modal) singleton — initialized once on the client.
 * We use the no-modal variant so we can render our own sign-in UI in the
 * design system instead of Web3Auth's generic modal.
 */
import { Web3AuthNoModal } from '@web3auth/no-modal';
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, WALLET_ADAPTERS } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { AuthAdapter } from '@web3auth/auth-adapter';
import { SUPPORTED_CHAINS } from '@prediqt/shared';

const CLIENT_ID = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? '';
const CHAIN_KEY =
  (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost' | undefined) ?? 'sepolia';

export type SocialProvider =
  | 'google'
  | 'apple'
  | 'twitter'
  | 'discord'
  | 'github'
  | 'facebook';

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  'google',
  'apple',
  'twitter',
  'discord',
  'github',
];

export function getActiveChain() {
  return SUPPORTED_CHAINS[CHAIN_KEY];
}

let _instance: Web3AuthNoModal | null = null;
let _initPromise: Promise<Web3AuthNoModal> | null = null;

export async function getWeb3Auth(): Promise<Web3AuthNoModal> {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;

  if (!CLIENT_ID) {
    throw new Error(
      'NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is not set. Get one at dashboard.web3auth.io',
    );
  }

  const chain = getActiveChain();
  const rpcOverride =
    CHAIN_KEY === 'sepolia'
      ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? chain.rpcUrl
      : chain.rpcUrl;

  _initPromise = (async () => {
    const privateKeyProvider = new EthereumPrivateKeyProvider({
      config: {
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: chain.chainIdHex,
          rpcTarget: rpcOverride,
          displayName: chain.name,
          blockExplorerUrl: chain.explorer,
          ticker: chain.nativeCurrency.symbol,
          tickerName: chain.nativeCurrency.name,
        },
      },
    });

    const w3a = new Web3AuthNoModal({
      clientId: CLIENT_ID,
      web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
      privateKeyProvider,
    });

    const authAdapter = new AuthAdapter({
      adapterSettings: {
        uxMode: 'popup',
        whiteLabel: {
          appName: 'Prediqt',
          appUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          logoLight: '/favicon.svg',
          logoDark: '/favicon.svg',
          defaultLanguage: 'en',
          mode: 'dark',
          theme: { primary: '#D9FF3C' },
        },
      },
    });
    w3a.configureAdapter(authAdapter);

    await w3a.init();
    _instance = w3a;
    return w3a;
  })();

  return _initPromise;
}

/** Connect via email passwordless */
export async function connectWithEmail(email: string) {
  const w3a = await getWeb3Auth();
  return w3a.connectTo(WALLET_ADAPTERS.AUTH, {
    loginProvider: 'email_passwordless',
    extraLoginOptions: { login_hint: email },
  });
}

/** Connect via a social provider (google, apple, twitter, etc.) */
export async function connectWithSocial(provider: SocialProvider) {
  const w3a = await getWeb3Auth();
  return w3a.connectTo(WALLET_ADAPTERS.AUTH, {
    loginProvider: provider,
  });
}

/** Pretty label for a social provider */
export function providerLabel(p: SocialProvider): string {
  return { google: 'Google', apple: 'Apple', twitter: 'X', discord: 'Discord', github: 'GitHub', facebook: 'Facebook' }[p];
}
