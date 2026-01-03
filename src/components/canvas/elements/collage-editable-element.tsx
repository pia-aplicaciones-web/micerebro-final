'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import useImage from 'use-image';
import type { CommonElementProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera, ZoomIn, ZoomOut, RotateCw, Undo, Redo, Copy, Clipboard, Trash2 } from 'lucide-react';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';

// Función para calcular tamaño del lienzo según cantidad de fotos
function getCanvasSize(count: number) {
  if (count <= 2) return { width: 600, height: 600 };
  if (count <= 4) return { width: 800, height: 600 };
  return { width: 1000, height: 800 };
}

// Componente para imagen editable individual
interface CollageImageProps {
  image: CollageImageData;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<CollageImageData>) => void;
}

interface CollageImageData {
  id: string;
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

const CollageImage: React.FC<CollageImageProps> = ({ image, isSelected, onSelect, onChange }) => {
  const [img] = useImage(image.src);
  const shapeRef = useRef<any>();
  const trRef = useRef<any>();

  React.useEffect(() => {
    if (isSelected) {
      trRef.current?.nodes([shapeRef.current]);
      trRef.current?.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, [onChange]);

  const handleTransformEnd = useCallback((e: KonvaEventObject<Event>) => {
    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    });
  }, [onChange]);

  return (
    <>
      <KonvaImage
        image={img}
        x={image.x}
        y={image.y}
        width={image.width || (img ? img.width : 200)}
        height={image.height || (img ? img.height : 200)}
        draggable
        ref={shapeRef}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />

      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            // Limitar tamaño mínimo
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

// Componente principal del collage editable
interface CollageEditableElementProps extends CommonElementProps {
  content: {
    title: string;
    images: CollageImageData[];
  };
}

export default function CollageEditableElement({
  content,
  onUpdate,
  id,
  isSelected,
  onSelectElement,
  deleteElement,
  isPreview,
}: CollageEditableElementProps) {
  const [images, setImages] = useState<CollageImageData[]>(
    (content.images || []).map((img: any) => ({
      id: img.id,
      src: img.url,
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);
  const [history, setHistory] = useState<CollageImageData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<CollageImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcular tamaño del lienzo
  const canvasSize = getCanvasSize(images.length);

  // Auto-save
  const { handleChange } = useAutoSave({
    getContent: () => ({
      ...content,
      images: images.map(img => ({
        id: img.id,
        url: img.src,
        thumbnail: img.src,
      })),
    }),
    onSave: (newContent) => {
      onUpdate(id, { content: newContent });
    },
    debounceMs: 1000,
  });

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const newImages: CollageImageData[] = files.map((file, index) => ({
      id: crypto.randomUUID(),
      src: URL.createObjectURL(file),
      x: 50 + (index % 3) * 100,
      y: 50 + Math.floor(index / 3) * 100,
      width: 200,
      height: 200,
    }));

    setImages(prev => [...prev, ...newImages]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleImageChange = useCallback((id: string, newAttrs: Partial<CollageImageData>) => {
    setImages(prev =>
      prev.map(img =>
        img.id === id ? { ...img, ...newAttrs } : img
      )
    );
  }, []);

  const bringToFront = useCallback((id: string) => {
    setImages(prev => {
      const copy = [...prev];
      const index = copy.findIndex(img => img.id === id);
      if (index !== -1) {
        const [item] = copy.splice(index, 1);
        copy.push(item);
      }
      return copy;
    });
  }, []);

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  }, []);

  const handleStageTap = useCallback((e: KonvaEventObject<TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!onSelectElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fondo blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Dibujar imágenes
    const promises = images.map(img => {
      return new Promise<void>((resolve) => {
        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          ctx.drawImage(
            image,
            img.x,
            img.y,
            img.width || 200,
            img.height || 200
          );
          resolve();
        };
        image.src = img.src;
      });
    });

    await Promise.all(promises);

    const link = document.createElement('a');
    link.download = 'collage.png';
    link.href = canvas.toDataURL();
    link.click();
  }, [images, canvasSize, onSelectElement]);

  return (
    <Card
      className={cn(
        'relative border shadow-md rounded-lg overflow-visible',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onSelectElement?.(id, false)}
      style={{
        width: canvasSize.width + 40,
        height: canvasSize.height + 80,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="font-medium text-sm">Collage Editable</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2"
          >
            <Upload className="h-3 w-3 mr-1" />
            Subir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPNG}
            className="h-7 px-2"
          >
            <Camera className="h-3 w-3 mr-1" />
            PNG
          </Button>
          <SaveStatusIndicator status="idle" />
        </div>
      </div>

      {/* Canvas */}
      <div className="p-4">
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleStageClick}
          onTap={handleStageTap}
        >
          <Layer>
            {/* Lienzo blanco */}
            <Rect
              width={canvasSize.width}
              height={canvasSize.height}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {/* Imágenes */}
            {images.map((img) => (
              <CollageImage
                key={img.id}
                image={img}
                isSelected={selectedId === img.id}
                onSelect={() => {
                  handleSelect(img.id);
                  bringToFront(img.id);
                }}
                onChange={(newAttrs) => handleImageChange(img.id, newAttrs)}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Input oculto para subir archivos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Botón eliminar fuera del header */}
      {deleteElement && (
        <div className="absolute -top-2 -right-2 z-10">
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full shadow-lg"
            title="Eliminar elemento"
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Card>
  );
}

