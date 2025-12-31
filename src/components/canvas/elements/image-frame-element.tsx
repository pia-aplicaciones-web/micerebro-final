'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { CommonElementProps, ImageFrameContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, RotateCw, ZoomIn, ZoomOut, Move, Minus, Maximize, Trash2 } from 'lucide-react';

function isImageFrameContent(content: unknown): content is ImageFrameContent {
  return typeof content === 'object' && content !== null;
}

export default function ImageFrameElement(props: CommonElementProps) {
  const {
    id,
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

  const frameContent: ImageFrameContent = isImageFrameContent(content)
    ? content
    : { url: '', zoom: 1, panX: 0, panY: 0, rotation: 0 };

  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { url, zoom = 1, panX = 0, panY = 0, rotation = 0 } = frameContent;

  // Zoom con scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5, zoom + delta));
    onUpdate(id, { content: { ...frameContent, zoom: newZoom } });
  }, [id, frameContent, zoom, onUpdate]);

  // Pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || !url) return;
    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    setStartPos({ x: e.clientX - panX, y: e.clientY - panY });
  }, [panX, panY, url]);

  // Pan move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const newPanX = e.clientX - startPos.x;
    const newPanY = e.clientY - startPos.y;
    onUpdate(id, { content: { ...frameContent, panX: newPanX, panY: newPanY } });
  }, [isPanning, startPos, id, frameContent, onUpdate]);

  // Pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Rotar
  const handleRotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    onUpdate(id, { content: { ...frameContent, rotation: newRotation } });
  }, [id, frameContent, rotation, onUpdate]);

  // DROP - Solo acepta imágenes arrastradas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1) Archivos directos
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newUrl = event.target?.result as string;
        onUpdate(id, { content: { url: newUrl, zoom: 1, panX: 0, panY: 0, rotation: 0 } });
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2) URL en text/uri-list
    const uriList = e.dataTransfer.getData('text/uri-list');
    if (uriList && (uriList.startsWith('http') || uriList.startsWith('data:'))) {
      onUpdate(id, { content: { url: uriList, zoom: 1, panX: 0, panY: 0, rotation: 0 } });
      return;
    }

    // 3) URL en text/plain
    const plain = e.dataTransfer.getData('text/plain');
    if (plain && (plain.startsWith('http') || plain.startsWith('data:'))) {
      onUpdate(id, { content: { url: plain, zoom: 1, panX: 0, panY: 0, rotation: 0 } });
      return;
    }

    // 4) Imagen desde clipboard base64 (custom)
    const customImage = e.dataTransfer.getData('application/x-image');
    if (customImage) {
      onUpdate(id, { content: { url: customImage, zoom: 1, panX: 0, panY: 0, rotation: 0 } });
    }
  }, [id, onUpdate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Zoom buttons
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(5, zoom + 0.25);
    onUpdate(id, { content: { ...frameContent, zoom: newZoom } });
  }, [id, frameContent, zoom, onUpdate]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.5, zoom - 0.25);
    onUpdate(id, { content: { ...frameContent, zoom: newZoom } });
  }, [id, frameContent, zoom, onUpdate]);

  // Toggle minimize (copiado del notepad)
  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as any)?.size || { width: 300, height: 300 };

    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 300,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 300,
    };

    if (isCurrentlyMinimized) {
      const { originalSize, ...restProps } = (properties || {}) as any;
      const restoredSize = originalSize || { width: 300, height: 300 };
      const newProperties = {
        ...restProps,
        size: restoredSize
      };

      onUpdate(id, {
        minimized: false,
        properties: newProperties,
        content: frameContent, // Asegurar que el contenido se preserve
      });
    } else {
      // Guardar el contenido actual antes de minimizar
      const updatedContent = { ...frameContent }; // No hay texto directo, pero se pasa el objeto completo
      const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 300;
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
  }, [isPreview, minimized, properties, onUpdate, id, frameContent]);

  return (
    <Card
      ref={containerRef}
      data-element-id={id}
      data-element-type="image-frame"
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'rounded-xl border border-gray-300',
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : '',
        isDragOver && 'ring-2 ring-green-500 bg-green-50',
        'shadow-sm hover:shadow-md transition-shadow'
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
      {/* Header - SIN botón subir */}
      <div className="drag-handle flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Marco</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            title="Alejar"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs text-gray-500 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            title="Acercar"
          >
            <ZoomIn className="h-3 w-3" />
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
            className="h-6 w-6 text-gray-400 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); deleteElement(id); }}
            title="Eliminar"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Área de imagen con pan/zoom - Solo acepta drag */}
      <div
        className={cn(
          'flex-1 relative overflow-hidden bg-gray-100',
          isPanning ? 'cursor-grabbing' : url ? 'cursor-grab' : 'cursor-default'
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {url ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={url}
              alt="Frame content"
              className="max-w-none"
              draggable={false}
              style={{ pointerEvents: 'none' }}
            />
          </div>
        ) : (
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed rounded m-2",
            isDragOver ? "border-green-500 bg-green-50 text-green-600" : "border-gray-300 text-gray-400"
          )}>
            <Move className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">{isDragOver ? "Suelta la imagen aquí" : "Arrastra una imagen aquí"}</p>
          </div>
        )}
      </div>

      {/* Botón de rotación en esquina derecha abajo - fuera del card */}
      {isSelected && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-1 right-1 h-7 w-7 p-1 bg-white/90 hover:bg-white rounded-full shadow-md border border-gray-200 z-20"
          onClick={(e) => { e.stopPropagation(); handleRotate(); }}
          title="Rotar 90°"
        >
          <RotateCw className="h-4 w-4 text-gray-700" />
        </Button>
      )}
    </Card>
  );
}
