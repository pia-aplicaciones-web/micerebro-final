'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  NOTEBOOK_FONTS,
  NOTEBOOK_FONT_SIZES,
  type NotebookFontId,
  type NotebookFontSize,
} from '@/lib/notebook-typography';

type Props = {
  fontSize: NotebookFontSize;
  fontFamilyId: NotebookFontId;
  onFontSizeChange: (size: NotebookFontSize) => void;
  onFontFamilyChange: (id: NotebookFontId) => void;
  /** Cabecera oscura (p. ej. Block) */
  dark?: boolean;
  className?: string;
};

export function NotebookTypographyControls({
  fontSize,
  fontFamilyId,
  onFontSizeChange,
  onFontFamilyChange,
  dark = false,
  className,
}: Props) {
  const selectClass = cn(
    'h-6 max-w-[7.5rem] rounded border px-1 text-[10px] leading-none outline-none',
    'focus-visible:ring-1 focus-visible:ring-offset-0',
    dark
      ? 'border-white/30 bg-black/40 text-white focus-visible:ring-white/40'
      : 'border-black/15 bg-white/80 text-gray-800 focus-visible:ring-black/20'
  );

  return (
    <div
      className={cn('flex items-center gap-1 shrink-0', className)}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        aria-label="Tamaño de letra"
        title="Tamaño de letra"
        className={cn(selectClass, 'w-[3.25rem]')}
        value={fontSize}
        onChange={(e) => onFontSizeChange(Number(e.target.value) as NotebookFontSize)}
      >
        {NOTEBOOK_FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <select
        aria-label="Tipografía"
        title="Tipografía"
        className={cn(selectClass, 'min-w-[5.5rem]')}
        value={fontFamilyId}
        onChange={(e) => onFontFamilyChange(e.target.value as NotebookFontId)}
        style={{ fontFamily: NOTEBOOK_FONTS.find((f) => f.id === fontFamilyId)?.family }}
      >
        {NOTEBOOK_FONTS.map((font) => (
          <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
            {font.label}
          </option>
        ))}
      </select>
    </div>
  );
}
