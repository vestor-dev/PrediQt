'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { getContract, getActiveChainId } from '@/lib/contracts';
import { toast } from '@/components/ui/toaster';

type CreditStatus = 'idle' | 'loading' | 'decrypted' | 'error';

// ── Simple module-level state shared across all hook consumers ──
// PredqCredit balances are FHE-encrypted on-chain. Until we wire the Zama
// relayer's userDecrypt flow, we track the plaintext locally and persist it
// to localStorage so it survives refreshes. The on-chain balance is still
// the source of truth — this cache is only for display.
let _balance: bigint | null = null;
let _hasClaimed: boolean | null = null;
let _status: CreditStatus = 'idle';
let _initAddress: string | null = null;
const _subs = new Set<() => void>();

const SIGNUP_AMOUNT = 1_000_000_000n;

function _storageKey(address: string): string {
  return `prediqt:credit:${getActiveChainId()}:${address.toLowerCase()}`;
}
function _loadPersisted(address: string): bigint | null {
  try {
    const raw = localStorage.getItem(_storageKey(address));
    return raw === null ? null : BigInt(raw);
  } catch { return null; }
}
function _persist(address: string | null, balance: bigint | null) {
  if (!address || balance === null) return;
  try { localStorage.setItem(_storageKey(address), balance.toString()); } catch {}
}

function _fire() { _subs.forEach((fn) => fn()); }

function _set(b: bigint | null, c: boolean | null, s: CreditStatus) {
  _balance = b;
  _hasClaimed = c;
  _status = s;
  _persist(_initAddress, b);
  _fire();
}

export function creditDeduct(amount: bigint) {
  if (_balance !== null) {
    _balance -= amount;
    _persist(_initAddress, _balance);
    _fire();
  }
}
export function creditAdd(amount: bigint) {
  if (_balance !== null) {
    _balance += amount;
    _persist(_initAddress, _balance);
    _fire();
  }
}

export function useCredit() {
  const { signer, address, status: authStatus } = useAuth();

  // Force re-render when module state changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    _subs.add(cb);
    return () => { _subs.delete(cb); };
  }, []);

  // Fetch on signer/address change
  useEffect(() => {
    if (!signer || !address) {
      if (_status !== 'idle') _set(null, null, 'idle');
      _initAddress = null;
      return;
    }
    // Already fetched for this address
    if (_initAddress === address && _status === 'decrypted') return;

    _initAddress = address;
    _set(_balance, _hasClaimed, 'loading');

    const addr = address;
    (async () => {
      try {
        const credit = getContract('PredqCredit', signer);
        const claimed: boolean = await credit.hasClaimedSignup(addr);
        // Only update if address hasn't changed while we awaited
        if (_initAddress !== addr) return;

        // Prefer the persisted local balance (which reflects all deltas from
        // bets/claims/faucet during this user's session). Fall back to the
        // signup amount only on a fresh wallet.
        const persisted = _loadPersisted(addr);
        const balance = persisted !== null ? persisted : (claimed ? SIGNUP_AMOUNT : 0n);
        _set(balance, claimed, 'decrypted');
      } catch (e: any) {
        if (_initAddress !== addr) return;
        console.error('[useCredit] init failed', e);
        _set(null, null, 'error');
      }
    })();
  }, [signer, address]);

  const [busy, setBusy] = useState(false);

  const claimSignup = useCallback(async () => {
    if (!signer) throw new Error('Not connected');
    setBusy(true);
    try {
      const credit = getContract('PredqCredit', signer);
      const tx = await credit.claimSignupCredits();
      toast({ title: 'Mint pending', description: 'Encrypting 1,000 PREDQ…' });
      const receipt = await tx.wait();
      toast({
        title: '+1,000 PREDQ', description: 'Welcome.', variant: 'success',
        action: receipt?.hash ? { label: 'View tx', href: `https://sepolia.etherscan.io/tx/${receipt.hash}` } : undefined,
      });
      _set(SIGNUP_AMOUNT, true, 'decrypted');
    } catch (e: any) {
      toast({ title: 'Mint failed', description: e?.shortMessage ?? e?.message ?? 'unknown', variant: 'error' });
      throw e;
    } finally { setBusy(false); }
  }, [signer]);

  const claimFaucet = useCallback(async () => {
    if (!signer) throw new Error('Not connected');
    setBusy(true);
    try {
      const credit = getContract('PredqCredit', signer);
      const tx = await credit.claimFaucet();
      await tx.wait();
      toast({ title: '+100 PREDQ', variant: 'success' });
      creditAdd(100_000_000n);
    } catch (e: any) {
      toast({ title: 'Faucet failed', description: e?.shortMessage ?? e?.message ?? 'unknown', variant: 'error' });
    } finally { setBusy(false); }
  }, [signer]);

  return {
    hasClaimed: _hasClaimed,
    balance: _balance,
    status: _status,
    busy,
    claimSignup,
    claimFaucet,
    refresh: () => { _initAddress = null; },
    isReady: authStatus === 'authenticated',
  };
}
