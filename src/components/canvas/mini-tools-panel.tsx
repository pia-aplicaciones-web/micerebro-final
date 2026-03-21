'use client';

import React, { useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import {
  Type,
  Underline,
  Highlighter,
  X,
  GripVertical,
  ChevronRight,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const MENU_BG = '#555556';

const UNDERLINE_COLORS = [
  '#14b8a6', '#f97316', '#84cc16', '#eab308', '#f59e0b', '#3b82f6', '#6b9508', '#5cc4c0',
  '#e0d40e', '#010974', '#02d2d0', '#95060c', '#720abb', '#ab6dd6', '#f4f647', '#016d77',
];

const HIGHLIGHT_COLORS = ['#fef08a', '#fde68a', '#fed7aa', '#d1fae5', '#a5f3fc', '#e9d5ff', '#ddd6fe', '#c7d2fe'];

const TEXT_COLORS = [
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#84cc16', label: 'Verde lima' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#1f2937', label: 'Gris oscuro' },
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#28c4d8', label: 'Calipso' },
  { hex: '#e91e8c', label: 'Fucsia' },
  { hex: '#a855f7', label: 'Morado' },
];

function applyStyleToSelection(apply: (range: Range, selection: Selection) => void): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  apply(range, sel);
  const el = document.activeElement as HTMLElement;
  if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyColoredUnderline(color: string) {
  applyStyleToSelection((range, sel) => {
    if (sel.isCollapsed) return;
    const span = document.createElement('span');
    span.style.textDecoration = 'underline';
    span.style.textDecorationColor = color;
    span.style.textDecorationThickness = '2.5px';
    span.appendChild(range.extractContents());
    range.insertNode(span);
  });
}

function applyHighlight(color: string) {
  applyStyleToSelection((range, sel) => {
    if (sel.isCollapsed) return;
    const span = document.createElement('span');
    span.style.backgroundColor = color;
    span.appendChild(range.extractContents());
    range.insertNode(span);
  });
}

function applyTextColor(hex: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style.color = hex;
  if (!sel.isCollapsed) {
    try {
      span.appendChild(range.extractContents());
    } catch {
      return;
    }
    range.insertNode(span);
  } else {
    const el = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : (range.commonAncestorContainer.parentElement as HTMLElement);
    if (el?.isContentEditable) {
      while (el.firstChild) span.appendChild(el.firstChild);
      el.appendChild(span);
      const r = document.createRange();
      r.selectNodeContents(span);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }
  (document.activeElement as HTMLElement)?.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyFontSize(size: string) {
  document.execCommand('fontSize', false, '4');
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const spans = (container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement!)
      ?.querySelectorAll?.('font[size="4"]') ?? [];
    spans.forEach((s) => {
      (s as HTMLElement).style.fontSize = size;
      (s as HTMLElement).removeAttribute('size');
    });
  }
  (document.activeElement as HTMLElement)?.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyTitle() {
  applyStyleToSelection((range, sel) => {
    const div = document.createElement('div');
    div.style.fontSize = '22px';
    div.style.fontWeight = '600';
    div.style.textAlign = 'center';
    div.style.display = 'block';
    div.textContent = range.toString().trim() || 'Título';
    range.deleteContents();
    range.insertNode(div);
  });
}

function applySubtitle() {
  applyStyleToSelection((range, sel) => {
    const div = document.createElement('div');
    div.style.fontSize = '14px';
    div.style.fontWeight = '600';
    div.style.textTransform = 'uppercase';
    div.style.color = '#374151';
    div.style.marginTop = '8px';
    div.style.marginBottom = '4px';
    div.style.borderBottom = '1px solid #D1D5DB';
    div.textContent = range.toString().trim() || 'Subtítulo';
    range.deleteContents();
    range.insertNode(div);
  });
}

interface MiniToolsPanelProps {
  onClose: () => void;
}

export default function MiniToolsPanel({ onClose }: MiniToolsPanelProps) {
  const [popover, setPopover] = useState<'font' | 'underline' | 'highlight' | 'color' | null>(null);
  const highlightSelRef = useRef<Range | null>(null);

  const btnClass = 'flex items-center justify-center w-9 h-9 rounded hover:bg-white/15 text-white transition-colors';
  const gridClass = 'grid grid-cols-4 gap-1.5';

  return (
    <Rnd
      default={{ x: 72, y: 100, width: 280, height: 220 }}
      minWidth={260}
      minHeight={180}
      bounds="window"
      dragHandleClassName="drag-panel-mini"
      className="z-[10004]"
    >
      <div
        className="flex flex-col rounded-lg shadow-xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: MENU_BG }}
      >
        <div className="drag-panel-mini cursor-grab active:cursor-grabbing flex items-center justify-between px-2 py-1.5 border-b border-white/10">
          <GripVertical className="size-4 text-white/70" />
          <span className="text-xs font-medium text-white/90">ToolsSidebar</span>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/15 rounded text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-2 flex flex-wrap gap-2 items-center">
          {/* Tamaño fuente + Título/Subtítulo */}
          <Popover open={popover === 'font'} onOpenChange={(o) => setPopover(o ? 'font' : null)}>
            <PopoverTrigger asChild>
              <button className={btnClass} onMouseDown={(e) => e.preventDefault()}>
                <Type className="size-4" />
                <ChevronRight className="size-3 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-40 p-2" onMouseDown={(e) => e.preventDefault()}>
              <div className="space-y-0.5">
                {['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px'].map((s) => (
                  <button key={s} className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => { applyFontSize(s); setPopover(null); }}>
                    {s}
                  </button>
                ))}
                <hr className="my-1" />
                <button className="w-full text-left px-2 py-1 text-sm font-semibold hover:bg-gray-100 rounded" onClick={() => { applyTitle(); setPopover(null); }}>
                  Título
                </button>
                <button className="w-full text-left px-2 py-1 text-sm font-semibold hover:bg-gray-100 rounded" onClick={() => { applySubtitle(); setPopover(null); }}>
                  Subtítulo
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Subrayar */}
          <Popover open={popover === 'underline'} onOpenChange={(o) => setPopover(o ? 'underline' : null)}>
            <PopoverTrigger asChild>
              <button className={btnClass} onMouseDown={(e) => e.preventDefault()}>
                <Underline className="size-4" />
                <ChevronRight className="size-3 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="p-2" onMouseDown={(e) => e.preventDefault()}>
              <div className={gridClass}>
                {UNDERLINE_COLORS.map((c) => (
                  <button key={c} className="w-7 h-7 rounded border hover:scale-110" style={{ backgroundColor: c }} onMouseDown={(e) => { e.preventDefault(); applyColoredUnderline(c); setPopover(null); }} />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Destacar */}
          <Popover
            open={popover === 'highlight'}
            onOpenChange={(o) => {
              if (o) {
                const sel = window.getSelection();
                if (sel?.rangeCount && !sel.isCollapsed) highlightSelRef.current = sel.getRangeAt(0).cloneRange();
                setPopover('highlight');
              } else setPopover(null);
            }}
          >
            <PopoverTrigger asChild>
              <button className={btnClass} onMouseDown={(e) => e.preventDefault()}>
                <Highlighter className="size-4" />
                <ChevronRight className="size-3 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="p-2" onMouseDown={(e) => e.preventDefault()}>
              <div className={gridClass}>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-7 h-7 rounded border hover:scale-110"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (highlightSelRef.current) {
                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(highlightSelRef.current);
                      }
                      applyHighlight(c);
                      setPopover(null);
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Color texto (rueda cromática) */}
          <Popover open={popover === 'color'} onOpenChange={(o) => setPopover(o ? 'color' : null)}>
            <PopoverTrigger asChild>
              <button className={btnClass} onMouseDown={(e) => e.preventDefault()}>
                <span
                  className="text-sm font-semibold leading-none text-white"
                  style={{
                    textDecorationLine: 'underline',
                    textDecorationColor: '#28c4d8',
                    textDecorationThickness: '3px',
                    textUnderlineOffset: '2px',
                  }}
                >
                  A
                </span>
                <ChevronRight className="size-3 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="p-2" onMouseDown={(e) => e.preventDefault()}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  defaultValue="#111111"
                  onChange={(e) => {
                    applyTextColor(e.target.value);
                    setPopover(null);
                  }}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300 bg-transparent"
                  aria-label="Selector de color de texto"
                />
                <span className="text-xs text-white/80">Color de texto</span>
              </div>
            </PopoverContent>
          </Popover>

        </div>
      </div>
    </Rnd>
  );
}
