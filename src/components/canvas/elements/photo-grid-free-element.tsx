'use client';

import React, { useState, useCallback } from 'react';
import type { CommonElementProps, PhotoGridFreeContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ImageIcon, Upload, Link as LinkIcon, X, Minus } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseStorage } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload-helper';
import { useToast } from '@/hooks/use-toast';
import AddImageFromUrlDialog from './add-image-from-url-dialog';
import ImageElement from './image-element';

// Type guard para PhotoGridFreeContent
function isPhotoGridFreeContent(content: unknown): content is PhotoGridFreeContent {
  return typeof content === 'object' && content !== null && 'title' in content;
}

export default function PhotoGridFreeElement(props: CommonElementProps) {
  const { id, content, onUpdate, allElements = [], addElement, properties, isPreview = false } = props;

  const { user } = useAuthContext();
  const storage = getFirebaseStorage();
  const { toast } = useToast();

  const gridContent: PhotoGridFreeContent = isPhotoGridFreeContent(content)
    ? content
    : { title: 'Guía de Fotos Libre' };

  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);

  // Handler clonado exactamente del menú principal (BoardPageClient.tsx líneas 386-411)
  const handleUploadImage = useCallback(async () => {
    const userId = user?.uid;
    if (!userId || !storage) {
      toast({ title: 'Error', description: 'Debes iniciar sesión' });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const result = await uploadFile(file, userId, storage);
        if (result.success) {
          // Calcular posición central del contenedor
          const containerWidth = 600; // ancho del contenedor
          const containerHeight = 500; // alto del contenedor
          const imageWidth = 300;
          const imageHeight = 200;
          const centerX = (containerWidth - imageWidth) / 2;
          const centerY = (containerHeight - imageHeight) / 2;

          await addElement('image', {
            content: { url: result.url },
            properties: {
              size: { width: imageWidth, height: imageHeight },
              position: { x: centerX, y: centerY }
            },
            parentId: id
          });
          toast({ title: 'Imagen subida' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      } catch {
        toast({ variant: 'destructive', title: 'Error al subir imagen' });
      }
    };
    input.click();
  }, [user, storage, addElement, toast, id]);

  // Filtrar imágenes hijas
  const childImages = allElements.filter(el => el.parentId === id && el.type === 'image');

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-lg border border-gray-200/50 bg-white">
      {/* HEADER */}
      <CardHeader className="p-3 border-b border-green-600 bg-[#bad324] flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onInput={(e) => {
              const newTitle = e.currentTarget.textContent || gridContent.title;
              onUpdate(id, { content: { ...gridContent, title: newTitle } });
            }}
            onFocus={() => onUpdate(id, { isSelected: true })}
            className="text-sm font-semibold text-white font-['Space_Grotesk'] outline-none cursor-text"
            data-placeholder="Título"
          >
            {gridContent.title}
          </div>
        </div>

        {/* Botones del header */}
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
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-green-700"
            title="Minimizar"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { properties: { ...properties, minimized: true } });
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-green-700"
            title="Cerrar"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { properties: { ...properties, minimized: true } });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* CONTENT - Área limpia sin grid */}
      <CardContent className="flex-1 p-3 overflow-auto bg-white relative" style={{ minHeight: 0 }}>
        {childImages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Haz clic en el icono de imagen para añadir fotos
          </div>
        ) : (
          <div className="relative w-full h-full">
            {childImages.map((imageElement) => (
              <div
                key={imageElement.id}
                className="absolute"
                style={{
                  left: imageElement.x || 0,
                  top: imageElement.y || 0,
                  width: imageElement.width || 300,
                  height: imageElement.height || 200,
                }}
              >
                <ImageElement
                  {...props}
                  id={imageElement.id}
                  content={imageElement.content}
                  onUpdate={(elementId, updates) => {
                    // Delegar la actualización al padre
                    if (props.onUpdate) {
                      props.onUpdate(elementId, updates);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Diálogo clonado del menú principal */}
      <AddImageFromUrlDialog
        isOpen={isImageUrlDialogOpen}
        onOpenChange={setIsImageUrlDialogOpen}
        onAddImage={async (url) => {
          // Calcular posición central del contenedor
          const containerWidth = 600;
          const containerHeight = 500;
          const imageWidth = 300;
          const imageHeight = 200;
          const centerX = (containerWidth - imageWidth) / 2;
          const centerY = (containerHeight - imageHeight) / 2;

          await addElement('image', {
            content: { url },
            properties: {
              size: { width: imageWidth, height: imageHeight },
              position: { x: centerX, y: centerY }
            },
            parentId: id
          });
          setIsImageUrlDialogOpen(false);
        }}
      />
    </Card>
  );
}