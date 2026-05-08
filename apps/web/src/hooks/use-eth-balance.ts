'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatEther } from 'ethers';
import { useAuth } from './use-auth';

/**
 * Tracks the user's native ETH balance on the active network.
 * Polls every `pollMs` while there's an active signer (so the UI updates
 * once a faucet drop arrives).
 */
export function useEthBalance(pollMs = 6000) {
  const { provider, address } = useAuth();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!provider || !address) {
      setBalance(null);
      return;
    }
    try {
      setLoading(true);
      const bal = await provider.getBalance(address);
      setBalance(bal);
    } catch (e) {
      console.error('[useEthBalance]', e);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    refresh();
    if (!provider || !address) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [provider, address, pollMs, refresh]);

  return {
    balance,
    /** Formatted as "0.0123 ETH" */
    pretty: balance === null ? null : `${parseFloat(formatEther(balance)).toFixed(4)} ETH`,
    isZero: balance !== null && balance === 0n,
    /** Generous threshold — enough for several txs of gas headroom */
    isLow: balance !== null && balance < 5_000_000_000_000_000n, // 0.005 ETH
    refresh,
    loading,
  };
}
