'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { CommonElementProps, PhotoGridContent, PhotoGridCell } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import {
  GripVertical,
  X,
  Upload,
  FileImage,
  Maximize,
  Grid3X3,
  Tag,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import html2canvas from 'html2canvas';


function isPhotoGridContent(content: unknown): content is PhotoGridContent {
  return typeof content === 'object' && content !== null && 'rows' in content && 'columns' in content;
}

// Comprimir imagen a max 72dpi y 200KB
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > 200 * 1024 * 1.37 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoGridAdaptiveElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    isSelected,
    onSelectElement,
    onEditElement,
    onUpdate,
    isPreview,
  } = props;

  const { toast } = useToast();

  // Sistema de auto-guardado
  const { handleChange } = useAutoSave({
    getContent: () => ({ ...gridContent }),
    onSave: (newContent) => {
      onUpdate(id, { content: newContent });
    },
    debounceMs: 1000, // Auto-guardar cada segundo
  });

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const gridContent: PhotoGridContent = isPhotoGridContent(content)
    ? content
    : { title: 'Guía de Fotos Adaptativa', rows: 2, columns: 2, cells: [], layoutMode: 'adaptive' };

  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null);

  const { rows, columns, cells, title } = gridContent;
  const totalCells = rows * columns;

  const paddedCells: PhotoGridCell[] = [...cells];
  while (paddedCells.length < totalCells) {
    paddedCells.push({ id: `cell-${paddedCells.length}`, url: '', caption: '', showCaption: false });
  }

  // Capturar tamaño original del elemento al montar
  useEffect(() => {
    if (properties?.size && !originalSizeRef.current) {
      originalSizeRef.current = {
        width: typeof properties.size.width === 'number' ? properties.size.width : parseFloat(String(properties.size.width)) || 600,
        height: typeof properties.size.height === 'number' ? properties.size.height : parseFloat(String(properties.size.height)) || 400,
      };
    }
  }, [properties?.size]);

  // Función para restaurar el tamaño original
  const handleRestoreOriginalSize = useCallback(() => {
    if (originalSizeRef.current) {
      onUpdate(id, {
        properties: {
          ...properties,
          size: originalSizeRef.current,
        },
      });
    }
  }, [id, onUpdate, properties]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newCells = [...paddedCells];
    let nextEmptyIndex = newCells.findIndex(c => !c.url);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (nextEmptyIndex === -1 || nextEmptyIndex >= totalCells) break;
      try {
        const compressedUrl = await compressImage(file);
        newCells[nextEmptyIndex] = {
          ...newCells[nextEmptyIndex],
          url: compressedUrl,
        };
        nextEmptyIndex = newCells.findIndex((c, i) => i > nextEmptyIndex && !c.url);
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }
    onUpdate(id, { content: { ...gridContent, cells: newCells } });
  }, [id, gridContent, paddedCells, totalCells, onUpdate]);

  const handleCaptionChange = useCallback((cellIndex: number, caption: string) => {
    const newCells = [...paddedCells];
    newCells[cellIndex] = { ...newCells[cellIndex], caption, showCaption: true };
    onUpdate(id, { content: { ...gridContent, cells: newCells } });
  }, [id, gridContent, paddedCells, onUpdate]);

  const toggleCaption = useCallback((cellIndex: number) => {
    const newCells = [...paddedCells];
    const current = newCells[cellIndex];
    newCells[cellIndex] = { ...current, showCaption: !current.showCaption };
    onUpdate(id, { content: { ...gridContent, cells: newCells } });
  }, [id, gridContent, paddedCells, onUpdate]);

  const handleDeleteImage = useCallback((cellIndex: number) => {
    const newCells = [...paddedCells];
    newCells[cellIndex] = { ...newCells[cellIndex], url: '', caption: '', showCaption: false };
    onUpdate(id, { content: { ...gridContent, cells: newCells } });
  }, [id, gridContent, paddedCells, onUpdate]);

  const handleRowsChange = useCallback((delta: number) => {
    const newRows = Math.max(1, Math.min(10, rows + delta));
    onUpdate(id, { content: { ...gridContent, rows: newRows } });
  }, [id, gridContent, rows, onUpdate]);

  const handleColumnsChange = useCallback((delta: number) => {
    const newColumns = Math.max(1, Math.min(10, columns + delta));
    onUpdate(id, { content: { ...gridContent, columns: newColumns } });
  }, [id, gridContent, columns, onUpdate]);

  const handleExportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
      });
      const link = document.createElement('a');
      link.download = `${gridContent.title || 'guia-fotos-adaptativa'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({
        title: 'Exportado',
        description: 'La guía se ha exportado como PNG de alta resolución.',
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo exportar la guía.',
      });
    }
  }, [gridContent.title, toast]);

  const gapSize = 16;
  const aspectClass = '';
  const gridTemplateRows = undefined;
  const gridTemplateColumns = undefined;
  const gridAutoRows = 'minmax(120px, auto)';

  return (
    <Card
      ref={containerRef}
      data-element-id={id}
      className={cn(
        'w-full h-full flex flex-col overflow-hidden rounded-lg border border-gray-300 shadow-md bg-white',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{ backgroundColor: '#ffffff' }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('.drag-handle')) {
          onEditElement(id);
        }
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
    >
      {!isHeaderHidden && (
      <div className="drag-handle flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setIsHeaderHidden(true)}
            title="Focus (ocultar header)"
          >
            <EyeOff className="h-3 w-3" />
          </Button>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              const newTitle = e.target.value;
              onUpdate(id, { content: { ...gridContent, title: newTitle } });
            }}
            onFocus={() => onSelectElement(id, false)}
            className="flex-1 min-w-0 bg-transparent outline-none cursor-text font-headline text-sm font-semibold p-1"
            onClick={(e) => e.stopPropagation()}
            placeholder=""
            disabled={isPreview}
          />
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
            <span className="text-[10px] text-gray-500" style={{ fontFamily: 'Space_Grotesk' }}>Filas</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRowsChange(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-[10px] font-medium w-4 text-center" style={{ fontFamily: 'Poppins' }}>{rows}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRowsChange(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
            <span className="text-[10px] text-gray-500" style={{ fontFamily: 'Space_Grotesk' }}>Cols</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleColumnsChange(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-[10px] font-medium w-4 text-center" style={{ fontFamily: 'Poppins' }}>{columns}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleColumnsChange(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()} title="Cargar imágenes">
            <Upload className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportPng} title="Exportar PNG">
            <FileImage className="h-3 w-3" />
          </Button>
          {/* Botón de Restaurar Tamaño Original */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Restaurar Tamaño Original"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize(); }}
          >
            <Maximize className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 ml-2"
            title="Cerrar"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { hidden: true });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      )}
      {isHeaderHidden && (
        <div className="flex items-center justify-end px-2 py-1 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-600"
            title="Mostrar header"
            onClick={() => setIsHeaderHidden(false)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {
        <div
          className="flex-1 p-2 overflow-auto"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: `${gapSize}px`,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {paddedCells.slice(0, totalCells).map((cell, index) => (
            <div
              key={cell.id || index}
              className={cn(
                'flex flex-col rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm',
              )}
              style={{
                flex: '0 1 auto',
                minWidth: '120px',
                maxWidth: '300px',
                width: 'auto'
              }}
            >
              <div className={cn(
                'relative flex items-center justify-center bg-gray-100',
              )}>
                {cell.url ? (
                  <>
                    <img
                      src={cell.url}
                      alt={cell.caption || ''}
                      className={cn(
                        'w-full object-cover',
                        'h-auto max-h-64'
                      )}
                      style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
                      draggable={false}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteImage(index); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>Vacío</span>
                )}
              </div>
              <div className="px-2 py-1 flex items-center justify-between border-t bg-white">
                <button
                  className="flex items-center gap-1 text-[10px] text-gray-600"
                  style={{ fontFamily: 'Space_Grotesk' }}
                  onClick={(e) => { e.stopPropagation(); toggleCaption(index); }}
                  title="Mostrar/Ocultar label"
                >
                  <Tag className="w-3 h-3" />
                </button>
              </div>
              {cell.showCaption && (
                <div className="p-2 border-t bg-white">
                  <input
                    type="text"
                    value={cell.caption || ''}
                    onChange={(e) => handleCaptionChange(index, e.target.value)}
                    placeholder="Comentario..."
                    className="w-full text-[10px] font-['Poppins'] bg-transparent border rounded px-2 py-1 outline-none"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => {}}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      }

      {/* Botón eliminar fuera del header */}
      <div className="absolute -top-2 -right-2 z-10">
        <Button
          variant="destructive"
          size="icon"
          className="h-6 w-6 rounded-full shadow-lg"
          title="Eliminar elemento"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(id, { hidden: true });
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
