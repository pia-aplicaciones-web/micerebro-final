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

export default function GalleryElement(props: CommonElementProps & { getViewportCenter?: () => { x: number; y: number } }) {
  const { id, content, onUpdate, allElements = [], addElement, isSelected, isPreview, getViewportCenter } = props;

  const { user } = useAuthContext();
  const storage = getFirebaseStorage();
  const { toast } = useToast();

  const galleryContent: GalleryContent = isGalleryContent(content)
    ? { ...content, images: Array.isArray(content.images) ? content.images : [], elementIds: Array.isArray((content as GalleryContent).elementIds) ? (content as GalleryContent).elementIds : [] }
    : { title: 'Galería', images: [], elementIds: [] };

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

  // Soltar elemento de la galería al centro del viewport (solo para elementos no-imagen)
  const handleReleaseToViewportCenter = useCallback((elementId: string) => {
    const element = allElements.find(el => el.id === elementId);
    if (!element || !getViewportCenter) return;

    const center = getViewportCenter();
    const w = (element.width ?? (element.properties as any)?.size?.width) ?? 300;
    const h = (element.height ?? (element.properties as any)?.size?.height) ?? 200;
    const width = typeof w === 'number' ? w : parseFloat(String(w)) || 300;
    const height = typeof h === 'number' ? h : parseFloat(String(h)) || 200;
    const x = center.x - width / 2;
    const y = center.y - height / 2;

    const currentElementIds = galleryContent.elementIds || [];
    updateGalleryContent({ elementIds: currentElementIds.filter(eid => eid !== elementId) });
    onUpdate(elementId, {
      parentId: undefined,
      hidden: false,
      x,
      y,
      properties: {
        ...(typeof element.properties === 'object' && element.properties ? element.properties : {}),
        position: { x, y },
      },
    });
    toast({ title: 'Elemento en el tablero', description: 'Se colocó en el centro de la vista' });
  }, [allElements, getViewportCenter, galleryContent.elementIds, onUpdate, updateGalleryContent, toast]);

  // Handler para limpiar todo (imágenes y elementos): elementos se sueltan al centro
  const handleClearAll = useCallback(() => {
    const ids = galleryContent.elementIds || [];
    ids.forEach((elementId) => handleReleaseToViewportCenter(elementId));
    updateGalleryContent({ images: [], elementIds: [] });
    toast({
      title: 'Galería limpiada',
      description: ids.length ? 'Elementos enviados al tablero; imágenes eliminadas.' : 'Todas las imágenes han sido eliminadas'
    });
  }, [updateGalleryContent, toast, galleryContent.elementIds, handleReleaseToViewportCenter]);

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

  // Drag and Drop: Recibir imágenes o cualquier elemento desde el canvas
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const elementId = e.dataTransfer.getData('application/element-id');
    if (elementId) {
      const draggedElement = allElements.find(el => el.id === elementId);
      if (draggedElement) {
        if (draggedElement.type === 'image') {
          const imageContent = draggedElement.content as { url: string };
          if (imageContent?.url) {
            const currentImages = galleryContent.images || [];
            const exists = currentImages.some(img => img.url === imageContent.url);
            if (!exists) {
              const newImage: GalleryImage = {
                id: `img_${Date.now()}`,
                url: imageContent.url,
                filename: `imagen_${Date.now()}`,
                uploadedAt: new Date().toISOString()
              };
              updateGalleryContent({ images: [...currentImages, newImage] });
              toast({ title: 'Imagen agregada', description: 'Imagen movida desde el canvas a la galería' });
            } else {
              toast({ title: 'Imagen ya existe', description: 'Esta imagen ya está en la galería' });
            }
            return;
          }
        }
        // Cualquier otro tipo de elemento: guardar por referencia en elementIds
        const currentElementIds = galleryContent.elementIds || [];
        if (currentElementIds.includes(elementId)) {
          toast({ title: 'Ya en galería', description: 'Este elemento ya está en la galería' });
          return;
        }
        updateGalleryContent({ elementIds: [...currentElementIds, elementId] });
        onUpdate(elementId, { parentId: id, hidden: true });
        toast({ title: 'Elemento agregado', description: 'Elemento movido a la galería. Usa el icono de ancla para sacarlo al tablero.' });
        return;
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
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const images = galleryContent.images || [];
  const elementIds = galleryContent.elementIds || [];
  const hasAnyItems = images.length > 0 || elementIds.length > 0;

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-lg border border-gray-200/50 bg-white">
      {/* HEADER: título "Mi galería" a la izquierda y abajo */}
      <CardHeader className="p-3 pt-4 border-b border-green-600 bg-[#bad324] flex flex-col justify-end min-h-[52px]">
        <div className="flex flex-row items-end justify-between w-full mt-auto">
          <span className="text-sm font-semibold text-white font-['Space_Grotesk']">
            {galleryContent.title || 'Mi galería'}
          </span>
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
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent 
        className="flex-1 p-3 overflow-auto bg-white relative"
        style={{ minHeight: 0 }}
        onDrop={handleDrop} // This is for dropping images from canvas or files into the gallery
        onDragOver={handleDragOver}
      >
        {!hasAnyItems ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400 space-y-4">
            <ImageIcon className="h-12 w-12 text-gray-300" />
            <div className="text-center">
              <p>No hay elementos en la galería</p>
              <p className="text-xs mt-1">Arrastra imágenes o cualquier elemento del tablero aquí</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                onDragOver={handleDragOver}
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

          {/* Elementos (no-imagen): icono ancla para sacar al centro del viewport */}
          {elementIds.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Elementos del tablero</p>
              <div className="grid grid-cols-2 gap-3">
                {elementIds.map((elementId) => {
                  const element = allElements.find(el => el.id === elementId);
                  if (!element) return null;
                  const label = element.type === 'text' ? (typeof element.content === 'string' ? element.content.slice(0, 20) : 'Texto') : element.type === 'notepad' || element.type === 'yellow-notepad' ? (element.content as any)?.title || 'Cuaderno' : element.type;
                  return (
                    <div
                      key={elementId}
                      className="relative group bg-gray-50 rounded-lg border border-gray-200 p-2 flex flex-col items-center justify-center min-h-[80px]"
                    >
                      <span className="text-[10px] text-gray-600 truncate w-full text-center mb-1">{String(label)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Sacar al tablero (centro de la vista)"
                        onClick={() => handleReleaseToViewportCenter(elementId)}
                      >
                        <LinkIcon className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        )}
      </CardContent>

      {/* Diálogo para agregar imagen desde URL */}
      <AddImageFromUrlDialog
        isOpen={isImageUrlDialogOpen}
        onOpenChange={setIsImageUrlDialogOpen}
        onAddImage={handleAddImageFromUrl}
      />
    </Card>
  );
}
