'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  NOTEBOOK_FONTS,
  NOTEBOOK_FONT_SIZES,
  type NotebookFontId,
  type NotebookFontSize,
} from '@/lib/notebook-typography';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
  const currentFont = NOTEBOOK_FONTS.find((f) => f.id === fontFamilyId) || NOTEBOOK_FONTS[0];

  const selectClass = cn(
    'h-6 rounded border px-0.5 text-[10px] leading-none outline-none',
    'focus-visible:ring-1 focus-visible:ring-offset-0',
    dark
      ? 'border-white/30 bg-black/40 text-white focus-visible:ring-white/40'
      : 'border-black/15 bg-white/80 text-gray-800 focus-visible:ring-black/20'
  );

  return (
    <div
      className={cn('flex items-center gap-0.5 shrink-0', className)}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        aria-label="Tamaño de letra"
        title="Tamaño de letra"
        className={cn(selectClass, 'w-[2.35rem]')}
        value={fontSize}
        onChange={(e) => onFontSizeChange(Number(e.target.value) as NotebookFontSize)}
      >
        {NOTEBOOK_FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`Tipografía: ${currentFont.label}`}
            aria-label="Tipografía"
            className={cn(
              'size-6 shrink-0 rounded border px-0 text-[11px] font-semibold leading-none',
              dark
                ? 'border-white/30 bg-black/40 text-white hover:bg-black/55'
                : 'border-black/15 bg-white/80 text-gray-800 hover:bg-white'
            )}
            style={{ fontFamily: currentFont.family }}
          >
            Aa
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[9rem]">
          {NOTEBOOK_FONTS.map((font) => (
            <DropdownMenuItem
              key={font.id}
              onClick={() => onFontFamilyChange(font.id)}
              className={cn(fontFamilyId === font.id && 'bg-accent')}
              style={{ fontFamily: font.family }}
            >
              {font.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
