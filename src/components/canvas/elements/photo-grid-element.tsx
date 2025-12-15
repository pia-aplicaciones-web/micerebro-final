'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { CommonElementProps, PhotoGridContent, PhotoGridCell } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  X,
  Upload,
  Trash2,
  Minus,
  Plus,
  FileImage,
  Maximize,
  Grid3X3,
  MessageSquare,
  Tag,
  Eye,
  EyeOff,
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

export type PhotoGridLayoutMode = 'default' | 'horizontal' | 'adaptive';

export default function PhotoGridElement(props: CommonElementProps) {
  const {
    id,
    type,
    content,
    properties,
    isSelected,
    onSelectElement,
    onEditElement,
    onUpdate,
    deleteElement,
    isPreview,
    minimized,
  } = props;

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const gridContent: PhotoGridContent = isPhotoGridContent(content)
    ? content
    : { title: 'Guía de Fotos', rows: 2, columns: 2, cells: [], layoutMode: 'default' };

  // Determinar layout por tipo
  const layoutMode: PhotoGridLayoutMode = gridContent.layoutMode ||
    (type === 'photo-grid-horizontal' ? 'horizontal' : type === 'photo-grid-adaptive' ? 'adaptive' : 'default');

  const [draggedCellIndex, setDraggedCellIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // const { bindDictationTarget } = useDictationBinding({
  //   isListening,
  //   finalTranscript,
  //   interimTranscript,
  //   isSelected,
  // });

  const { rows, columns, cells, title } = gridContent;
  const totalCells = rows * columns;

  const paddedCells: PhotoGridCell[] = [...cells];
  while (paddedCells.length < totalCells) {
    paddedCells.push({ id: `cell-${paddedCells.length}`, url: '', caption: '', showCaption: false });
  }

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

  const handleDeleteAll = useCallback(() => {
    const emptyCells = Array.from({ length: totalCells }, (_, i) => ({
      id: `cell-${i}`,
      url: '',
      caption: '',
      showCaption: false,
    }));
    onUpdate(id, { content: { ...gridContent, cells: emptyCells } });
  }, [id, gridContent, totalCells, onUpdate]);

  const handleRowsChange = useCallback((delta: number) => {
    const newRows = Math.max(1, Math.min(10, rows + delta));
    onUpdate(id, { content: { ...gridContent, rows: newRows } });
  }, [id, gridContent, rows, onUpdate]);

  const handleColumnsChange = useCallback((delta: number) => {
    const newColumns = Math.max(1, Math.min(10, columns + delta));
    onUpdate(id, { content: { ...gridContent, columns: newColumns } });
  }, [id, gridContent, columns, onUpdate]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!paddedCells[index].url) return;
    setDraggedCellIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [paddedCells]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCellIndex !== null && draggedCellIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedCellIndex]);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCellIndex === null || draggedCellIndex === targetIndex) {
      setDraggedCellIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newCells = [...paddedCells];
    const temp = newCells[draggedCellIndex];
    newCells[draggedCellIndex] = newCells[targetIndex];
    newCells[targetIndex] = temp;
    onUpdate(id, { content: { ...gridContent, cells: newCells } });
    setDraggedCellIndex(null);
    setDragOverIndex(null);
  }, [draggedCellIndex, id, gridContent, paddedCells, onUpdate]);

  const handleDragEnd = useCallback(() => {
    setDraggedCellIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
      });
      const link = document.createElement('a');
      link.download = `${gridContent.title || 'guia-fotos'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  }, [gridContent.title]);

  const gapSize = layoutMode === 'adaptive' ? 16 : 12;
  const aspectClass = layoutMode === 'horizontal' ? 'aspect-[4/3]' : layoutMode === 'adaptive' ? '' : 'aspect-square';
  const gridTemplateRows = layoutMode === 'adaptive' ? undefined : `repeat(${rows}, 1fr)`;
  const gridTemplateColumns = layoutMode === 'adaptive' ? undefined : `repeat(${columns}, 1fr)`;
  const gridAutoRows = layoutMode === 'adaptive' ? 'minmax(120px, auto)' : undefined;

  // Toggle minimize (copiado del notepad)
  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as any)?.size || { width: 400, height: 400 };

    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 400,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 400,
    };

    if (isCurrentlyMinimized) {
      const { originalSize, ...restProps } = (properties || {}) as any;
      const restoredSize = originalSize || { width: 400, height: 400 };
      const newProperties = {
        ...restProps,
        size: restoredSize
      };

      onUpdate(id, {
        minimized: false,
        properties: newProperties,
        content: gridContent, // Asegurar que el contenido se preserve
      });
    } else {
      // Guardar el contenido actual antes de minimizar
      const updatedContent = { ...gridContent }; // No hay texto directo, pero se pasa el objeto completo
      const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 400;
      onUpdate(id, {
        minimized: true,
        properties: {
          ...properties,
          size: { width: currentWidth, height: 48 },
          originalSize: currentSizeNumeric
        },
        content: updatedContent, // Guardar el contenido actualizado
      });
    }
  }, [isPreview, minimized, properties, onUpdate, id, gridContent]);

  return (
    <Card
      ref={containerRef}
      data-element-id={id}
      data-element-type={type}
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
          <Grid3X3 className="h-4 w-4 text-gray-600" />
          <div
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onInput={(e) => {
              const newTitle = e.currentTarget.textContent || title;
              onUpdate(id, { content: { ...gridContent, title: newTitle } });
            }}
            onFocus={() => onSelectElement(id, false)}
            className="text-[10px] font-medium text-gray-700 outline-none cursor-text"
            style={{ fontFamily: 'Poppins' }}
            data-placeholder="Título"
          >
            {title}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
            <span className="text-[10px] text-gray-500" style={{ fontFamily: 'Poppins' }}>Filas</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRowsChange(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-[10px] font-medium w-4 text-center" style={{ fontFamily: 'Poppins' }}>{rows}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRowsChange(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
            <span className="text-[10px] text-gray-500" style={{ fontFamily: 'Poppins' }}>Cols</span>
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
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDeleteAll} title="Eliminar todas">
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportPng} title="Exportar PNG">
            <FileImage className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title={minimized ? "Maximizar" : "Minimizar"}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleMinimize(e); }}
          >
            {minimized ? <Maximize className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
            onClick={(e) => { e.stopPropagation(); onUpdate(id, { properties: { ...properties, minimized: true } }); }}
            title="Cerrar"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsHeaderHidden(true)}
            title="Focus (ocultar header)"
          >
            <EyeOff className="h-3 w-3" />
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

      {!isCollapsed && (
        <div
          className="flex-1 p-2 overflow-auto"
          style={{
            display: layoutMode === 'adaptive' ? 'flex' : 'grid',
            flexWrap: layoutMode === 'adaptive' ? 'wrap' : undefined,
            justifyContent: layoutMode === 'adaptive' ? 'flex-start' : undefined,
            alignItems: layoutMode === 'adaptive' ? 'flex-start' : undefined,
            gridTemplateRows,
            gridTemplateColumns,
            gridAutoRows,
            gap: `${gapSize}px`,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {paddedCells.slice(0, totalCells).map((cell, index) => (
            <div
              key={cell.id || index}
              className={cn(
                'flex flex-col rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm',
                draggedCellIndex === index && 'opacity-50',
                dragOverIndex === index && 'ring-2 ring-blue-500'
              )}
              style={layoutMode === 'adaptive' ? {
                flex: '0 1 auto',
                minWidth: '120px',
                maxWidth: '300px',
                width: 'auto'
              } : undefined}
              draggable={!!cell.url}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={cn(
                'relative flex items-center justify-center bg-gray-100',
                layoutMode === 'adaptive' ? '' : (aspectClass || 'aspect-square')
              )}>
                {cell.url ? (
                  <>
                    <img
                      src={cell.url}
                      alt={cell.caption || ''}
                      className={cn(
                        'w-full object-cover',
                        layoutMode === 'adaptive' ? 'h-auto max-h-64' : 'h-full'
                      )}
                      style={layoutMode === 'adaptive' ? { objectFit: 'contain', width: '100%', height: 'auto' } : undefined}
                      draggable={false}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteImage(index); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      title="Eliminar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>Vacío</span>
                )}
              </div>
              <div className="px-2 py-1 flex items-center justify-between border-t bg-white">
                <button
                  className="flex items-center gap-1 text-[10px] text-gray-600"
                  style={{ fontFamily: 'Poppins' }}
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
      )}
    </Card>
  );
}
