'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BlockDibujo2Content, CommonElementProps } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GripVertical, Eraser, Pencil, Undo2, Trash2, X, MoreVertical, Plus, FileImage, Copy, Camera, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReactSketchCanvas } from 'react-sketch-canvas';

const DEFAULT_TITLE = 'Dibujar';
const DEFAULT_COLOR = '#111111';
const DEFAULT_BG = '#ffffff';
const DEFAULT_BRUSH = 6;

export default function BlockDibujo2Element(props: CommonElementProps) {
  const { id, content, onUpdate, deleteElement, isSelected, minimized } = props;
  const { toast } = useToast();

  const typedContent = (content || {}) as BlockDibujo2Content;
  const [title, setTitle] = useState(typedContent.title || DEFAULT_TITLE);
  const [strokeColor, setStrokeColor] = useState(typedContent.strokeColor || DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(typedContent.strokeWidth || DEFAULT_BRUSH);
  const [pages, setPages] = useState(typedContent.pages || (typedContent.paths ? [{ id: `page-${Date.now()}`, paths: typedContent.paths }] : [{ id: `page-${Date.now()}`, paths: [] }]));
  const [currentPage, setCurrentPage] = useState(typeof typedContent.currentPage === 'number' ? typedContent.currentPage : 0);
  const [isEraser, setIsEraser] = useState(false);
  const canvasRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setTitle(typedContent.title || DEFAULT_TITLE);
    setStrokeColor(typedContent.strokeColor || DEFAULT_COLOR);
    setStrokeWidth(typedContent.strokeWidth || DEFAULT_BRUSH);
    if (typedContent.pages && typedContent.pages.length > 0) {
      setPages(typedContent.pages);
      setCurrentPage(typeof typedContent.currentPage === 'number' ? typedContent.currentPage : 0);
    } else if (typedContent.paths) {
      setPages([{ id: `page-${Date.now()}`, paths: typedContent.paths }]);
      setCurrentPage(0);
    }
  }, [typedContent.title, typedContent.strokeColor, typedContent.strokeWidth, typedContent.pages, typedContent.currentPage, typedContent.paths]);

  useEffect(() => {
    if (!canvasRef.current || hasLoadedRef.current) return;
    const page = pages[currentPage];
    if (!page) return;
    hasLoadedRef.current = true;
    canvasRef.current.loadPaths(page.paths || []);
  }, [pages, currentPage]);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.eraseMode(isEraser);
  }, [isEraser]);

  const persistPaths = useCallback(async (withThumb = false) => {
    if (!canvasRef.current) return;
    try {
      const paths = await canvasRef.current.exportPaths();
      let thumbnail: string | undefined;
      if (withThumb) {
        try {
          thumbnail = await canvasRef.current.exportImage('png');
        } catch {
          thumbnail = undefined;
        }
      }
      const nextPages = pages.map((p, idx) => idx === currentPage ? { ...p, paths, ...(thumbnail ? { thumbnail } : {}) } : p);
      setPages(nextPages);
      const next: BlockDibujo2Content = {
        title,
        paths,
        pages: nextPages,
        currentPage,
        background: typedContent.background || DEFAULT_BG,
        strokeColor,
        strokeWidth,
      };
      onUpdate(id, { content: next });
    } catch {
      // no-op
    }
  }, [id, onUpdate, title, strokeColor, strokeWidth, typedContent.background]);

  const handleUndo = useCallback(async () => {
    if (!canvasRef.current) return;
    await canvasRef.current.undo();
    persistPaths();
  }, [persistPaths]);

  const handleClear = useCallback(async () => {
    if (!canvasRef.current) return;
    await canvasRef.current.clearCanvas();
    persistPaths();
  }, [persistPaths]);

  const handleAddPage = useCallback(async () => {
    await persistPaths(true);
    const nextPages = [...pages, { id: `page-${Date.now()}`, paths: [] }];
    setPages(nextPages);
    setCurrentPage(nextPages.length - 1);
    hasLoadedRef.current = false;
    canvasRef.current?.clearCanvas();
    onUpdate(id, { content: { ...typedContent, pages: nextPages, currentPage: nextPages.length - 1 } as BlockDibujo2Content });
  }, [pages, persistPaths, id, onUpdate, typedContent]);

  const handleSelectPage = useCallback(async (index: number) => {
    if (index === currentPage) return;
    await persistPaths(true);
    setCurrentPage(index);
    hasLoadedRef.current = false;
    canvasRef.current?.clearCanvas();
    const page = pages[index];
    if (page?.paths && canvasRef.current) {
      canvasRef.current.loadPaths(page.paths);
    }
    onUpdate(id, { content: { ...typedContent, pages, currentPage: index } as BlockDibujo2Content });
  }, [currentPage, pages, persistPaths, id, onUpdate, typedContent]);

  const handleCopyImage = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await canvasRef.current.exportImage('png');
      await navigator.clipboard.writeText(dataUrl);
    } catch {
      // no-op
    }
  }, []);

  const handleExportImage = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await canvasRef.current.exportImage('png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${title || 'block'}_pagina_${currentPage + 1}.png`;
      link.click();
    } catch {
      // no-op
    }
  }, [currentPage, title]);

  const handleOpenPdfInNewWindow = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await canvasRef.current.exportImage('png');
      const imageSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = dataUrl;
      });

      const pdf = new jsPDF({
        orientation: imageSize.width >= imageSize.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imageSize.width, imageSize.height],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, imageSize.width, imageSize.height);

      const blob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(blob);
      const opened = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        toast({
          variant: 'destructive',
          title: 'Ventana bloqueada',
          description: 'Permite pop-ups para abrir el PDF.',
        });
      }
    } catch (error) {
      console.error('Error al crear PDF de dibujar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el PDF.',
      });
    }
  }, [toast]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setTitle(next);
    onUpdate(id, { content: { ...typedContent, title: next } as BlockDibujo2Content });
  };

  if (minimized) {
    return (
      <Card className="w-full h-full border border-slate-200 shadow-md">
        <CardHeader className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 text-slate-400" />
            <div className="text-sm font-semibold truncate">{title}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => deleteElement?.(id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'relative w-full h-full border border-slate-200 shadow-md overflow-hidden',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      data-element-id={id}
      onPointerUp={() => persistPaths(false)}
      onMouseLeave={() => persistPaths(false)}
      data-element-type="block-dibujo-2"
    >
      <CardHeader className="p-2 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <Input
            value={title}
            onChange={handleTitleChange}
            data-dictation-target="true"
            className="h-7 text-sm font-semibold border-none shadow-none focus-visible:ring-0 p-1 pl-12 pr-24 bg-transparent"
          />
        </div>
      </CardHeader>

      {/* Controles exteriores */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 rounded-full shadow-md"
          onClick={() => deleteElement?.(id)}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 rounded-full shadow-md"
          onClick={() => onUpdate(id, { minimized: true } as any)}
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 rounded-full shadow-md"
          onClick={handleOpenPdfInNewWindow}
          title="Crear PDF y abrir"
        >
          <Printer className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full shadow-md" title="Más">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsEraser(false)}>
              <Pencil className="mr-2 h-4 w-4" />
              Lápiz
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEraser(true)}>
              <Eraser className="mr-2 h-4 w-4" />
              Borrador
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUndo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Deshacer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyImage}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar imagen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportImage}>
              <FileImage className="mr-2 h-4 w-4" />
              Exportar PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddPage}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar página
            </DropdownMenuItem>
            <div className="px-3 py-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">Color</span>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => {
                    setStrokeColor(e.target.value);
                    onUpdate(id, { content: { ...typedContent, strokeColor: e.target.value } as BlockDibujo2Content });
                  }}
                  className="h-6 w-8 border border-slate-200 rounded"
                  title="Color"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Grosor</span>
                <input
                  type="range"
                  min={2}
                  max={24}
                  value={strokeWidth}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setStrokeWidth(next);
                    onUpdate(id, { content: { ...typedContent, strokeWidth: next } as BlockDibujo2Content });
                  }}
                />
                <span className="text-xs text-slate-500 w-6 text-right">{strokeWidth}</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Botón drag exterior */}
      <div className="absolute top-2 left-2 z-10">
        <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shadow-md drag-handle" title="Arrastrar">
          <GripVertical className="h-5 w-5" />
        </Button>
      </div>

      <CardContent className="p-0 h-[calc(100%-48px)] bg-white flex">
        <div className="w-16 border-r border-slate-200 bg-slate-50 p-2 flex flex-col gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-md"
            onClick={handleAddPage}
            title="Agregar página"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {pages.map((page, idx) => (
              <button
                key={page.id}
                type="button"
                onClick={() => handleSelectPage(idx)}
                className={cn(
                  'w-10 h-12 rounded border text-[10px] flex items-center justify-center bg-white overflow-hidden',
                  idx === currentPage ? 'border-blue-500 ring-1 ring-blue-300' : 'border-slate-200'
                )}
                title={`Página ${idx + 1}`}
              >
                {page.thumbnail ? (
                  <img src={page.thumbnail} alt={`p${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400">{idx + 1}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          canvasColor={typedContent.background || DEFAULT_BG}
          className="w-full h-full"
        />
      </CardContent>
    </Card>
  );
}
