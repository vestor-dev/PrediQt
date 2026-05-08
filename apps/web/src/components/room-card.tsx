'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Globe2, Users, ArrowUpRight } from 'lucide-react';
import type { Room } from '@prediqt/shared';
import { RoomType } from '@prediqt/shared';
import { cn } from '@/lib/utils';

export function RoomCard({ room, index = 0 }: { room: Room; index?: number }) {
  const isPrivate = room.roomType === RoomType.Private;
  const Icon = isPrivate ? Lock : Globe2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/rooms/${room.id}`}
        className={cn(
          'group relative block rounded-2xl overflow-hidden',
          'bg-canvas-elevated border border-line',
          'shadow-card transition-all duration-300 ease-out',
          'hover:shadow-card-hover hover:border-line-strong hover:-translate-y-0.5',
          'p-5 ring-focus',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 label mb-2.5">
              <Icon className="h-3 w-3" />
              {isPrivate ? 'private' : 'public'}
            </div>
            <h3 className="font-sans font-medium text-[15px] text-ink group-hover:text-volt transition-colors duration-300 mb-1.5">
              {room.name}
            </h3>
            {room.description && (
              <p className="text-ink-muted text-sm leading-relaxed line-clamp-2 mb-3">
                {room.description}
              </p>
            )}
            <div className="flex items-center gap-2 label">
              <Users className="h-3 w-3" />
              {room.memberCount.toString()}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-ink-ghost group-hover:text-volt transition-colors shrink-0 mt-1" />
        </div>
      </Link>
    </motion.div>
  );
}
