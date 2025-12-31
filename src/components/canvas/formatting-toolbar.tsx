// src/components/canvas/formatting-toolbar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import type { WithId, CanvasElement } from '@/lib/types';
import {
  MoreVertical,
  MoreHorizontal,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  CalendarDays,
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
  Timer,
  Clock,
  Highlighter,
  MapPin,
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
  elements: WithId<CanvasElement>[];
  onLocateElement: (id: string) => void;
  onPanToggle: () => void;
  addElement?: (type: ElementType, props?: any) => Promise<string>;
  isPanningActive?: boolean;
  selectedElement?: WithId<CanvasElement> | null;
  onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  isOpen,
  onClose,
  onAddComment,
  onEditComment,
  isMobileSheet,
  elements,
  onLocateElement,
  onPanToggle,
  addElement,
  isPanningActive = false,
  selectedElement,
  onUpdateElement,
}) => {
  // Detectar si el elemento seleccionado es un localizador/comment
  const isCommentSelected = selectedElement?.type === 'comment';
  const canEditLocator = isCommentSelected && !!selectedElement && !!onEditComment;
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

    // Si no hay posición guardada o es inválida, posicionar al lado izquierdo del tablero debajo del título
    if (typeof window !== 'undefined') {
      // Posicionar el menú format a 100px del borde izquierdo del tablero
      const formatMenuX = 100;

      // Posicionar debajo del título del tablero (que está en top-4 = 16px, con ~20px de altura)
      const titleTop = 16; // top-4 en Tailwind = 16px
      const titleHeight = 20; // Altura aproximada del título
      const spacing = 4; // Espacio adicional
      const formatMenuY = titleTop + titleHeight + spacing;

      setRndPosition({ x: formatMenuX, y: formatMenuY });
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

  // Clases Tailwind para el toolbar - SIN FONDO
  const toolbarClassName = cn(
    "text-black py-0.5 px-1",
    "flex flex-col items-center justify-center w-full min-w-[62px] gap-0.5",
    "text-xs"
  );

  // Botones con efectos hover calipso como menú principal
  const whiteButtonClassName = cn(
    "bg-white border border-border rounded px-1 py-0.5",
    "cursor-pointer flex items-center justify-center",
    "min-w-[25px] h-6 transition-colors",
    "hover:bg-[#ADD8E6] active:bg-white text-black"
  );

  // Iconos compactos
  const iconClassName = "w-4 h-4 text-black";

  // Cuadrados con mismo estilo que menú principal
  const darkSquareClassName = cn(
    "bg-white border border-border rounded",
    "cursor-pointer flex items-center justify-center",
    "w-6 h-6 p-0.5 transition-colors",
    "hover:bg-[#ADD8E6] active:bg-white text-black"
  );

  const toolbarContent = (
    <div className={toolbarClassName}>
      {/* 1. Drag and Drop - Cuadrado gris oscuro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`${darkSquareClassName} cursor-grab active:cursor-grabbing drag-handle`}
            // onMouseDown ya no es necesario aquí, la clase drag-handle gestiona el arrastre
          >
            <MoreHorizontal className="w-[15px] h-[15px] text-black" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Arrastrar toolbar</p>
        </TooltipContent>
      </Tooltip>

      {/* 2b. Cronómetro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addElement?.('stopwatch');
            }}
          >
            <Timer className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Agregar cronómetro</p>
        </TooltipContent>
      </Tooltip>

      {/* 2c. Temporizador Pomodoro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addElement?.('pomodoro-timer');
            }}
          >
            <Clock className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Agregar temporizador Pomodoro</p>
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
        <PopoverContent className="w-auto p-2 bg-background border border-border" onMouseDown={(e) => e.preventDefault()}>
          <div className="space-y-1">
            {['12px', '14px', '16px', '18px', '20px', '24px', '32px'].map((size) => (
              <button
                key={size}
                className="w-full text-left px-2 py-1 text-sm hover:bg-[#ADD8E6] rounded"
                  onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFontSize(size);

                  // Aplicar al elemento seleccionado si existe
                  if (selectedElement && onUpdateElement) {
                    onUpdateElement(selectedElement.id, {
                      properties: {
                        ...selectedElement.properties,
                        fontSize: size
                      }
                    });
                  }

                  // También aplicar estilo inline al elemento activo para vista inmediata
                  const activeElement = document.activeElement as HTMLElement;
                  if (activeElement && activeElement.isContentEditable) {
                    activeElement.style.fontSize = size;
                    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
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
        <PopoverContent className="w-auto p-2 bg-background border border-border" onMouseDown={(e) => e.preventDefault()}>
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
              <button key={idx} className="w-7 h-7 rounded border hover:scale-110" style={{ backgroundColor: color }} onMouseDown={(e) => applyColoredUnderline(e, color)} />
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
        <PopoverContent className="w-auto p-2 bg-background border border-border" onMouseDown={(e) => e.preventDefault()}>
          <div className="grid grid-cols-4 gap-1.5">
            {['#fef08a', '#fde68a', '#fed7aa', '#d1fae5', '#a5f3fc', '#e9d5ff', '#ddd6fe', '#c7d2fe'].map((color, idx) => (
              <button
                key={idx}
                className="w-7 h-7 rounded border hover:scale-110"
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
        <PopoverContent className="w-auto p-2 bg-background border border-border" onMouseDown={(e) => e.preventDefault()}>
          <div className="grid grid-cols-4 gap-1.5">
            {['#14b8a6', '#f97316', '#84cc16', '#eab308', '#f59e0b', '#3b82f6', '#1f2937', '#475569'].map((color, idx) => (
              <button key={idx} className="w-7 h-7 rounded border hover:scale-110" style={{ backgroundColor: color }} onMouseDown={(e) => applyTextColor(e, color)} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Separador */}
      <div className="w-px h-6 bg-border mx-0.5" />

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
      <div className="w-px h-6 bg-border mx-0.5" />

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
      <div className="w-px h-6 bg-border mx-0.5" />

      {/* 14. Calendario - Botón blanco */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={whiteButtonClassName}
            onMouseDown={handleInsertDate}
          >
            <CalendarDays className={iconClassName} />
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
      <div className="w-px h-6 bg-border mx-0.5" />

      {/* 12. Mover - Botón blanco (trasladado del menú principal) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(whiteButtonClassName, isPanningActive && 'bg-white')}
            onClick={onPanToggle}
          >
            <Move className={iconClassName} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mover tablero</p>
        </TooltipContent>
      </Tooltip>

    </div>
  );

  if (isMobileSheet) {
    return toolbarContent;
  }

  // Menú format siempre abierto a la derecha del menú principal, arrastrable con Rnd
  return (
    <Rnd
      default={{
        x: rndPosition.x,
        y: rndPosition.y,
        width: 103,
        height: 605,
      }}
      minWidth={86}
      maxWidth={138}
      minHeight={432}
      maxHeight={864}
      position={rndPosition}
      onDragStop={onDragStop}
      dragHandleClassName="drag-handle"
      bounds="window"
      enableResizing={true}
      className="z-[60000] pointer-events-auto"
    >
      {toolbarContent}
    </Rnd>
  );
};

export default FormattingToolbar;
