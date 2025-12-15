'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function randomColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

export default function ColorPaletteGeneratorElement({
  id,
  content,
  isSelected,
  onSelectElement,
  onUpdate,
}: CommonElementProps) {
  const initialColors = useMemo(() => {
    const colors = (content as any)?.colors;
    return Array.isArray(colors) && colors.length > 0 ? colors : Array.from({ length: 5 }, randomColor);
  }, [content]);

  const [colors, setColors] = useState<string[]>(initialColors);

  const regenerate = useCallback(() => {
    const next = Array.from({ length: 5 }, randomColor);
    setColors(next);
    onUpdate(id, { content: { colors: next } as any });
  }, [id, onUpdate]);

  return (
    <Card
      className={cn(
        'w-full h-full p-3 flex flex-col gap-3 shadow-lg border',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span className="font-semibold">Paleta de Colores</span>
        <Button size="sm" onClick={regenerate} onMouseDown={(e) => e.stopPropagation()}>
          Generar
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2 flex-1">
        {colors.map((c, idx) => (
          <div key={`${c}-${idx}`} className="flex flex-col items-center gap-1">
            <div
              className="w-full h-12 rounded border shadow-sm"
              style={{ backgroundColor: c }}
              title={c}
            />
            <span className="text-[11px] font-mono text-slate-700">{c.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}