'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import {
  GripVertical,
  X,
  Upload,
  Trash2,
  FileImage,
  Maximize,
  Eye,
  EyeOff,
  Camera,
  MoreVertical,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { ReactPhotoCollage, Photo } from 'react-photo-collage';

interface PhotoCollageContent {
  title: string;
  photos: Photo[];
  width: number;
  height: number;
}

function isPhotoCollageContent(content: unknown): content is PhotoCollageContent {
  return typeof content === 'object' && content !== null && 'photos' in content;
}

export default function PhotoCollageElement(props: CommonElementProps) {
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
  const collageContent: PhotoCollageContent = isPhotoCollageContent(content)
    ? content
    : {
        title: 'Collage de Fotos',
        photos: [],
        width: 800,
        height: 600,
      };

  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null);

  const { photos, title, width, height } = collageContent;

  // Capturar tamaño original del elemento al montar
  useEffect(() => {
    if (properties?.size && !originalSizeRef.current) {
      originalSizeRef.current = {
        width: typeof properties.size.width === 'number' ? properties.size.width : parseFloat(String(properties.size.width)) || 800,
        height: typeof properties.size.height === 'number' ? properties.size.height : parseFloat(String(properties.size.height)) || 600,
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

  // Comprimir imagen para collage
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

    const newPhotos: Photo[] = [...photos];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressedUrl = await compressImage(file);
        newPhotos.push({
          source: compressedUrl,
          alt: file.name,
        });
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }

    onUpdate(id, { content: { ...collageContent, photos: newPhotos } });
  }, [id, collageContent, photos, onUpdate]);

  const handleDeleteAll = useCallback(() => {
    onUpdate(id, { content: { ...collageContent, photos: [] } });
  }, [id, collageContent, onUpdate]);

  const handleExportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
      });
      const link = document.createElement('a');
      link.download = `${collageContent.title || 'collage-fotos'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({
        title: 'Exportado',
        description: 'El collage se ha exportado como PNG de alta resolución.',
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

  // Nueva función: Exportar captura usando html-to-image
  const handleExportCapture = useCallback(async () => {
    try {
      const collageElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!collageElement) {
        console.error('No se pudo encontrar el elemento del collage');
        return;
      }

      console.log('Capturando collage...');
      setIsCapturing(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      const checkFontsLoaded = () => {
        return document.fonts.check('14px "Poppins", sans-serif') ||
               document.fonts.check('14px "Space Grotesk", sans-serif') ||
               document.fonts.check('14px "Patrick Hand", cursive');
      };

      let fontsReady = checkFontsLoaded();
      if (!fontsReady) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (checkFontsLoaded() || document.fonts.status === 'loaded') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 1500);
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(collageElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: '#ffffff',
        includeQueryParams: false,
        skipFonts: true,
        width: collageElement.offsetWidth,
        height: collageElement.offsetHeight,
        filter: (element) => {
          if (element.tagName === 'LINK' && element.getAttribute('href')?.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });

      setIsCapturing(false);

      const link = document.createElement('a');
      link.download = `collage-captura-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      console.log('Captura del collage completada');
    } catch (error: any) {
      setIsCapturing(false);
      console.error('Error en captura del collage:', error);
      console.error('Error message:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error en captura',
        description: 'No se pudo capturar el collage.',
      });
    }
  }, [id, toast]);

  return (
    <Card
      ref={containerRef}
      data-element-id={id}
      data-element-type="photo-collage"
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
        <div className="drag-handle flex items-center justify-between px-2 py-2 bg-white border-b border-gray-200 cursor-grab active:cursor-grabbing">
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
              placeholder="Título del collage"
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
                title="Restaurar Tamaño Original"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize(); }}
              >
                <Maximize className="h-3 w-3" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  title="Más opciones"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing}>
                  <Camera className="mr-2 h-4 w-4" />
                  <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleExportPng(); }}>
                  <FileImage className="mr-2 h-4 w-4" />
                  <span>Exportar PNG</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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

      <div className="flex-1 overflow-hidden">
        <div className="w-full h-full bg-white border-t border-gray-200">
          {photos.length > 0 ? (
            <div className="w-full h-full p-4 flex items-center justify-center">
              <div className="w-full max-w-4xl">
                <ReactPhotoCollage
                  width={Math.min(width - 32, 800).toString()}
                  height={Math.min(height - 32, 600).toString()}
                  layout={[3, 2]}
                  photos={photos}
                  showNumOfRemainingPhotos={true}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Collage de Fotos</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">
                  Crea collages automáticos con tus fotos. Sube varias imágenes para generar layouts profesionales.
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Añadir fotos
                </Button>
              </div>
            </div>
          )}
        </div>
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