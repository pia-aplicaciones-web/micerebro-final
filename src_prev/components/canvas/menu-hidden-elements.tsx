'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import { GripVertical, EyeOff, Wrench, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ElementType } from '@/lib/types';

type Props = {
  addElement: (type: ElementType, props?: any) => Promise<string>;
  defaultOpen?: boolean;
};

// Lista completa de tipos activos (coincide con src/lib/types.ts)
const ALL_TYPES: ElementType[] = [
  'image', 'text', 'sticky', 'notepad', 'notepad-simple', 'container',
  'comment-bubble', 'todo', 'moodboard', 'yellow-notepad', 'datetime-widget',
  'habit-tracker', 'eisenhower-matrix', 'brain-dump', 'gratitude-journal',
  'sticker', 'locator', 'frame', 'connector', 'drawing',
];

// Tipos que ya tienen botón visible en menús principales/flotantes
const WITH_BUTTONS: ElementType[] = [
  'text', 'sticky', 'notepad', 'notepad-simple', 'yellow-notepad',
  'todo', 'moodboard', 'container', 'comment-bubble', 'habit-tracker',
  'gratitude-journal', 'brain-dump', 'eisenhower-matrix', 'datetime-widget',
  'sticker', 'locator',
];

// Elementos de sistema que normalmente se crean indirectamente
const SYSTEM_TYPES: ElementType[] = ['frame', 'connector', 'drawing'];

export default function HiddenElementsMenu({ addElement, defaultOpen = true }: Props) {
  const [pos, setPos] = useState({ x: 760, y: 60 });
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({
        x: Math.max(40, window.innerWidth / 2 + 140),
        y: Math.max(40, window.innerHeight / 2 - 200),
      });
    }
  }, []);

  const hiddenTypes = useMemo(
    () => ALL_TYPES.filter((t) => !WITH_BUTTONS.includes(t) && !SYSTEM_TYPES.includes(t)),
    []
  );

  if (!open) return null;

  return (
    <Rnd
      position={pos}
      size={{ width: 360, height: 'auto' }}
      bounds="window"
      dragHandleClassName="hidden-menu-drag"
      onDragStop={(_, d) => setPos({ x: d.x, y: d.y })}
      enableResizing={false}
      className="z-[60055]"
    >
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-3">
        <div className="hidden-menu-drag flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold">Elementos sin botón</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Cerrar menú ocultos"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
              <EyeOff className="w-4 h-4 text-slate-500" />
              <span>Auditables (sin botón visible)</span>
            </div>
            {hiddenTypes.length === 0 ? (
              <div className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg p-3">
                No hay tipos ocultos. Todos los elementos tienen botón activo.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {hiddenTypes.map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    onClick={() => addElement(type)}
                    className="justify-start gap-2 h-9 text-sm border-slate-200 text-slate-700 hover:border-slate-300"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
              <Wrench className="w-4 h-4 text-slate-500" />
              <span>Sistema / técnicos</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEM_TYPES.map((type) => (
                <Button
                  key={type}
                  variant="secondary"
                  disabled
                  className="justify-start gap-2 h-9 text-xs text-slate-500"
                >
                  {type}
                </Button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-start gap-1">
              <AlertCircle className="w-4 h-4 mt-px" />
              <span>Estos tipos se crean automáticamente (no habilitar manualmente).</span>
            </div>
          </div>
        </div>
      </div>
    </Rnd>
  );
}
