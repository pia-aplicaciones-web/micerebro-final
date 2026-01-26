'use client';

import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Palette,
  Type,
  List,
  ListOrdered,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface TextToolsMenuProps {
  onFormat: (command: string, value?: string) => void;
}

const TextToolsMenu: React.FC<TextToolsMenuProps> = ({ onFormat }) => {
  const [fontSizePopoverOpen, setFontSizePopoverOpen] = useState(false);
  const [textColorPopoverOpen, setTextColorPopoverOpen] = useState(false);

  const handleFormat = (command: string, value?: string) => {
    onFormat(command, value);
  };

  const applyFontSize = (size: string) => {
    handleFormat('fontSize', '4');
    // Luego aplicar el tamaño específico
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const spans = (container.nodeType === Node.ELEMENT_NODE)
        ? (container as Element).querySelectorAll('font[size="4"]')
        : [];
      spans.forEach(span => {
        (span as HTMLElement).style.fontSize = size;
        (span as HTMLElement).removeAttribute('size');
      });

      // Disparar evento input para guardar
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    setFontSizePopoverOpen(false);
  };

  const applyTextColor = (color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Si no hay selección, envolver todo el contenido en un span con el color
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.isContentEditable) {
        // Si el elemento ya tiene un solo hijo span con color, actualizar ese span
        const children = Array.from(activeElement.childNodes);
        if (children.length === 1 && children[0].nodeType === Node.ELEMENT_NODE) {
          const child = children[0] as HTMLElement;
          if (child.tagName === 'SPAN' && child.style.color) {
            child.style.color = color;
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            setTextColorPopoverOpen(false);
            return;
          }
        }
        // Envolver todo el contenido en un span con el color
        const span = document.createElement('span');
        span.style.color = color;
        while (activeElement.firstChild) {
          span.appendChild(activeElement.firstChild);
        }
        activeElement.appendChild(span);
        // Mover cursor al final
        const range = document.createRange();
        range.selectNodeContents(span);
        range.collapse(false);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setTextColorPopoverOpen(false);
      return;
    }

    if (selection.isCollapsed) {
      // Si solo hay cursor, envolver el contenido del elemento en un span con el color
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE
        ? (container.parentElement as HTMLElement)
        : (container as HTMLElement);
      if (element && element.isContentEditable) {
        // Verificar si ya tiene un span con color
        const children = Array.from(element.childNodes);
        if (children.length === 1 && children[0].nodeType === Node.ELEMENT_NODE) {
          const child = children[0] as HTMLElement;
          if (child.tagName === 'SPAN' && child.style.color) {
            child.style.color = color;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            setTextColorPopoverOpen(false);
            return;
          }
        }
        // Envolver contenido en span con color
        const span = document.createElement('span');
        span.style.color = color;
        while (element.firstChild) {
          span.appendChild(element.firstChild);
        }
        element.appendChild(span);
        // Mover cursor al final
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setTextColorPopoverOpen(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.color = color;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      // Mover cursor después del span
      range.setStartAfter(span);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      // Disparar evento input para guardar
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (err) {
      console.error('Error aplicando color:', err);
    }
    setTextColorPopoverOpen(false);
  };

  // Console log temporal para verificar renderizado
  console.log('TextToolsMenu renderizado');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs bg-blue-100 border-blue-400 hover:bg-blue-200 text-blue-800 shadow-sm"
        >
          <PenTool className="w-3 h-3 mr-1" />
          Tools
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-white border border-gray-200">
        {/* Negrita */}
        <DropdownMenuItem
          onClick={() => handleFormat('bold')}
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
        >
          <Bold className="w-4 h-4" />
          <span className="font-bold">B</span>
          <span className="text-xs text-gray-500 ml-auto">Negrita</span>
        </DropdownMenuItem>

        {/* Cursiva */}
        <DropdownMenuItem
          onClick={() => handleFormat('italic')}
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
        >
          <Italic className="w-4 h-4" />
          <span className="italic">I</span>
          <span className="text-xs text-gray-500 ml-auto">Cursiva</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Color de texto */}
        <Popover open={textColorPopoverOpen} onOpenChange={setTextColorPopoverOpen}>
          <PopoverTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
            >
              <Palette className="w-4 h-4" />
              <div className="w-4 h-4 rounded border border-gray-300 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500"></div>
              <span className="text-xs text-gray-500 ml-auto">Color</span>
            </DropdownMenuItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-white border border-gray-200">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                '#000000', '#374151', '#6b7280', '#9ca3af',
                '#dc2626', '#ea580c', '#d97706', '#65a30d',
                '#059669', '#0891b2', '#2563eb', '#7c3aed',
                '#c026d3', '#db2777', '#f97316', '#eab308'
              ].map((color, idx) => (
                <button
                  key={idx}
                  className="w-7 h-7 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => applyTextColor(color)}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Tamaño de fuente */}
        <Popover open={fontSizePopoverOpen} onOpenChange={setFontSizePopoverOpen}>
          <PopoverTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
            >
              <Type className="w-4 h-4" />
              <span className="text-sm font-medium">T</span>
              <span className="text-xs text-gray-500 ml-auto">Tamaño</span>
            </DropdownMenuItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-white border border-gray-200">
            <div className="space-y-1">
              {['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px'].map((size) => (
                <button
                  key={size}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  onClick={() => applyFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenuSeparator />

        {/* Lista con viñetas */}
        <DropdownMenuItem
          onClick={() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const container = range.commonAncestorContainer;
              if (container.nodeType === Node.ELEMENT_NODE) {
                const element = container as HTMLElement;
                // Si ya está en una lista, salir de la lista
                if (element.tagName === 'UL' || element.tagName === 'OL' || element.closest('ul, ol')) {
                  document.execCommand('insertUnorderedList', false);
                } else {
                  // Insertar nueva lista
                  document.execCommand('insertUnorderedList', false);
                }
              } else {
                // Insertar nueva lista
                document.execCommand('insertUnorderedList', false);
              }
              // Disparar evento input para guardar
              const activeElement = document.activeElement as HTMLElement;
              if (activeElement) {
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              }
            } else {
              // Si no hay selección, insertar lista en el cursor
              const activeElement = document.activeElement as HTMLElement;
              if (activeElement && activeElement.isContentEditable) {
                activeElement.focus();
                document.execCommand('insertUnorderedList', false);
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          }}
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
        >
          <List className="w-4 h-4" />
          <span className="text-sm">•</span>
          <span className="text-xs text-gray-500 ml-auto">Lista viñetas</span>
        </DropdownMenuItem>

        {/* Lista numerada */}
        <DropdownMenuItem
          onClick={() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const container = range.commonAncestorContainer;
              if (container.nodeType === Node.ELEMENT_NODE) {
                const element = container as HTMLElement;
                // Si ya está en una lista, salir de la lista
                if (element.tagName === 'UL' || element.tagName === 'OL' || element.closest('ul, ol')) {
                  document.execCommand('insertOrderedList', false);
                } else {
                  // Insertar nueva lista
                  document.execCommand('insertOrderedList', false);
                }
              } else {
                // Insertar nueva lista
                document.execCommand('insertOrderedList', false);
              }
              // Disparar evento input para guardar
              const activeElement = document.activeElement as HTMLElement;
              if (activeElement) {
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              }
            } else {
              // Si no hay selección, insertar lista en el cursor
              const activeElement = document.activeElement as HTMLElement;
              if (activeElement && activeElement.isContentEditable) {
                activeElement.focus();
                document.execCommand('insertOrderedList', false);
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          }}
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
        >
          <ListOrdered className="w-4 h-4" />
          <span className="text-sm">1.</span>
          <span className="text-xs text-gray-500 ml-auto">Lista numerada</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TextToolsMenu;
