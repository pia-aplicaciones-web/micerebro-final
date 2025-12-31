'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { X, ImageIcon, Upload, Link as LinkIcon, Trash2 } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseStorage } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload-helper';
import { useToast } from '@/hooks/use-toast';
import AddImageFromUrlDialog from './add-image-from-url-dialog';
import ImageElement from './image-element';
import type { CommonElementProps, GalleryContent, GalleryImage } from '@/lib/types';
import { cn } from '@/lib/utils';

// Type guard para GalleryContent
function isGalleryContent(content: unknown): content is GalleryContent {
  return typeof content === 'object' && content !== null && 'images' in content;
}

export default function GalleryElement(props: CommonElementProps) {
  const { id, content, onUpdate, allElements = [], addElement, isSelected, isPreview } = props;

  const { user } = useAuthContext();
  const storage = getFirebaseStorage();
  const { toast } = useToast();

  const galleryContent: GalleryContent = isGalleryContent(content)
    ? { ...content, images: Array.isArray(content.images) ? content.images : [] }
    : { title: 'Galería', images: [] };

  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Actualizar el contenido de la galería
  const updateGalleryContent = useCallback((updates: Partial<GalleryContent>) => {
    const newContent: GalleryContent = {
      ...galleryContent,
      ...updates
    };
    // Verificar que onUpdate esté disponible antes de llamar
    if (onUpdate && id) {
      try {
        onUpdate(id, { content: newContent });
      } catch (error) {
        console.error("Error al actualizar contenido de galería:", error);
      }
    } else {
      console.warn("onUpdate o id no disponible para actualizar galería");
    }
  }, [galleryContent, onUpdate, id]);

  // Handler para subir imágenes desde archivo
  const handleUploadImage = useCallback(async () => {
    const userId = user?.uid;
    if (!userId || !storage) {
      toast({ title: 'Error', description: 'Debes iniciar sesión' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Permitir múltiples archivos

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const uploadedImages: GalleryImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await uploadFile(file, userId, storage);
          if (result.success && result.url) {
            uploadedImages.push({
              id: `img_${Date.now()}_${i}`,
              url: result.url,
              filename: file.name,
              uploadedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error al subir imagen:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: `No se pudo subir ${file.name}`
          });
        }
      }

      if (uploadedImages.length > 0) {
        const currentImages = Array.isArray(galleryContent.images) ? galleryContent.images : [];
        updateGalleryContent({
          images: [...currentImages, ...uploadedImages]
        });

        toast({
          title: 'Imágenes subidas',
          description: `${uploadedImages.length} imagen(es) agregada(s) a la galería`
        });
      }
    };

    input.click();
  }, [user, storage, galleryContent.images, updateGalleryContent, toast]);

  // Handler para agregar imagen desde URL
  const handleAddImageFromUrl = useCallback(async (url: string) => {
    const newImage: GalleryImage = {
      id: `img_${Date.now()}`,
      url: url,
      filename: `imagen_desde_url_${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };

    const currentImages = galleryContent.images || [];
    updateGalleryContent({
      images: [...currentImages, newImage]
    });

    toast({
      title: 'Imagen agregada',
      description: 'Imagen desde URL agregada a la galería'
    });
  }, [galleryContent.images, updateGalleryContent, toast]);

  // Handler para eliminar imagen
  const handleRemoveImage = useCallback((imageId: string) => {
    const currentImages = galleryContent.images || [];
    const updatedImages = currentImages.filter(img => img.id !== imageId);
    updateGalleryContent({ images: updatedImages });

    toast({
      title: 'Imagen eliminada',
      description: 'Imagen removida de la galería'
    });
  }, [galleryContent.images, updateGalleryContent, toast]);

  // Handler para limpiar todas las imágenes
  const handleClearAll = useCallback(() => {
    updateGalleryContent({ images: [] });
    toast({
      title: 'Galería limpiada',
      description: 'Todas las imágenes han sido eliminadas'
    });
  }, [updateGalleryContent, toast]);

  // Drag and Drop handlers para reordenar imágenes dentro de la galería
  const handleDragStart = useCallback((e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);

    // Encontrar la imagen correspondiente
    const image = galleryContent.images.find(img => img.id === imageId);
    if (image) {
      // Configurar dataTransfer para crear elemento image en el canvas
      const imageData = {
        id: imageId,
        url: image.url,
        filename: image.filename,
        type: 'image'
      };

      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/gallery-image', JSON.stringify(imageData));

      // También mantener compatibilidad con drag interno
      e.dataTransfer.setData('text/html', imageId);
    }
  }, [galleryContent.images]);

  const handleReorderDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleReorderDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedImageId) return;

    const draggedIndex = galleryContent.images.findIndex(img => img.id === draggedImageId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedImageId(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...galleryContent.images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, removed);

    const updatedContent: GalleryContent = {
      ...galleryContent,
      images: newImages,
    };
    onUpdate(id, { content: updatedContent });

    setDraggedImageId(null);
    setDragOverIndex(null);
  }, [id, galleryContent, draggedImageId, onUpdate]);

  // Drag and Drop: Recibir imágenes del canvas o archivos del sistema
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    // Primero intentar recibir elementos de imagen desde el canvas (por ID de elemento)
    const elementId = e.dataTransfer.getData('application/element-id');
    if (elementId) {
      const draggedElement = allElements.find(el => el.id === elementId);
      if (draggedElement && draggedElement.type === 'image') {
        const imageContent = draggedElement.content as { url: string };
        if (imageContent && imageContent.url) {
          // Verificar si la imagen ya existe en la galería
          const currentImages = galleryContent.images || [];
          const exists = currentImages.some(img => img.url === imageContent.url);

          if (!exists) {
            const newImage: GalleryImage = {
              id: `img_${Date.now()}`,
              url: imageContent.url,
              filename: `imagen_${Date.now()}`,
              uploadedAt: new Date().toISOString()
            };

            updateGalleryContent({
              images: [...currentImages, newImage]
            });

            toast({
              title: 'Imagen agregada',
              description: 'Imagen movida desde el canvas a la galería'
            });
          } else {
            toast({
              title: 'Imagen ya existe',
              description: 'Esta imagen ya está en la galería'
            });
          }
          return;
        }
      }
    }

    // Intentar el formato antiguo por compatibilidad
    const canvasImageData = e.dataTransfer.getData('application/canvas-image');
    if (canvasImageData) {
        try {
        const canvasImage = JSON.parse(canvasImageData) as { id: string; url: string; filename?: string };

        // Verificar si la imagen ya existe en la galería
        const currentImages = galleryContent.images || [];
        const exists = currentImages.some(img => img.url === canvasImage.url);

        if (!exists) {
          const newImage: GalleryImage = {
            id: `img_${Date.now()}`,
            url: canvasImage.url,
            filename: canvasImage.filename || `imagen_${Date.now()}`,
            uploadedAt: new Date().toISOString()
          };

          updateGalleryContent({
            images: [...currentImages, newImage]
          });

          toast({
            title: 'Imagen agregada',
            description: 'Imagen movida desde el canvas a la galería'
          });
        } else {
          toast({
            title: 'Imagen ya existe',
            description: 'Esta imagen ya está en la galería'
          });
        }
        return;
            } catch (error) {
        console.error('Error procesando imagen del canvas:', error);
      }
    }

    // Si no es una imagen del canvas, procesar como archivos normales
    const userId = user?.uid;
    if (!userId || !storage) return;

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) return;

    const uploadedImages: GalleryImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadFile(file, userId, storage);
        if (result.success && result.url) {
          uploadedImages.push({
            id: `img_${Date.now()}_${i}`,
            url: result.url,
            filename: file.name,
            uploadedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error al subir imagen por drag & drop:', error);
      }
    }

    if (uploadedImages.length > 0) {
      const currentImages = galleryContent.images || [];
      updateGalleryContent({
        images: [...currentImages, ...uploadedImages]
      });

      toast({
        title: 'Imágenes agregadas',
        description: `${uploadedImages.length} imagen(es) agregada(s) por drag & drop`
      });
    }
  }, [user, storage, galleryContent.images, updateGalleryContent, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const images = galleryContent.images || [];

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-lg border border-gray-200/50 bg-white">
      {/* HEADER */}
      <CardHeader className="p-3 border-b border-green-600 bg-[#bad324] flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold text-white font-['Space_Grotesk']">
            {galleryContent.title || 'Mi galería'}
          </span>
        </div>
        
        {/* Dropdown con opciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-green-600">
                <ImageIcon className="h-4 w-4" />
          </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={() => setIsImageUrlDialogOpen(true)}>
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Desde URL</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUploadImage}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Subir</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUploadImage}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Subir múltiples</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClearAll}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Limpiar todo</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent 
        className="flex-1 p-3 overflow-auto bg-white relative"
        style={{ minHeight: 0 }}
        onDrop={handleDrop} // This is for dropping images from canvas or files into the gallery
        onDragOver={handleDragOver}
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400 space-y-4">
            <ImageIcon className="h-12 w-12 text-gray-300" />
            <div className="text-center">
              <p>No hay imágenes en la galería</p>
              <p className="text-xs mt-1">Arrastra imágenes aquí o usa los botones arriba</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image, index) => (
                <div
                  key={image.id}
                  className={cn(
                  'relative group cursor-move',
                  draggedImageId === image.id && 'opacity-50',
                  dragOverIndex === index && 'ring-2 ring-blue-500'
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, image.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleReorderDrop(e, index)}
                >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing">
                    <img
                      src={image.url}
                    alt={image.filename}
                      className="w-full h-full object-cover"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/gallery-image', JSON.stringify(image));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                      onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">Error</div>';
                    }}
                    />
                  </div>
                  
                {/* Overlay con opciones */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveImage(image.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Nombre del archivo */}
                <p className="text-xs text-gray-600 mt-1 truncate" title={image.filename}>
                  {image.filename}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Diálogo para agregar imagen desde URL */}
      <AddImageFromUrlDialog
        isOpen={isImageUrlDialogOpen}
        onClose={() => setIsImageUrlDialogOpen(false)}
        onAddImage={handleAddImageFromUrl}
      />
    </Card>
  );
}
