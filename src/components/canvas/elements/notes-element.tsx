'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Trash2,
  FileImage,
  MoreVertical,
  Grid3x3,
  CalendarDays,
  X,
  Paintbrush,
  Edit,
  Plus,
  Copy,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Camera,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { cn } from '@/lib/utils';
import { shouldAllowTouchEdit } from '@/lib/touch-edit-guard';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChromePicker } from 'react-color';

const NOTES_SIZE = { width: 600, height: 400 };
const DEFAULT_HEADER_COLOR = '#F7D946';
const DEFAULT_BG = '#dcefe1';
const MAX_PAGES = 20;

type NotesContent = {
  text?: string;
  searchQuery?: string;
  title?: string;
  pages?: string[];
  currentPage?: number;
};

function normalizePages(content: NotesContent): string[] {
  if (Array.isArray(content.pages) && content.pages.length > 0) {
    return content.pages.map((p) => (typeof p === 'string' ? p : ''));
  }
  const seed = content.text ?? '';
  return [seed];
}

function stripHtml(value: string): string {
  if (!value) return '';
  if (!/[<>]/.test(value)) return value;
  const tmp = document.createElement('div');
  tmp.innerHTML = value;
  return tmp.innerText || tmp.textContent || '';
}

export default function NotesElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview,
    minimized: minimizedProp,
  } = props;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ count: number; index: number } | null>(null);
  const isMinimized = !!minimizedProp;

  const typedContent = (content || {}) as NotesContent;
  const pages = normalizePages(typedContent);
  const currentPage = Math.min(
    Math.max(0, typedContent.currentPage ?? 0),
    Math.max(0, pages.length - 1)
  );
  const pageText = stripHtml(pages[currentPage] ?? '');

  const [title, setTitle] = useState(typedContent.title || 'Apuntes');
  const [searchQuery, setSearchQuery] = useState(typedContent.searchQuery || '');
  const [text, setText] = useState(pageText);

  const initialBackgroundColor = (properties as any)?.backgroundColor || DEFAULT_BG;
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  const initialHeaderColor = (properties as any)?.headerColor || DEFAULT_HEADER_COLOR;
  const [headerColor, setHeaderColor] = useState(initialHeaderColor);

  const pagesRef = useRef(pages);
  const currentPageRef = useRef(currentPage);
  const titleRefValue = useRef(title);
  const searchQueryRef = useRef(searchQuery);
  const suppressSyncRef = useRef(false);

  useEffect(() => {
    pagesRef.current = pages;
    currentPageRef.current = currentPage;
  }, [pages, currentPage]);

  useEffect(() => {
    titleRefValue.current = title;
  }, [title]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    if (typedContent.title !== undefined && typedContent.title !== title) {
      setTitle(typedContent.title || 'Apuntes');
    }
  }, [typedContent.title]);

  // Mantener el título en el DOM sin pelear con contentEditable
  useEffect(() => {
    if (!titleRef.current) return;
    if (document.activeElement === titleRef.current) return;
    if (titleRef.current.textContent !== title) {
      titleRef.current.textContent = title;
    }
  }, [title]);

  useEffect(() => {
    const next = (properties as any)?.backgroundColor;
    if (next && next !== backgroundColor) setBackgroundColor(next);
  }, [(properties as any)?.backgroundColor]);

  useEffect(() => {
    const next = (properties as any)?.headerColor;
    if (next && next !== headerColor) setHeaderColor(next);
  }, [(properties as any)?.headerColor]);

  // Sync editor when page changes or external content updates
  useEffect(() => {
    if (suppressSyncRef.current) return;
    const next = stripHtml(pages[currentPage] ?? '');
    setText(next);
    if (contentRef.current && document.activeElement !== contentRef.current) {
      contentRef.current.innerText = next;
    }
  }, [currentPage, pages[currentPage]]);

  const buildContentPayload = useCallback(
    (overrides: Partial<NotesContent> = {}) => {
      const html = contentRef.current?.innerText ?? text;
      const nextPages = [...pagesRef.current];
      nextPages[currentPageRef.current] = html;
      return {
        title: titleRefValue.current || 'Apuntes',
        searchQuery: searchQueryRef.current || '',
        pages: nextPages,
        currentPage: currentPageRef.current,
        text: nextPages[currentPageRef.current] || '',
        ...overrides,
      };
    },
    [text]
  );

  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => contentRef.current?.innerText || '',
    onSave: async (newText) => {
      setText(newText);
      const payload = buildContentPayload();
      pagesRef.current = payload.pages || pagesRef.current;
      await onUpdate(id, { content: payload });
    },
    debounceMs: 4000,
    compareContent: (oldContent, newContent) => {
      return (text || '').trim() === (newContent || '').trim();
    },
  });

  const handleExportToPng = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        const notesCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
        if (!notesCard) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo encontrar el elemento para exportar.',
          });
          return;
        }
        setIsExportingPng(true);
        toast({ title: 'Exportando...', description: 'Generando imagen PNG de alta resolución.' });
        const canvas = await html2canvas(notesCard, {
          backgroundColor: backgroundColor,
          scale: 2.1,
          useCORS: true,
          logging: false,
          allowTaint: false,
          windowWidth: notesCard.scrollWidth,
          windowHeight: notesCard.scrollHeight,
        });
        canvas.toBlob(
          (blob: Blob | null) => {
            if (!blob) {
              toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la imagen.' });
              setIsExportingPng(false);
              return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `apuntes_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: 'Exportado', description: 'Los apuntes se han exportado como PNG de alta resolución.' });
            setIsExportingPng(false);
          },
          'image/png',
          1.0
        );
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo exportar.' });
        setIsExportingPng(false);
      }
    },
    [toast, id, backgroundColor]
  );

  const handleExportCapture = useCallback(async () => {
    try {
      const notesElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!notesElement) return;
      setIsCapturing(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(notesElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: backgroundColor,
        includeQueryParams: false,
        skipFonts: true,
        width: notesElement.offsetWidth,
        height: notesElement.offsetHeight,
        filter: (element) => {
          if (element.tagName === 'LINK' && element.getAttribute('href')?.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });
      setIsCapturing(false);
      const link = document.createElement('a');
      link.download = `${title || 'notas'}_captura.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      setIsCapturing(false);
      console.error('Error en captura de notas:', error);
    }
  }, [id, title, backgroundColor]);

  const handleContentInput = useCallback(() => {
    handleChange();
  }, [handleChange]);

  const handleContentBlur = useCallback(async () => {
    await handleAutoSaveBlur();
  }, [handleAutoSaveBlur]);

  const selectMatchInEditor = useCallback((query: string, occurrence = 0) => {
    const el = contentRef.current;
    if (!el || !query.trim()) {
      setMatchInfo(null);
      return;
    }
    const full = el.innerText || '';
    const lower = full.toLowerCase();
    const q = query.toLowerCase();
    const indices: number[] = [];
    let from = 0;
    while (from < lower.length) {
      const found = lower.indexOf(q, from);
      if (found === -1) break;
      indices.push(found);
      from = found + q.length;
    }
    if (indices.length === 0) {
      setMatchInfo({ count: 0, index: 0 });
      return;
    }
    const idx = ((occurrence % indices.length) + indices.length) % indices.length;
    const start = indices[idx];
    const end = start + query.length;
    setMatchInfo({ count: indices.length, index: idx + 1 });

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remainingStart = start;
    let remainingEnd = end;
    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startOffset = 0;
    let endOffset = 0;
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const len = node.data.length;
      if (!startNode && remainingStart < len) {
        startNode = node;
        startOffset = remainingStart;
      } else if (!startNode) {
        remainingStart -= len;
      }
      if (!endNode && remainingEnd <= len) {
        endNode = node;
        endOffset = remainingEnd;
        break;
      } else if (!endNode) {
        remainingEnd -= len;
      }
      if (startNode && !endNode) {
        // continue until end found
      }
    }
    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      const rect = range.getBoundingClientRect();
      if (rect && el.scrollHeight > el.clientHeight) {
        const elRect = el.getBoundingClientRect();
        el.scrollTop += rect.top - elRect.top - el.clientHeight / 3;
      }
    }
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      searchQueryRef.current = query;
      onUpdate(id, { content: buildContentPayload({ searchQuery: query }) });
      selectMatchInEditor(query, 0);
    },
    [onUpdate, id, buildContentPayload, selectMatchInEditor]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const next = matchInfo ? matchInfo.index : 0;
        selectMatchInEditor(searchQuery, next);
      }
    },
    [matchInfo, searchQuery, selectMatchInEditor]
  );

  const insertTextAtCursor = useCallback(
    (value: string) => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      const selection = window.getSelection();
      const inEditor =
        selection &&
        selection.rangeCount > 0 &&
        el.contains(selection.anchorNode);

      if (inEditor && selection) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(value);
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const needsSpace = el.innerText && !el.innerText.endsWith('\n') && el.innerText.length > 0;
        el.innerText = `${el.innerText}${needsSpace ? '\n' : ''}${value}`;
        // place caret at end
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setText(el.innerText);
      handleChange();
    },
    [handleChange]
  );

  const handleInsertDate = useCallback(() => {
    const now = new Date();
    // Formato pedido: 00/00/00 y hora
    const dateTimeStr = format(now, 'dd/MM/yy HH:mm');
    insertTextAtCursor(dateTimeStr);
  }, [insertTextAtCursor]);

  const handleCopyAsTxt = useCallback(async () => {
    if (!contentRef.current) return;
    try {
      const textContent = contentRef.current.innerText || '';
      const notesTitle = title || 'Apuntes sin título';
      const orderedText = `${notesTitle}\n${'='.repeat(notesTitle.length)}\n\n${textContent.trim()}\n\n---\nExportado desde CanvasMind\n${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
      await navigator.clipboard.writeText(orderedText);
      toast({ title: 'Texto copiado como .txt ordenado' });
    } catch {
      toast({ variant: 'destructive', title: 'Error al copiar texto' });
    }
  }, [title, toast]);

  const persistPages = useCallback(
    async (nextPages: string[], nextPage: number) => {
      suppressSyncRef.current = true;
      pagesRef.current = nextPages;
      currentPageRef.current = nextPage;
      const payload: NotesContent = {
        title: titleRefValue.current || 'Apuntes',
        searchQuery: searchQueryRef.current || '',
        pages: nextPages,
        currentPage: nextPage,
        text: nextPages[nextPage] || '',
      };
      await onUpdate(id, { content: payload });
      const plain = stripHtml(nextPages[nextPage] || '');
      setText(plain);
      if (contentRef.current) {
        contentRef.current.innerText = plain;
      }
      requestAnimationFrame(() => {
        suppressSyncRef.current = false;
      });
    },
    [onUpdate, id]
  );

  const handlePageChange = useCallback(
    async (newPage: number) => {
      if (isPreview) return;
      const currentText = contentRef.current?.innerText ?? text;
      const nextPages = [...pagesRef.current];
      nextPages[currentPageRef.current] = currentText;
      if (newPage < 0 || newPage >= nextPages.length || newPage === currentPageRef.current) return;
      await persistPages(nextPages, newPage);
    },
    [isPreview, text, persistPages]
  );

  const handleAddPage = useCallback(async () => {
    if (isPreview) return;
    const currentText = contentRef.current?.innerText ?? text;
    const nextPages = [...pagesRef.current];
    nextPages[currentPageRef.current] = currentText;
    if (nextPages.length >= MAX_PAGES) {
      toast({ variant: 'destructive', title: 'Máximo 20 páginas' });
      return;
    }
    // Página nueva vacía (no duplicar la actual)
    nextPages.push('');
    await persistPages(nextPages, nextPages.length - 1);
    toast({ title: 'Página nueva', description: `Página ${nextPages.length} creada.` });
  }, [isPreview, text, persistPages, toast]);

  const handleRestoreOriginalSize = useCallback(() => {
    if (isPreview) return;
    onUpdate(id, {
      width: NOTES_SIZE.width,
      height: NOTES_SIZE.height,
      properties: {
        ...properties,
        size: { ...NOTES_SIZE },
      },
    });
  }, [isPreview, properties, onUpdate, id]);

  const handleChangeHeaderColor = useCallback(
    (color: { hex: string }) => {
      const hex = color.hex || headerColor;
      setHeaderColor(hex);
      onUpdate(id, {
        properties: {
          ...((properties as object) || {}),
          headerColor: hex,
        },
      });
    },
    [id, onUpdate, properties, headerColor]
  );

  const handleTitleBlur = useCallback(() => {
    const next = (titleRef.current?.textContent || 'Apuntes').trim() || 'Apuntes';
    setTitle(next);
    titleRefValue.current = next;
    onUpdate(id, { content: buildContentPayload({ title: next }) });
  }, [onUpdate, id, buildContentPayload]);

  const focusTitle = useCallback(() => {
    titleRef.current?.focus();
    const sel = window.getSelection();
    if (titleRef.current && sel) {
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const toggleMinimize = useCallback(async () => {
    if (isPreview) return;
    const newMinimizedState = !isMinimized;
    handleChange();
    const updatedContent = buildContentPayload();
    if (newMinimizedState) {
      const currentSize = (properties as any)?.size || NOTES_SIZE;
      const w =
        typeof currentSize.width === 'number'
          ? currentSize.width
          : parseFloat(String(currentSize.width)) || NOTES_SIZE.width;
      const h =
        typeof currentSize.height === 'number'
          ? currentSize.height
          : parseFloat(String(currentSize.height)) || NOTES_SIZE.height;
      onUpdate(id, {
        minimized: true,
        content: updatedContent,
        properties: {
          ...properties,
          size: { width: w, height: 48 },
          originalSize: { width: w, height: h },
        },
      });
    } else {
      const { originalSize, ...restProps } = (properties || {}) as any;
      const restoredSize = originalSize || NOTES_SIZE;
      onUpdate(id, {
        minimized: false,
        content: updatedContent,
        properties: { ...restProps, size: restoredSize },
      });
    }
  }, [isMinimized, isPreview, onUpdate, id, properties, buildContentPayload, handleChange]);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    deleteElement(id);
  }, [deleteElement, id]);

  const pageCount = pages.length;

  return (
    <div
      data-element-id={id}
      className={cn(
        'relative w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md border-none',
        isMinimized ? 'h-12' : 'h-full'
      )}
      style={{
        backgroundColor: backgroundColor,
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        const isTextArea = target === contentRef.current || contentRef.current?.contains(target);
        const isTitle = target === titleRef.current || titleRef.current?.contains(target);
        const isSearch = target.closest('input') != null;
        if (!isTextArea && !isTitle && !isSearch) {
          e.currentTarget.classList.add('drag-handle');
        } else {
          e.currentTarget.classList.remove('drag-handle');
        }
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 drag-handle shrink-0"
        data-notepad-header
        style={{
          backgroundColor: headerColor,
          color: '#000000',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0 shrink-0"
            style={{ color: '#000000' }}
            title="Menú"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <span
            ref={titleRef}
            className="text-sm font-bold leading-tight cursor-text outline-none min-w-[4rem] max-w-[9rem] truncate"
            style={{ color: '#000000' }}
            contentEditable={!isPreview}
            data-dictation-target="true"
            suppressContentEditableWarning
            title="Clic para editar el título"
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
          />
        </div>

        <div
          className="flex items-center gap-1 flex-1 max-w-[11rem] mx-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: '#000000' }} />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="h-7 text-sm bg-transparent border-none text-black placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ color: '#000000' }}
          />
          {matchInfo && searchQuery.trim() ? (
            <span className="text-[10px] whitespace-nowrap opacity-70">
              {matchInfo.count === 0 ? '0' : `${matchInfo.index}/${matchInfo.count}`}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Insertar fecha y hora"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleInsertDate();
            }}
            style={{ color: '#000000' }}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Copiar texto"
            onClick={handleCopyAsTxt}
            style={{ color: '#000000' }}
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/10 p-0"
                title="Rosa cromática — color del encabezado"
                style={{ color: '#000000' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <Paintbrush className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={8}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="z-[9999] w-auto p-0 border-none bg-transparent shadow-xl rounded-xl overflow-hidden"
            >
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <p className="text-xs text-gray-600 px-1 pb-2">Color del encabezado</p>
                <ChromePicker color={headerColor} onChange={handleChangeHeaderColor} disableAlpha />
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-black/10 p-0"
                style={{ color: '#000000' }}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[9999]">
              <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing}>
                <Camera className="mr-2 h-4 w-4" />
                <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExportToPng(e as unknown as React.MouseEvent);
                }}
                disabled={isExportingPng}
              >
                <FileImage className="mr-2 h-4 w-4" />
                <span>{isExportingPng ? 'Exportando...' : 'Exportar a PNG: alta resolución'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setTimeout(focusTitle, 0);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                <span>Cambiar título</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void handleAddPage();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar nueva página</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Restaurar tamaño 600×400"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRestoreOriginalSize();
            }}
            style={{ color: '#000000' }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0 text-red-600 hover:bg-red-50"
            title="Eliminar apuntes"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0 text-gray-600 hover:bg-gray-200"
            title="Cerrar apuntes"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { hidden: true });
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div
          ref={contentRef}
          contentEditable={!isPreview}
          onInput={handleContentInput}
          onBlur={handleContentBlur}
          onTouchStart={(e) => {
            const target = contentRef.current || (e.currentTarget as HTMLElement);
            if (!shouldAllowTouchEdit(target)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).isContentEditable) {
              e.stopPropagation();
            }
          }}
          className={cn(
            'relative flex-1 px-4 py-2',
            'text-black whitespace-pre-wrap break-words select-text outline-none'
          )}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '14px',
            lineHeight: '24px',
            color: '#000000',
            overflowY: 'auto',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            backgroundColor: '#FFFFFF',
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px)',
            backgroundSize: '100% 24px',
            paddingTop: '8px',
            minHeight: 0,
          }}
        />
      )}

      {!isPreview && !isMinimized && (
        <div className="px-2 py-1.5 border-t flex items-center justify-between bg-gray-50 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Página anterior"
            onClick={() => void handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-xs text-gray-700">
            Página {currentPage + 1} de {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Página siguiente"
            onClick={() => void handlePageChange(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
          >
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 ml-2"
            title="Agregar página nueva"
            onClick={() => void handleAddPage()}
            disabled={pageCount >= MAX_PAGES}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 z-20">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      )}
    </div>
  );
}
