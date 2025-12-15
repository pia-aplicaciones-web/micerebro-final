'use client';

import React from 'react';
import type { CommonElementProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

export default function LocatorElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, onEditElement } = props;

  const label =
    typeof content === 'object' && content !== null && 'label' in content
      ? (content as any).label || 'Localizador'
      : 'Localizador';

  const handleDoubleClick = () => {
    const newName = prompt('Nombre del localizador:', label);
    if (newName && newName.trim()) {
      onUpdate(id, { content: { label: newName.trim() } as any });
    }
  };

  return (
    <div
      className={cn(
        'relative w-full h-full flex flex-col items-center justify-center gap-2',
        'bg-transparent cursor-grab select-none',
        isSelected && 'ring-2 ring-black/60 rounded-lg'
      )}
      onDoubleClick={handleDoubleClick}
      onClick={() => onEditElement(id)}
      style={{ padding: '8px' }}
    >
      <div className="absolute top-1 left-1 drag-handle bg-black/70 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
        <MapPin className="w-3 h-3 text-white" />
        <span>Arrastra</span>
      </div>
      <MapPin className="w-8 h-8 text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
      <div className="text-xs font-semibold text-black text-center px-2 break-words bg-white/80 rounded-md shadow-sm">
        {label}
      </div>
    </div>
  );
}
