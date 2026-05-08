'use client';

import { useCallback, useEffect, useState } from 'react';
import { JsonRpcProvider, isAddress } from 'ethers';
import { useAuth } from './use-auth';
import { getContract } from '@/lib/contracts';
import { SUPPORTED_CHAINS } from '@prediqt/shared';
import type { Room } from '@prediqt/shared';
import { RoomType } from '@prediqt/shared';
import { toast } from '@/components/ui/toaster';

function decodeRoom(raw: any): Room {
  return {
    id: BigInt(raw.id), name: raw.name, description: raw.description,
    creator: raw.creator, roomType: Number(raw.roomType) as RoomType,
    createdAt: BigInt(raw.createdAt), memberCount: Number(raw.memberCount), exists: raw.exists,
  };
}

function readProvider() {
  const chainKey = (process.env.NEXT_PUBLIC_CHAIN as 'sepolia' | 'localhost') ?? 'sepolia';
  const chain = SUPPORTED_CHAINS[chainKey];
  const url = chainKey === 'sepolia'
    ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? chain.rpcUrl : chain.rpcUrl;
  return new JsonRpcProvider(url, chain.chainId);
}

export function usePublicRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const registry = getContract('RoomRegistry', readProvider());
      const ids: bigint[] = await registry.getPublicRoomIds();
      if (ids.length === 0) { setRooms([]); return; }
      const raws = await registry.getRoomsBatch([...ids]);
      setRooms(raws.map(decodeRoom));
    } catch (e: any) {
      setError(e?.message ?? 'load failed');
      console.error('[usePublicRooms]', e);
      toast({ title: 'Failed to load rooms', description: e?.shortMessage ?? e?.message, variant: 'error' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { rooms, loading, error, refresh };
}

export function useMyRooms() {
  const { signer, address } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!signer || !address) { setRooms([]); return; }
    try {
      setLoading(true);
      const registry = getContract('RoomRegistry', signer);
      const ids: bigint[] = await registry.getUserRooms(address);
      if (ids.length === 0) { setRooms([]); return; }
      const raws = await registry.getRoomsBatch([...ids]);
      setRooms(raws.map(decodeRoom));
    } finally { setLoading(false); }
  }, [signer, address]);
  useEffect(() => { refresh(); }, [refresh]);
  return { rooms, loading, refresh };
}

export function useRoom(id: bigint | null) {
  const { signer } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (id === null) return;
    try {
      setLoading(true);
      const runner = signer ?? readProvider();
      const registry = getContract('RoomRegistry', runner);
      const [raw, mems] = await Promise.all([registry.getRoom(id), registry.getMembers(id)]);
      setRoom(decodeRoom(raw));
      setMembers(mems);
    } finally { setLoading(false); }
  }, [id, signer]);
  useEffect(() => { refresh(); }, [refresh]);
  return { room, members, loading, refresh };
}

/** Auto-join a public room if the user isn't already a member. */
export function useAutoJoinPublicRoom(roomId: bigint | null) {
  const { signer, address } = useAuth();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!signer || !address || roomId === null || joined) return;
    let cancelled = false;
    (async () => {
      try {
        const registry = getContract('RoomRegistry', signer);
        const room = await registry.getRoom(roomId);
        if (Number(room.roomType) !== RoomType.Public) { setJoined(true); return; }
        const isMem = await registry.isMember(roomId, address);
        if (isMem) { setJoined(true); return; }
        // Auto-join
        setJoining(true);
        const tx = await registry.joinPublicRoom(roomId);
        await tx.wait();
        if (!cancelled) {
          setJoined(true);
          toast({ title: 'Joined room', variant: 'success' });
        }
      } catch (e: any) {
        // Might already be a member or other error — don't block
        console.error('[useAutoJoinPublicRoom]', e);
        if (!cancelled) setJoined(true);
      } finally { if (!cancelled) setJoining(false); }
    })();
    return () => { cancelled = true; };
  }, [signer, address, roomId, joined]);

  return { joined, joining };
}

export function useCreatePrivateRoom() {
  const { signer } = useAuth();
  const [busy, setBusy] = useState(false);
  const create = useCallback(
    async (name: string, description: string, invitees: string[]) => {
      if (!signer) throw new Error('Sign in first');
      const cleanInvitees = invitees.map((s) => s.trim()).filter((s) => s.length > 0).filter((s) => isAddress(s));
      setBusy(true);
      try {
        const registry = getContract('RoomRegistry', signer);
        const tx = await registry.createPrivateRoom(name, description, cleanInvitees);
        toast({ title: 'Creating room…', description: 'Submitted to Sepolia.' });
        const receipt = await tx.wait();
        const log = receipt?.logs.find((l: any) => {
          try { return registry.interface.parseLog(l)?.name === 'RoomCreated'; } catch { return false; }
        });
        let newId: bigint | null = null;
        if (log) {
          const parsed = registry.interface.parseLog(log);
          newId = BigInt(parsed!.args.roomId);
        }
        toast({ title: 'Room created', description: name, variant: 'success' });
        return { id: newId, txHash: receipt?.hash };
      } finally { setBusy(false); }
    }, [signer],
  );
  return { create, busy };
}
