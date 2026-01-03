'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { CommonElementProps, GalleryImage } from '@/lib/types';
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
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface PhotoCollageFreeContent {
  title: string;
  images: string[];
}

function isPhotoCollageFreeContent(content: unknown): content is PhotoCollageFreeContent {
  return typeof content === 'object' && content !== null && 'images' in content;
}

export default function PhotoCollageFreeElement(props: CommonElementProps) {
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
  } = props;

  const { toast } = useToast();

  // Sistema de auto-guardado
  const { handleChange } = useAutoSave({
    getContent: () => ({ ...collageContent }),
    onSave: (newContent) => {
      onUpdate(id, { content: newContent });
    },
    debounceMs: 1000,
  });

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const collageContent: PhotoCollageFreeContent = isPhotoCollageFreeContent(content)
    ? content
    : {
        title: 'Collage Libre',
        images: [],
      };

  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null);

  const { images, title } = collageContent;

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

  // Comprimir imagen
  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 600;
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

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newImages: any[] = [...images];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressedUrl = await compressImage(file);
        newImages.push({
          id: `img_${Date.now()}_${Math.random()}`,
          url: compressedUrl,
          filename: file.name,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }

    onUpdate(id, { content: { ...collageContent, images: newImages } as any });
  }, [id, collageContent, images, onUpdate]);

  const handleDeleteImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onUpdate(id, { content: { ...collageContent, images: newImages } as any });
  }, [id, collageContent, images, onUpdate]);

  const handleDeleteAll = useCallback(() => {
    onUpdate(id, { content: { ...collageContent, images: [] } });
  }, [id, collageContent, onUpdate]);

  const handleExportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
      });
      const link = document.createElement('a');
      link.download = `${collageContent.title || 'collage-libre'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({
        title: 'Exportado',
        description: 'El collage libre se ha exportado como PNG de alta resolución.',
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo exportar el collage.',
      });
    }
  }, [collageContent.title, toast]);

  return (
    <Card
      ref={containerRef}
      data-element-id={id}
      className={cn(
        'w-full h-full flex flex-col overflow-visible rounded-lg border border-gray-300 shadow-md',
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
        <div className="drag-handle flex items-center justify-between px-2 py-2 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2 flex-1 min-w-0">
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
                onUpdate(id, { content: { ...collageContent, title: newTitle } });
              }}
              className="flex-1 min-w-0 bg-transparent outline-none cursor-text font-headline text-sm font-semibold p-1"
              onClick={(e) => e.stopPropagation()}
              placeholder="Collage Libre"
              disabled={isPreview}
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-0.5 border-r border-gray-300 pr-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => fileInputRef.current?.click()}
                title="Añadir imágenes"
              >
                <Upload className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleExportPng}
                title="Exportar PNG"
              >
                <FileImage className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                title="Restaurar Tamaño Original"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize(); }}
              >
                <Maximize className="h-3 w-3" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 ml-1"
              title="Cerrar"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(id, { hidden: true });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {isHeaderHidden && (
        <div className="flex items-center justify-end px-2 py-1 bg-gray-50 border-b border-gray-200">
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

      <div className="flex-1 overflow-auto bg-white">
        {images.length > 0 ? (
          <div className="w-full h-full p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full h-full">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(index);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:bg-red-600"
                    title="Eliminar imagen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Collage Libre</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                Un contenedor blanco simple para organizar tus imágenes libremente.
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-50 hover:bg-gray-100"
              >
                <Upload className="w-4 h-4 mr-2" />
                Añadir imágenes
              </Button>
            </div>
          </div>
        )}
      </div>

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
