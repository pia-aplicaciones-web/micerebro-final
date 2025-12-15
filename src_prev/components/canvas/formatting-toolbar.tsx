// src/components/canvas/formatting-toolbar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import type { WithId, CanvasElement } from '@/lib/types';
import {
  MoreVertical,
  Tag,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Calendar,
  Eraser,
  X,
  Move,
  RectangleHorizontal,
  GripVertical,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Paintbrush,
  MapPin,
  Timer,
  Clock,
  Highlighter,
  Box,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button as UIButton } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ElementType } from '@/lib/types';

export interface FormattingToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddComment: () => void;
  onEditComment?: (comment: WithId<CanvasElement>) => void;
  isMobileSheet?: boolean;
  onLocateElement: (id: string) => void;
  onPanToggle: () => void;
  addElement?: (type: ElementType, props?: any) => Promise<string>;
  isPanningActive?: boolean;
  selectedElement?: WithId<CanvasElement> | null;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  isOpen,
  onClose,
  onAddComment,
  onEditComment,
  isMobileSheet,
  onLocateElement,
  onPanToggle,
  addElement,
  isPanningActive = false,
  selectedElement,
}) => {
  const [popoverOpen, setPopoverOpen] = useState<'fontSize' | 'underlineColor' | 'textColor' | 'highlight' | null>(null);
  const highlightSelectionRef = useRef<Range | null>(null);
  const [fontSize, setFontSize] = useState('18px');
  const [rndPosition, setRndPosition] = useState({ x: 0, y: 0 });
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // Ref para evitar reinicializaciones innecesarias cuando el toolbar ya está abierto
  const positionInitializedRef = useRef(false);

  // Consolidado: Inicializar posición UNA SOLA VEZ cuando se abre el toolbar (no en mobile)
  // Evita ejecuciones duplicadas y conflictos usando un ref para rastrear si ya se inicializó
  useEffect(() => {
    // Resetear flag cuando se cierra el toolbar
    if (!isOpen) {
      positionInitializedRef.current = false;
      return;
    }

    // Solo procesar si está abierto, no es mobile, y no se ha inicializado aún
    if (isMobileSheet || positionInitializedRef.current) {
      return;
    }

    // Marcar como inicializado ANTES de establecer la posición para evitar loops
    positionInitializedRef.current = true;

    // Inicializar posición desde localStorage o usar posición por defecto
    const savedPosition = localStorage.getItem('formattingToolbarPosition');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        // Validar que la posición sea válida
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && 
            !isNaN(parsed.x) && !isNaN(parsed.y)) {
          setRndPosition(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to load formatting toolbar position', e);
      }
    }

    // Si no hay posición guardada o es inválida, usar posición por defecto
    if (typeof window !== 'undefined') {
      const centerX = Math.max(0, (window.innerWidth - 600) / 2);
      setRndPosition({ x: centerX, y: 20 });
    }
  }, [isOpen, isMobileSheet]); // Dependencias correctas: solo se ejecuta cuando cambian estos valores

  const onDragStop = (e: any, d: { x: number; y: number }) => {
    const newPosition = { x: d.x, y: d.y };
    setRndPosition(newPosition);
    try {
      localStorage.setItem('formattingToolbarPosition', JSON.stringify(newPosition));
    } catch (error) {
      console.error('Failed to save formatting toolbar position', error);
    }
  };

  const handleAddLienzo = async () => {
    if (!addElement) return;
    try {
      // Tamaño 10x15 cm aprox en px (a 96dpi ~ 378 x 567)
      const lienzoWidth = 378;
      const lienzoHeight = 567;

      const viewportCenterX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
      const viewportCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

      await addElement('container', {
        content: { title: 'Lienzo 10x15', elementIds: [], layout: 'single' },
        properties: {
          position: {
            x: viewportCenterX - (lienzoWidth / 2),
            y: viewportCenterY - (lienzoHeight / 2),
          },
          size: { width: lienzoWidth, height: lienzoHeight },
          backgroundColor: '#fffb8b', // misma paleta que lista de tareas
        },
      });
    } catch (error) {
      console.error('Error creating lienzo:', error);
    }
  };

  const handleFormat = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'DIV')) {
        activeElement.focus();
        if (value) {
          document.execCommand(command, false, value);
        } else {
          document.execCommand(command, false);
        }
        // Disparar evento input para guardar
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    if (value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    
    // Disparar evento input para guardar cambios
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    setPopoverOpen(null);
  };

  const applyColoredUnderline = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.textDecoration = 'underline';
    span.style.textDecorationColor = color;
    span.style.textDecorationThickness = '2.5px';
    span.appendChild(range.extractContents());
    range.insertNode(span);
    setPopoverOpen(null);
  };

  const applyTextColor = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    e.stopPropagation();
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
            setPopoverOpen(null);
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
      setPopoverOpen(null);
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
            setPopoverOpen(null);
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
      setPopoverOpen(null);
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
    setPopoverOpen(null);
  };

  const handleInsertDate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const span = document.createElement('span');
    span.style.color = '#a0a1a6';
    span.textContent = `-- ${format(new Date(), 'dd/MM/yy')} `;
    document.execCommand('insertHTML', false, span.outerHTML);
    // Disparar evento input para guardar
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const clearFormatting = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand('removeFormat', false);
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      if (container.nodeType === Node.ELEMENT_NODE) {
        const element = container as HTMLElement;
        const spans = element.querySelectorAll('span[style*="text-decoration"]');
        spans.forEach(span => {
          const parent = span.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(span.textContent || ''), span);
            parent.normalize();
          }
        });
      }
    }
    
    // Disparar evento input para guardar
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Insertar lista desordenada
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
  };

  if (!isOpen) {
    return null;
  }

  // Clases Tailwind para el toolbar - COMPACTO sin espacios excesivos
  const toolbarClassName = cn(
    "bg-black text-white py-1 px-1.5",
    "flex items-center justify-center w-full min-h-[32px] gap-0.5",
    "text-xs"
  );

  // Botones blancos compactos
  const whiteButtonClassName = cn(
    "bg-white border-none rounded px-1.5 py-1",
    "cursor-pointer flex items-center justify-center",
    "min-w-[24px] h-6 transition-colors",
    "hover:bg-gray-100"
  );

  // Iconos compactos
  const iconClassName = "w-3.5 h-3.5 text-black";

  // Cuadrados gris oscuro compactos
  const darkSquareClassName = cn(
    "bg-[#2a2a2a] border-none rounded",
    "cursor-pointer flex items-center justify-center",
    "w-6 h-6 p-1 transition-colors",
    "hover:bg-[#3a3a3a]"
  );

  const toolbarContent = (
    <div className={toolbarClassName}>
      {/* 1. Tres puntos verticales (MoreVertical) - Cuadrado gris oscuro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={darkSquareClassName} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="w-[14px] h-[14px] text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <span>Opciones</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Más opciones</p>
        </TooltipContent>
      </Tooltip>

      {/* Localizador (pin negro) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const name = prompt('Nombre del localizador:') || 'Localizador';
              addElement?.('locator', {
                content: { label: name },
              });
            }}
          >
            <MapPin className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Crear localizador</p>
        </TooltipContent>
      </Tooltip>

      {/* Contenedor */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addElement?.('container', {
                content: { title: 'Contenedor', elementIds: [], layout: 'single' },
                properties: { size: { width: 378, height: 567 }, position: { x: 200, y: 200 }, backgroundColor: '#fffb8b' },
              });
            }}
          >
            <Box className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Agregar contenedor</p>
        </TooltipContent>
      </Tooltip>

      {/* 3. T (Tamaño de Fuente) - Botón blanco con Popover */}
      <Popover open={popoverOpen === 'fontSize'} onOpenChange={(open) => setPopoverOpen(open ? 'fontSize' : null)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className={whiteButtonClassName}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Type className={iconClassName} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tamaño de fuente</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-2 bg-white" onMouseDown={(e) => e.preventDefault()}>
          <div className="space-y-1">
            {['12px', '14px', '16px', '18px', '20px', '24px', '32px'].map((size) => (
              <button
                key={size}
                className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFontSize(size);
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.fontSize = size;
                    try {
                      range.surroundContents(span);
                    } catch (err) {
                      span.appendChild(range.extractContents());
                      range.insertNode(span);
                    }
                    // Disparar evento input para guardar
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement) {
                      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  } else {
                    // Si no hay selección, aplicar al elemento activo
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement && activeElement.isContentEditable) {
                      activeElement.style.fontSize = size;
                      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }
                  setPopoverOpen(null);
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>


      {/* 4. Link (Enlaces) - Botón blanco con Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button
                className={whiteButtonClassName}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <LinkIcon className={iconClassName} />
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insertar Enlace</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insertar Enlace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="link-url" className="text-sm font-medium">
                URL del enlace
              </label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://ejemplo.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const selection = window.getSelection();
                    if (linkUrl.trim()) {
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        // Hay texto seleccionado, convertirlo en enlace
                        const range = selection.getRangeAt(0);
                        const link = document.createElement('a');
                        link.href = linkUrl.trim();
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.appendChild(range.extractContents());
                        range.insertNode(link);
                        // Disparar evento input para guardar
                        const activeElement = document.activeElement as HTMLElement;
                        if (activeElement) {
                          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      } else {
                        // No hay selección, insertar URL como texto con enlace
                        const link = document.createElement('a');
                        link.href = linkUrl.trim();
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.textContent = linkUrl.trim();
                        document.execCommand('insertHTML', false, link.outerHTML);
                        // Disparar evento input para guardar
                        const activeElement = document.activeElement as HTMLElement;
                        if (activeElement) {
                          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }
                      setLinkUrl('');
                      setLinkDialogOpen(false);
                    }
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <UIButton
                variant="outline"
                onClick={() => {
                  setLinkUrl('');
                  setLinkDialogOpen(false);
                }}
              >
                Cancelar
              </UIButton>
              <UIButton
                onClick={() => {
                  const selection = window.getSelection();
                  if (linkUrl.trim()) {
                    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                      // Hay texto seleccionado, convertirlo en enlace
                      const range = selection.getRangeAt(0);
                      const link = document.createElement('a');
                      link.href = linkUrl.trim();
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      link.appendChild(range.extractContents());
                      range.insertNode(link);
                      // Disparar evento input para guardar
                      const activeElement = document.activeElement as HTMLElement;
                      if (activeElement) {
                        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    } else {
                      // No hay selección, insertar URL como texto con enlace
                      const link = document.createElement('a');
                      link.href = linkUrl.trim();
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      link.textContent = linkUrl.trim();
                      document.execCommand('insertHTML', false, link.outerHTML);
                      // Disparar evento input para guardar
                      const activeElement = document.activeElement as HTMLElement;
                      if (activeElement) {
                        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }
                    setLinkUrl('');
                    setLinkDialogOpen(false);
                  }
                }}
              >
                Insertar
              </UIButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* SUBRAYAR - Popover de colores */}
      <Popover open={popoverOpen === 'underlineColor'} onOpenChange={(open) => setPopoverOpen(open ? 'underlineColor' : null)}>
        <PopoverTrigger asChild>
          <button className={whiteButtonClassName} onMouseDown={(e) => e.preventDefault()} title="Subrayar">
            <Underline className={iconClassName} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-white" onMouseDown={(e) => e.preventDefault()}>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              '#14b8a6',
              '#f97316',
              '#84cc16',
              '#eab308',
              '#f59e0b',
              '#3b82f6',
              '#6b9508',
              '#5cc4c0',
              '#e0d40e',
              '#010974',
              '#02d2d0',
              '#95060c',
              '#720abb',
              '#ab6dd6',
              '#f4f647',
              '#016d77',
            ].map((color, idx) => (
              <button key={idx} className="w-6 h-6 rounded border hover:scale-110" style={{ backgroundColor: color }} onMouseDown={(e) => applyColoredUnderline(e, color)} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* DESTACADOR - Popover de colores pastel */}
      <Popover
        open={popoverOpen === 'highlight'}
        onOpenChange={(open) => {
          if (open) {
            // Guardar selección actual antes de abrir los colores
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
              highlightSelectionRef.current = sel.getRangeAt(0).cloneRange();
            } else {
              highlightSelectionRef.current = null;
            }
            setPopoverOpen('highlight');
          } else {
            setPopoverOpen(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={(e) => e.preventDefault()}
            title="Destacar"
          >
            <Highlighter className={iconClassName} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-white" onMouseDown={(e) => e.preventDefault()}>
          <div className="grid grid-cols-4 gap-1.5">
            {['#fef08a', '#fde68a', '#fed7aa', '#d1fae5', '#a5f3fc', '#e9d5ff', '#ddd6fe', '#c7d2fe'].map((color, idx) => (
              <button
                key={idx}
                className="w-6 h-6 rounded border hover:scale-110"
                style={{ backgroundColor: color }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Restaurar selección guardada para que el resaltado funcione aunque se haya perdido el foco
                  const sel = window.getSelection();
                  if (highlightSelectionRef.current) {
                    sel?.removeAllRanges();
                    sel?.addRange(highlightSelectionRef.current);
                  }
                  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                    const range = sel.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.backgroundColor = color;
                    try {
                      span.appendChild(range.extractContents());
                      range.insertNode(span);
                      const activeElement = document.activeElement as HTMLElement;
                      if (activeElement) activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    } catch (err) { console.error(err); }
                  }
                  setPopoverOpen(null);
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* PINCEL - Color de texto */}
      <Popover open={popoverOpen === 'textColor'} onOpenChange={(open) => setPopoverOpen(open ? 'textColor' : null)}>
        <PopoverTrigger asChild>
          <button className={whiteButtonClassName} onMouseDown={(e) => e.preventDefault()} title="Color de texto">
            <Paintbrush className={iconClassName} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-white" onMouseDown={(e) => e.preventDefault()}>
          <div className="grid grid-cols-4 gap-1.5">
            {['#14b8a6', '#f97316', '#84cc16', '#eab308', '#f59e0b', '#3b82f6', '#1f2937', '#475569'].map((color, idx) => (
              <button key={idx} className="w-6 h-6 rounded border hover:scale-110" style={{ backgroundColor: color }} onMouseDown={(e) => applyTextColor(e, color)} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Separador */}
      <div className="w-px h-5 bg-white/30 mx-0.5" />

      {/* 7. B (Bold) - Botón blanco */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={(e) => handleFormat(e, 'bold')}
          >
            <Bold className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Negrita</p>
        </TooltipContent>
      </Tooltip>

      {/* 8. I (Italic) - Botón blanco */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={(e) => handleFormat(e, 'italic')}
          >
            <Italic className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cursiva</p>
        </TooltipContent>
      </Tooltip>

      {/* 9. S tachado (Strikethrough) - Botón blanco */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={(e) => handleFormat(e, 'strikeThrough')}
          >
            <Strikethrough className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tachado</p>
        </TooltipContent>
      </Tooltip>

      {/* Separador */}
      <div className="w-px h-5 bg-white/30 mx-0.5" />

      {/* 10-13. Alinear - Botón único con desplegable */}
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(whiteButtonClassName, "!px-1 !min-w-0")}
              >
                <AlignLeft className={iconClassName} />
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormat(e, 'justifyLeft');
            }}
          >
            <AlignLeft className="h-4 w-4 mr-2" />
            Alinear Izquierda
          </DropdownMenuItem>
          <DropdownMenuItem 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormat(e, 'justifyCenter');
            }}
          >
            <AlignCenter className="h-4 w-4 mr-2" />
            Centrar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormat(e, 'justifyRight');
            }}
          >
            <AlignRight className="h-4 w-4 mr-2" />
            Alinear Derecha
          </DropdownMenuItem>
          <DropdownMenuItem 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormat(e, 'justifyFull');
            }}
          >
            <AlignJustify className="h-4 w-4 mr-2" />
            Justificar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Alinear Texto</p>
        </TooltipContent>
      </Tooltip>

      {/* Separador */}
      <div className="w-px h-5 bg-white/30 mx-0.5" />

      {/* 14. Calendario - Botón blanco */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={handleInsertDate}
          >
            <Calendar className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insertar Fecha</p>
        </TooltipContent>
      </Tooltip>


      {/* 16. Borrador (Eraser) - Botón blanco */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={clearFormatting}
          >
            <Eraser className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Limpiar Formato</p>
        </TooltipContent>
      </Tooltip>

      {/* Separador */}
      <div className="w-px h-5 bg-white/30 mx-0.5" />

      {/* 12. Mover - Botón blanco (trasladado del menú principal) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(whiteButtonClassName, isPanningActive && 'bg-gray-200')}
            onClick={onPanToggle}
          >
            <Move className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mover tablero</p>
        </TooltipContent>
      </Tooltip>

      {/* X - Cuadrado gris oscuro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={darkSquareClassName}
            onClick={onClose}
          >
            <X className="w-[14px] h-[14px] text-white" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cerrar</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  if (isMobileSheet) {
    return toolbarContent;
  }

  // Menú format siempre abierto arriba, arrastrable con Rnd
  return (
    <Rnd
      size={{ width: 'auto', height: 'auto' }}
      position={rndPosition}
      onDragStop={onDragStop}
      dragHandleClassName="drag-handle"
      bounds="window"
      enableResizing={false}
      className="z-[60000] pointer-events-auto"
    >
      <div className="drag-handle cursor-grab active:cursor-grabbing py-1 text-slate-800 flex justify-center mb-1">
        <GripVertical className="size-4" />
      </div>
      {toolbarContent}
    </Rnd>
  );
};

export default FormattingToolbar;
