'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Contract, JsonRpcProvider } from 'ethers';
import { useAuth } from './use-auth';
import { getContract, getContractAddress } from '@/lib/contracts';
import { ABIS, SUPPORTED_CHAINS } from '@prediqt/shared';
import { toast } from '@/components/ui/toaster';
import { creditDeduct, creditAdd } from './use-credit';

export interface MarketInfo {
  id: bigint;
  roomId: bigint;
  marketAddress: string;
  question: string;
  creator: string;
  resolveAt: bigint;
  createdAt: bigint;
  yesReserve: bigint;
  noReserve: bigint;
  totalDeposited: bigint;
  totalBettors: number;
  yesPrice: number;
  status: number;
  outcome: boolean;
}

function readProvider() {
  const chainKey = (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost') ?? 'sepolia';
  const chain = SUPPORTED_CHAINS[chainKey];
  const url = chainKey === 'sepolia'
    ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? chain.rpcUrl : chain.rpcUrl;
  return new JsonRpcProvider(url, chain.chainId);
}

function getMarketContract(addr: string, runner?: any) {
  return new Contract(addr, ABIS.ForecastMarket as any, runner ?? readProvider());
}

async function fetchMarketInfo(factory: Contract, id: bigint): Promise<MarketInfo | null> {
  try {
    const meta = await factory.getMarket(id);
    if (!meta.exists) return null;
    const mc = getMarketContract(meta.market);
    const info = await mc.info();
    return {
      id: BigInt(meta.id), roomId: BigInt(meta.roomId), marketAddress: meta.market,
      question: meta.question, creator: meta.creator,
      resolveAt: BigInt(meta.resolveAt), createdAt: BigInt(meta.createdAt),
      yesReserve: BigInt(info._yesReserve), noReserve: BigInt(info._noReserve),
      totalDeposited: BigInt(info._totalDeposited), totalBettors: Number(info._totalBettors),
      yesPrice: computePrice(BigInt(info._noReserve), BigInt(info._yesReserve)),
      status: Number(info._status), outcome: info._outcome,
    };
  } catch (e) { console.error(`[fetchMarketInfo] market ${id}`, e); return null; }
}

/** Compute YES price as a float (0-100) with decimal precision from reserves. */
function computePrice(noReserve: bigint, yesReserve: bigint): number {
  const total = Number(noReserve) + Number(yesReserve);
  if (total === 0) return 50;
  return (Number(noReserve) / total) * 100;
}

export function useRoomMarkets(roomId: bigint | null) {
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (roomId === null) return;
    try {
      setLoading(true);
      const factory = getContract('MarketFactory', readProvider());
      const ids: bigint[] = await factory.getRoomMarketIds(roomId);
      if (ids.length === 0) { setMarkets([]); return; }
      const results = await Promise.all(ids.map((id) => fetchMarketInfo(factory, id)));
      setMarkets(results.filter(Boolean) as MarketInfo[]);
    } catch (e) { console.error('[useRoomMarkets]', e); } finally { setLoading(false); }
  }, [roomId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { markets, loading, refresh };
}

export function useAllMarkets() {
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const factory = getContract('MarketFactory', readProvider());
      const ids: bigint[] = await factory.getAllMarketIds();
      if (ids.length === 0) { setMarkets([]); return; }
      const results = await Promise.all(ids.map((id) => fetchMarketInfo(factory, id)));
      setMarkets(results.filter(Boolean) as MarketInfo[]);
    } catch (e) { console.error('[useAllMarkets]', e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { markets, loading, refresh };
}

/** Returns all markets where the current user has placed a bet. */
export function useMyBets() {
  const { signer, address } = useAuth();
  const { markets, loading: mktsLoading } = useAllMarkets();
  const [myBets, setMyBets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mktsLoading || !address || markets.length === 0) {
      if (!mktsLoading) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const runner = signer ?? readProvider();
        const checks = await Promise.all(
          markets.map(async (m) => {
            try {
              const mc = getMarketContract(m.marketAddress, runner);
              const has: boolean = await mc.hasBet(address);
              return has ? m : null;
            } catch { return null; }
          }),
        );
        if (!cancelled) setMyBets(checks.filter(Boolean) as MarketInfo[]);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [markets, mktsLoading, address, signer]);

  return { myBets, loading };
}

export function useMarket(marketAddress: string | null) {
  const { signer } = useAuth();
  const [market, setMarket] = useState<MarketInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userYes, setUserYes] = useState<bigint>(0n);
  const [userNo, setUserNo] = useState<bigint>(0n);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const refresh = useCallback(async () => {
    if (!marketAddress) return;
    try {
      setLoading(true);
      const runner = signer ?? readProvider();
      const factory = getContract('MarketFactory', runner);
      const mc = getMarketContract(marketAddress, runner);
      const info = await mc.info();
      const id = BigInt(info._marketId);
      const meta = await factory.getMarket(id);
      setMarket({
        id, roomId: BigInt(meta.roomId), marketAddress,
        question: meta.question, creator: meta.creator,
        resolveAt: BigInt(meta.resolveAt), createdAt: BigInt(meta.createdAt),
        yesReserve: BigInt(info._yesReserve), noReserve: BigInt(info._noReserve),
        totalDeposited: BigInt(info._totalDeposited), totalBettors: Number(info._totalBettors),
        yesPrice: computePrice(BigInt(info._noReserve), BigInt(info._yesReserve)),
        status: Number(info._status), outcome: info._outcome,
      });
      if (signer) {
        const addr = await signer.getAddress();
        const [yes, no, claimed] = await Promise.all([
          mc.yesShares(addr),
          mc.noShares(addr),
          mc.hasClaimed(addr),
        ]);
        setUserYes(BigInt(yes));
        setUserNo(BigInt(no));
        setHasClaimed(Boolean(claimed));
      }
    } catch (e) { console.error('[useMarket]', e); } finally { setLoading(false); }
  }, [marketAddress, signer]);
  useEffect(() => { refresh(); }, [refresh]);
  return { market, userYes, userNo, hasClaimed, loading, refresh };
}

export function useCreateMarket() {
  const { signer } = useAuth();
  const [busy, setBusy] = useState(false);
  const create = useCallback(
    async (roomId: bigint, question: string, resolveAt: number) => {
      if (!signer) throw new Error('Sign in first');
      setBusy(true);
      try {
        const factory = getContract('MarketFactory', signer);
        // createMarket deploys a contract — needs high gas limit.
        // Explicit limit avoids estimation failures with Web3Auth wallets.
        const tx = await factory.createMarket(
          roomId, question, BigInt(resolveAt),
          { gasLimit: 2_000_000 },
        );
        toast({ title: 'Creating market…', description: 'Deploying contract on Sepolia. This takes ~15s.' });
        const receipt = await tx.wait();
        const log = receipt?.logs.find((l: any) => {
          try { return factory.interface.parseLog(l)?.name === 'MarketCreated'; } catch { return false; }
        });
        let newId: bigint | null = null;
        let marketAddr: string | null = null;
        if (log) {
          const parsed = factory.interface.parseLog(log);
          newId = BigInt(parsed!.args.marketId);
          marketAddr = parsed!.args.market;
        }
        toast({ title: 'Market live', description: question.slice(0, 60), variant: 'success' });
        return { id: newId, address: marketAddr, txHash: receipt?.hash };
      } catch (e: any) {
        console.error('[useCreateMarket]', e);
        toast({
          title: 'Market creation failed',
          description: e?.shortMessage ?? e?.reason ?? e?.message ?? 'Unknown error',
          variant: 'error',
        });
        throw e;
      } finally { setBusy(false); }
    }, [signer],
  );
  return { create, busy };
}

export function usePlaceBet() {
  const { signer } = useAuth();
  const [busy, setBusy] = useState(false);
  const placeBet = useCallback(
    async (marketAddress: string, betYes: boolean, amount: bigint) => {
      if (!signer) throw new Error('Sign in first');
      setBusy(true);
      try {
        const mc = getMarketContract(marketAddress, signer);
        // FHE _move during bet is gas-heavy on real Sepolia.
        const tx = await mc.bet(betYes, amount, { gasLimit: 1_500_000 });
        const side = betYes ? 'YES' : 'NO';
        const display = `${Number(amount) / 1_000_000} PREDQ`;
        toast({ title: `Betting ${side}…`, description: display });
        const receipt = await tx.wait();
        // Deduct from the shared credit store
        creditDeduct(amount);
        toast({
          title: `Bet placed — ${side}`, description: display, variant: 'success',
          action: receipt?.hash
            ? { label: 'View tx', href: `https://sepolia.etherscan.io/tx/${receipt.hash}` } : undefined,
        });
        return receipt;
      } catch (e: any) {
        toast({ title: 'Bet failed', description: e?.shortMessage ?? e?.message ?? 'unknown', variant: 'error' });
        throw e;
      } finally { setBusy(false); }
    }, [signer],
  );
  return { placeBet, busy };
}

export function useResolveMarket() {
  const { signer } = useAuth();
  const [busy, setBusy] = useState(false);
  const resolve = useCallback(
    async (marketAddress: string, outcome: boolean) => {
      if (!signer) throw new Error('Sign in first');
      setBusy(true);
      try {
        // Resolution is pushed by the ResolutionOracle, not the market directly.
        // Only the oracle's owner can call this (gated on-chain).
        const oracle = getContract('ResolutionOracle', signer);
        const tx = await oracle.resolve(marketAddress, outcome, { gasLimit: 200_000 });
        toast({ title: 'Resolving…', description: `Outcome: ${outcome ? 'YES' : 'NO'}` });
        const receipt = await tx.wait();
        toast({ title: 'Market resolved', description: outcome ? 'YES wins' : 'NO wins', variant: 'success' });
        return receipt;
      } catch (e: any) {
        toast({ title: 'Resolution failed', description: e?.shortMessage ?? e?.message ?? 'unknown', variant: 'error' });
        throw e;
      } finally { setBusy(false); }
    }, [signer],
  );
  return { resolve, busy };
}

/** Returns the oracle's current owner — the only address allowed to resolve markets. */
let _cachedOracleOwner: string | null = null;
export function useOracleOwner() {
  const [owner, setOwner] = useState<string | null>(_cachedOracleOwner);
  const fetched = useRef(false);

  useEffect(() => {
    if (_cachedOracleOwner || fetched.current) return;
    fetched.current = true;
    (async () => {
      try {
        const oracle = getContract('ResolutionOracle', readProvider());
        const o: string = await oracle.owner();
        _cachedOracleOwner = o;
        setOwner(o);
      } catch (e) {
        console.error('[useOracleOwner]', e);
      }
    })();
  }, []);

  return owner;
}

export function useClaimPayout() {
  const { signer } = useAuth();
  const [busy, setBusy] = useState(false);
  const claim = useCallback(
    async (marketAddress: string) => {
      if (!signer) throw new Error('Sign in first');
      setBusy(true);
      try {
        const mc = getMarketContract(marketAddress, signer);
        // FHE _move inside the credit contract is gas-heavy on Sepolia (~340k).
        // Web3Auth wallets often estimate too low — set explicitly.
        const tx = await mc.claimPayout({ gasLimit: 1_500_000 });
        toast({ title: 'Claiming payout…' });
        const receipt = await tx.wait();

        // Parse the PayoutClaimed event so we can credit the local balance and
        // give the user a meaningful toast (their actual winnings, not just "ok").
        let payout: bigint = 0n;
        for (const log of receipt?.logs ?? []) {
          try {
            const parsed = mc.interface.parseLog(log);
            if (parsed?.name === 'PayoutClaimed') {
              payout = BigInt(parsed.args.payout);
              break;
            }
          } catch { /* not our event */ }
        }

        if (payout > 0n) {
          creditAdd(payout);
          const display = `${(Number(payout) / 1_000_000).toFixed(2)} PREDQ`;
          toast({ title: 'Payout claimed', description: `+${display}`, variant: 'success' });
        } else {
          toast({
            title: 'No payout',
            description: 'Your side did not win — bets are non-refundable.',
            variant: 'error',
          });
        }
        return { receipt, payout };
      } catch (e: any) {
        toast({ title: 'Claim failed', description: e?.shortMessage ?? e?.message ?? 'unknown', variant: 'error' });
        throw e;
      } finally { setBusy(false); }
    }, [signer],
  );
  return { claim, busy };
}
