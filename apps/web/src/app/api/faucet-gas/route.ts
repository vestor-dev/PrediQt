import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, isAddress, parseEther } from 'ethers';
import { SUPPORTED_CHAINS } from '@prediqt/shared';

/**
 * POST /api/faucet-gas
 * Drips a small amount of Sepolia ETH to a new user's wallet so they can
 * pay gas for the PREDQ signup mint and room creation.
 *
 * Body: { address: "0x…" }
 *
 * The deployer wallet funds this — it's a testnet convenience faucet.
 * One drip per address (tracked in-memory; resets on server restart — fine
 * for a testnet demo). Sends 0.005 ETH (~enough for 15+ txs).
 */

const DRIP_AMOUNT = parseEther('0.05');
const dripped = new Set<string>();

function getProvider() {
  const chainKey =
    (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost') ?? 'sepolia';
  const chain = SUPPORTED_CHAINS[chainKey];
  const rpc =
    chainKey === 'sepolia'
      ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? chain.rpcUrl
      : chain.rpcUrl;
  return new JsonRpcProvider(rpc, chain.chainId);
}

function getDeployerWallet() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  return new Wallet(key, getProvider());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body?.address as string;

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'invalid address' }, { status: 400 });
    }

    const normalized = address.toLowerCase();

    if (dripped.has(normalized)) {
      return NextResponse.json({ status: 'already_dripped', amount: '0.005' });
    }

    const wallet = getDeployerWallet();
    const provider = wallet.provider!;

    // Check if they already have enough ETH (>= 0.002)
    const existing = await provider.getBalance(address);
    if (existing >= parseEther('0.02')) {
      dripped.add(normalized);
      return NextResponse.json({ status: 'sufficient', amount: '0' });
    }

    // Check deployer balance
    const deployerBal = await provider.getBalance(wallet.address);
    if (deployerBal < DRIP_AMOUNT + parseEther('0.001')) {
      return NextResponse.json(
        { error: 'faucet depleted — deployer wallet needs more Sepolia ETH' },
        { status: 503 },
      );
    }

    const tx = await wallet.sendTransaction({
      to: address,
      value: DRIP_AMOUNT,
    });

    dripped.add(normalized);

    // Don't await confirmation — return the hash immediately so the UI
    // can poll the balance while the tx propagates.
    return NextResponse.json({
      status: 'sent',
      amount: '0.005',
      txHash: tx.hash,
    });
  } catch (e: any) {
    console.error('[faucet-gas]', e);
    return NextResponse.json(
      { error: e?.shortMessage ?? e?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}
