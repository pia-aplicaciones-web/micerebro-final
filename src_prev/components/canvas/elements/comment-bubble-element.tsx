// @ts-nocheck
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CommonElementProps, CommentContent, CanvasElementProperties } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Minus, Palette, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type BubbleColor = 'yellow' | 'white';

const COLOR_MAP: Record<BubbleColor, { bg: string; border: string }> = {
  yellow: { bg: '#fff9c4', border: '#f1e69c' },
  white: { bg: '#ffffff', border: '#e5e7eb' },
};

export default function CommentBubbleElement({
  id,
  content,
  properties,
  isSelected,
  minimized,
  onUpdate,
  onSelectElement,
  deleteElement,
}: CommonElementProps) {
  const commentContent: CommentContent =
    typeof content === 'object' && content !== null ? (content as CommentContent) : { text: '' };

  const safeProps = (typeof properties === 'object' && properties !== null ? properties : {}) as CanvasElementProperties;
  const initialBg = (safeProps.backgroundColor as string) || COLOR_MAP.yellow.bg;
  const initialColorKey: BubbleColor = initialBg === COLOR_MAP.white.bg ? 'white' : 'yellow';

  const [text, setText] = useState(commentContent.text || '');
  const [color, setColor] = useState<BubbleColor>(initialColorKey);

  useEffect(() => {
    setText(commentContent.text || '');
  }, [commentContent.text]);

  const currentColors = useMemo(() => COLOR_MAP[color], [color]);

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      onUpdate(id, {
        content: { ...commentContent, text: value },
      });
    },
    [commentContent, id, onUpdate]
  );

  const handleColorChange = useCallback(
    (newColor: BubbleColor) => {
      setColor(newColor);
      onUpdate(id, {
        properties: {
          ...safeProps,
          backgroundColor: COLOR_MAP[newColor].bg,
          borderColor: COLOR_MAP[newColor].border,
        },
      });
    },
    [id, onUpdate, safeProps]
  );

  const toggleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const isMin = !!minimized;
      if (isMin) {
        const restoredSize = safeProps.originalSize && typeof safeProps.originalSize === 'object'
          ? safeProps.originalSize
          : { width: 240, height: 140 };
        onUpdate(id, {
          minimized: false,
          properties: {
            ...safeProps,
            size: restoredSize,
          },
        });
        onSelectElement(id, false);
      } else {
        const currentSize = safeProps.size && typeof safeProps.size === 'object'
          ? safeProps.size
          : { width: 240, height: 140 };
        onUpdate(id, {
          minimized: true,
          properties: {
            ...safeProps,
            originalSize: currentSize,
            size: { width: 52, height: 52 },
          },
        });
      }
    },
    [id, minimized, onSelectElement, onUpdate, safeProps]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      deleteElement(id);
    },
    [deleteElement, id]
  );

  if (minimized) {
    return (
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onUpdate(id, { minimized: false });
          onSelectElement(id, false);
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm"
          style={{ backgroundColor: currentColors.bg, borderColor: currentColors.border }}
        >
          <MapPin className="w-5 h-5 text-slate-600" />
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'w-full h-full shadow-lg border',
        'flex flex-col',
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      )}
      style={{
        backgroundColor: currentColors.bg,
        borderColor: currentColors.border,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      <div
        className="flex items-center justify-between px-2 py-1 drag-handle cursor-move border-b"
        style={{ borderColor: currentColors.border }}
      >
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <MapPin className="w-4 h-4" />
          <span>Burbuja</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            <Palette className="w-4 h-4 text-slate-600" />
            {(['yellow', 'white'] as BubbleColor[]).map((option) => (
              <button
                key={option}
                className={cn(
                  'w-4 h-4 rounded-sm border',
                  option === color ? 'ring-2 ring-offset-1 ring-primary' : ''
                )}
                style={{
                  backgroundColor: COLOR_MAP[option].bg,
                  borderColor: COLOR_MAP[option].border,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorChange(option);
                }}
                title={option === 'yellow' ? 'Amarillo pastel' : 'Blanco'}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={toggleMinimize}
            title="Minimizar"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={handleDelete} title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 flex-1">
        <textarea
          className="w-full h-full bg-transparent outline-none resize-none text-slate-900"
          style={{ fontSize: '11px', lineHeight: '1.4' }}
          value={text}
          placeholder="Escribe tu comentario..."
          onChange={(e) => handleTextChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </Card>
  );
}
