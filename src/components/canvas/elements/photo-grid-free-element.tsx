'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { CommonElementProps, PhotoGridFreeContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, X, Maximize, GripVertical, FileImage, Trash2, Type } from 'lucide-react'; // Eliminado Minus
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseStorage } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload-helper';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import html2canvas from 'html2canvas';
import AddImageFromUrlDialog from './add-image-from-url-dialog';
import ImageElement from './image-element';

// Type guard para PhotoGridFreeContent
function isPhotoGridFreeContent(content: unknown): content is PhotoGridFreeContent {
    return typeof content === 'object' && content !== null && 'title' in content;
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

export default function PhotoGridFreeElement(props: CommonElementProps) {
    const { id, content, onUpdate, allElements = [], addElement, properties, isPreview = false, onSelectElement } = props;

    const { user } = useAuthContext();
    const storage = getFirebaseStorage();
    const { toast } = useToast();

    // Sistema de auto-guardado para el contenido principal
    const { handleChange } = useAutoSave({
      getContent: () => ({ ...gridContent }),
      onSave: (newContent) => {
        onUpdate(id, { content: newContent });
      },
      debounceMs: 1000, // Auto-guardar cada segundo
    });

    // Sistema de auto-guardado para las imágenes del recibidor
    const { handleChange: handleRecibidorChange } = useAutoSave({
      getContent: () => [...recibidorImages],
      onSave: (newImages) => {
        // Guardar las imágenes del recibidor en el content del elemento
        onUpdate(id, { content: { ...gridContent, recibidorImages: newImages } as any });
      },
      debounceMs: 500, // Auto-guardar más frecuentemente para el recibidor
    });

    const gridContent: PhotoGridFreeContent = isPhotoGridFreeContent(content)
        ? content
        : { title: 'Guía de Fotos Libre' };

    // Cargar imágenes del recibidor desde el content guardado
    const savedRecibidorImages = (content as any)?.recibidorImages || [];

    const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
    const originalSizeRef = useRef<{ width: number; height: number } | null>(null); // Ref para el tamaño original
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); // Ref para el contenedor del contenido

    // Estado para arrastre de imágenes dentro del contenedor
    const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
    const [imageStartPos, setImageStartPos] = useState<{ x: number; y: number } | null>(null);

    // Estado para el contenedor recibidor (imágenes y textos)
    const [recibidorImages, setRecibidorImages] = useState<Array<{
        id: string;
        // Para imágenes
        src?: string;
        alt?: string;
        // Para textos
        text?: string;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        backgroundColor?: string;
        borderWidth?: number;
        // Comunes
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        zIndex: number;
    }>>(savedRecibidorImages);
    const [draggedRecibidorImageId, setDraggedRecibidorImageId] = useState<string | null>(null);
    const [resizingRecibidorImageId, setResizingRecibidorImageId] = useState<string | null>(null);
    const [selectedRecibidorImageId, setSelectedRecibidorImageId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    // Función para obtener las dimensiones del contenedor
    const getContainerDimensions = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            return {
                width: Number(rect.width) || 600,
                height: Number(rect.height) || 500
            };
        }
        // Valores por defecto si no se puede obtener el tamaño
        return {
            width: Number(properties?.size?.width) || 600,
            height: Number(properties?.size?.height) || 500
        };
    }, [properties?.size]);

    // Capturar tamaño original del elemento al montar
    useEffect(() => {
        if (properties?.size && !originalSizeRef.current) {
            originalSizeRef.current = {
                width: typeof properties.size.width === 'number' ? properties.size.width : parseFloat(String(properties.size.width)) || 600,
                height: typeof properties.size.height === 'number' ? properties.size.height : parseFloat(String(properties.size.height)) || 500,
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

    // Función para manejar subida de imágenes
    const handleFileUpload = useCallback(async (files: FileList | null) => {
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const imgSrc = e.target?.result as string;
            // Obtener dimensiones del contenedor y calcular posición inicial
            const containerDims = getContainerDimensions();
            const imageWidth = 200;
            const imageHeight = 150;
            // Calcular posición que mantenga la imagen dentro del contenedor
            const maxX = Math.max(0, containerDims.width - imageWidth);
            const maxY = Math.max(0, containerDims.height - imageHeight);
            const x = maxX > 0 ? Math.random() * maxX : 0;
            const y = maxY > 0 ? Math.random() * maxY : 0;

            const newImage = {
              id: Date.now().toString(),
              src: imgSrc,
              alt: file.name,
              size: 'medium' as const,
              position: { x, y },
              rotation: 0,
              zIndex: 1,
            };

            const updatedImageIds = [...(gridContent.imageIds || []), newImage.id];
            onUpdate(id, { content: { ...gridContent, imageIds: updatedImageIds } });

            toast({
              title: 'Imagen agregada',
              description: 'La imagen se ha agregado a la guía.',
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error al procesar imagen:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo cargar la imagen.',
          });
        }
      }
    }, [gridContent, id, onUpdate, toast]);

    // Función para agregar caja de texto libre al recibidor
    const handleAddTextBox = useCallback(() => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const containerWidth = containerRect?.width || 600;
        const containerHeight = containerRect?.height || 500;

        // Crear nueva caja de texto para el recibidor
        const newTextBox = {
            id: `recibidor_text_${Date.now()}`,
            text: 'Texto libre',
            x: Math.random() * (containerWidth - 200), // Posición aleatoria dentro del contenedor
            y: Math.random() * (containerHeight - 100),
            width: 200,
            height: 100,
            rotation: 0,
            fontSize: 13,
            fontFamily: 'Poppins',
            color: '#000000',
            backgroundColor: 'transparent',
            borderWidth: 0,
            zIndex: (recibidorImages.length > 0 ? Math.max(...recibidorImages.map(img => img.zIndex || 1)) : 0) + 1,
        };

        setRecibidorImages(prev => [...prev, newTextBox]);

        toast({
            title: 'Caja de texto agregada',
            description: 'Se ha agregado una caja de texto editable al área de trabajo.',
        });
    }, [recibidorImages, toast]);

    // Función EXCLUSIVA para subir imágenes al recibidor desde el botón del header
    // SOLO esta función debe usarse para agregar imágenes al recibidor.
    // Las imágenes del recibidor NO deben enviarse a otros elementos de la app.
    const handleFileUploadToRecibidor = useCallback(async (files: FileList | null) => {
        if (!files) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;

            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const imgSrc = e.target?.result as string;

                    // Crear nueva imagen para el recibidor
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    const containerWidth = containerRect?.width || 600;
                    const containerHeight = containerRect?.height || 500;

                    const newImage = {
                        id: `recibidor_${Date.now()}_${i}`,
                        src: imgSrc,
                        alt: file.name,
                        x: Math.random() * (containerWidth - 200), // Posición aleatoria dentro del contenedor
                        y: Math.random() * (containerHeight - 150),
                        width: 200,
                        height: 150,
                        rotation: 0,
                        zIndex: recibidorImages.length + 1,
                    };

                    setRecibidorImages(prev => [...prev, newImage]);

                    toast({
                        title: 'Imagen agregada al recibidor',
                        description: 'La imagen se ha agregado al área de trabajo.',
                    });
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error al procesar imagen:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'No se pudo cargar la imagen.',
                });
            }
        }

        // Resetear el input file después de procesar
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [recibidorImages.length, toast]);

    // Función para exportar el recibidor como PNG en alta resolución
    const handleExportPNG = useCallback(async () => {
      // Buscar el CardContent que contiene el recibidor (excluyendo el header)
      const element = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!element) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo encontrar el elemento para exportar.',
        });
        return;
      }

      // Encontrar el CardContent (que contiene el fondo blanco y el recibidor)
      const cardContent = element.querySelector('.flex-1.p-3.overflow-auto.bg-white.relative') as HTMLElement;
      if (!cardContent) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo encontrar el área del recibidor.',
        });
        return;
      }

      try {
        toast({
          title: 'Exportando...',
          description: 'Generando imagen PNG del área de trabajo en alta resolución.',
        });

        const canvas = await html2canvas(cardContent, {
          backgroundColor: '#ffffff', // Fondo blanco del CardContent
          scale: 3, // Alta resolución (3x)
          useCORS: true,
          logging: false,
          allowTaint: false,
          width: cardContent.offsetWidth,
          height: cardContent.offsetHeight,
        });

        canvas.toBlob((blob: Blob | null) => {
          if (!blob) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'No se pudo generar la imagen.',
            });
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `recibidor_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast({
            title: 'Exportado',
            description: 'El área de trabajo se ha exportado como PNG en alta resolución.',
          });
        }, 'image/png', 1.0);
      } catch (error: any) {
        console.error('Error al exportar recibidor:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'No se pudo exportar el recibidor.',
        });
      }
    }, [toast, id]);

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
                    // Obtener dimensiones reales del contenedor
                    const containerDims = getContainerDimensions();
                    const imageWidth = 300;
                    const imageHeight = 200;
                    // Calcular posición central asegurando que la imagen quepa dentro del contenedor
                    const centerX = Math.max(0, (containerDims.width - imageWidth) / 2);
                    const centerY = Math.max(0, (containerDims.height - imageHeight) / 2);

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

    // Función para ajustar posiciones de imágenes dentro del contenedor
    const constrainImagePositions = useCallback(() => {
        const containerDims = getContainerDimensions();
        const updates: any[] = [];

        childImages.forEach((imageElement) => {
            const currentX = Number(imageElement.x) || 0;
            const currentY = Number(imageElement.y) || 0;
            const imageWidth = Number(imageElement.width) || 200;
            const imageHeight = Number(imageElement.height) || 150;

            // Calcular límites permitidos
            const maxX = Math.max(0, containerDims.width - imageWidth);
            const maxY = Math.max(0, containerDims.height - imageHeight);

            // Ajustar posiciones si salen del contenedor
            const newX = Math.max(0, Math.min(currentX, maxX));
            const newY = Math.max(0, Math.min(currentY, maxY));

            if (newX !== currentX || newY !== currentY) {
                updates.push({
                    id: imageElement.id,
                    updates: {
                        x: newX,
                        y: newY
                    }
                });
            }
        });

        // Aplicar todas las actualizaciones
        updates.forEach(({ id, updates }) => {
            onUpdate(id, updates);
        });
    }, [childImages, getContainerDimensions, onUpdate]);

    // Función para ajustar posiciones de imágenes del recibidor dentro del contenedor
    const constrainRecibidorImagePositions = useCallback(() => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        setRecibidorImages(prev => prev.map(img => {
            const maxX = Math.max(0, containerRect.width - img.width);
            const maxY = Math.max(0, containerRect.height - img.height);

            return {
                ...img,
                x: Math.max(0, Math.min(img.x, maxX)),
                y: Math.max(0, Math.min(img.y, maxY))
            };
        }));
    }, []);

    // Función para iniciar arrastre de imagen dentro del contenedor
    const handleImageMouseDown = useCallback((e: React.MouseEvent, imageId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const imageElement = childImages.find(img => img.id === imageId);
        if (!imageElement) return;

        setDraggedImageId(imageId);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        setImageStartPos({
            x: Number(imageElement.x) || 0,
            y: Number(imageElement.y) || 0
        });

        // Agregar event listeners globales
        document.addEventListener('mousemove', handleImageMouseMove);
        document.addEventListener('mouseup', handleImageMouseUp);
    }, [childImages]);

    // Función para manejar movimiento del mouse durante arrastre
    const handleImageMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedImageId || !dragStartPos || !imageStartPos || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const scale = 1; // Asumimos escala 1:1 dentro del contenedor

        // Calcular nueva posición relativa al contenedor
        const deltaX = (e.clientX - dragStartPos.x) / scale;
        const deltaY = (e.clientY - dragStartPos.y) / scale;

        let newX = imageStartPos.x + deltaX;
        let newY = imageStartPos.y + deltaY;

        // Restringir la posición dentro del contenedor
        const imageElement = childImages.find(img => img.id === draggedImageId);
        const imageWidth = Number(imageElement?.width) || 200;
        const imageHeight = Number(imageElement?.height) || 150;

        const maxX = Math.max(0, containerRect.width - imageWidth);
        const maxY = Math.max(0, containerRect.height - imageHeight);

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Actualizar posición de la imagen
        onUpdate(draggedImageId, { x: newX, y: newY });
    }, [draggedImageId, dragStartPos, imageStartPos, childImages, onUpdate]);

    // Función para detener arrastre
    const handleImageMouseUp = useCallback(() => {
        setDraggedImageId(null);
        setDragStartPos(null);
        setImageStartPos(null);

        // Remover event listeners globales
        document.removeEventListener('mousemove', handleImageMouseMove);
        document.removeEventListener('mouseup', handleImageMouseUp);
    }, [handleImageMouseMove]);

    // Funciones para manejar imágenes del recibidor
    const handleRecibidorImageMouseDown = useCallback((e: React.MouseEvent, imageId: string, isResizeHandle = false, maintainAspectRatio = false) => {
        e.preventDefault();
        e.stopPropagation();

        // Seleccionar la imagen al hacer click (si no es redimensionamiento)
        if (!isResizeHandle) {
            setSelectedRecibidorImageId(imageId);
        }

        if (isResizeHandle) {
            setResizingRecibidorImageId(`${imageId}_${maintainAspectRatio ? 'proportional' : 'free'}`);
        } else {
            setDraggedRecibidorImageId(imageId);
        }

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
            setDragStartPos({
                x: e.clientX - containerRect.left,
                y: e.clientY - containerRect.top
            });
        }
    }, []);

    const handleRecibidorMouseMove = useCallback((e: MouseEvent) => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - containerRect.left;
        const currentY = e.clientY - containerRect.top;

        if (draggedRecibidorImageId && dragStartPos) {
            // Mover imagen
            const deltaX = currentX - dragStartPos.x;
            const deltaY = currentY - dragStartPos.y;

            setRecibidorImages(prev => prev.map(img => {
                if (img.id === draggedRecibidorImageId) {
                    const newX = Math.max(0, Math.min(img.x + deltaX, containerRect.width - img.width));
                    const newY = Math.max(0, Math.min(img.y + deltaY, containerRect.height - img.height));
                    return { ...img, x: newX, y: newY };
                }
                return img;
            }));

            setDragStartPos({ x: currentX, y: currentY });
        } else if (resizingRecibidorImageId && dragStartPos) {
            // Redimensionar imagen
            const isProportional = resizingRecibidorImageId.includes('_proportional');
            const imageId = resizingRecibidorImageId.replace('_proportional', '').replace('_free', '');

            const deltaX = currentX - dragStartPos.x;
            const deltaY = currentY - dragStartPos.y;

            setRecibidorImages(prev => prev.map(img => {
                if (img.id === imageId) {
                    if (isProportional) {
                        // Redimensionamiento proporcional
                        const aspectRatio = img.width / img.height;
                        const newWidth = Math.max(50, img.width + deltaX);
                        const newHeight = newWidth / aspectRatio;
                        return {
                            ...img,
                            width: newWidth,
                            height: Math.max(50, newHeight)
                        };
                    } else {
                        // Redimensionamiento libre
                        const newWidth = Math.max(50, img.width + deltaX);
                        const newHeight = Math.max(50, img.height + deltaY);
                        return { ...img, width: newWidth, height: newHeight };
                    }
                }
                return img;
            }));

            setDragStartPos({ x: currentX, y: currentY });
        }
    }, [draggedRecibidorImageId, resizingRecibidorImageId, dragStartPos]);

    const handleRecibidorMouseUp = useCallback(() => {
        setDraggedRecibidorImageId(null);
        setResizingRecibidorImageId(null);
        setDragStartPos(null);
        // No limpiamos selectedRecibidorImageId aquí para mantener la selección
    }, []);

    // Agregar event listeners para el recibidor
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (draggedRecibidorImageId || resizingRecibidorImageId) {
                handleRecibidorMouseMove(e);
            }
        };

        const handleGlobalMouseUp = () => {
            if (draggedRecibidorImageId || resizingRecibidorImageId) {
                handleRecibidorMouseUp();
            }
        };

        if (draggedRecibidorImageId || resizingRecibidorImageId) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [draggedRecibidorImageId, resizingRecibidorImageId, handleRecibidorMouseMove, handleRecibidorMouseUp]);

    // Activar autoguardado cuando cambien las imágenes del recibidor
    useEffect(() => {
        handleRecibidorChange();
    }, [recibidorImages, handleRecibidorChange]);

    // Ajustar posiciones de imágenes del recibidor cuando cambie el tamaño del contenedor
    useEffect(() => {
        if (recibidorImages.length > 0) {
            // Pequeño delay para asegurar que el DOM esté actualizado
            const timeoutId = setTimeout(() => {
                constrainRecibidorImagePositions();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [properties?.size, recibidorImages.length, constrainRecibidorImagePositions]);

    // Ajustar posiciones de imágenes cuando cambie el tamaño del contenedor o se agreguen imágenes
    useEffect(() => {
        if (childImages.length > 0) {
            // Pequeño delay para asegurar que el DOM esté actualizado
            const timeoutId = setTimeout(() => {
                constrainImagePositions();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [properties?.size, childImages.length, constrainImagePositions]);

    return (
        <Card className="w-full h-full flex flex-col overflow-hidden rounded-lg shadow-lg border border-gray-200/50 bg-white">
            {/* HEADER */}
            <CardHeader className="p-0 border-b border-gray-300 bg-gray-200 flex flex-row items-center justify-between">
                <GripVertical className="h-4 w-4 text-black cursor-grab flex-shrink-0 mr-0.5 drag-handle" />
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                        type="text"
                        value={gridContent.title}
                        onChange={(e) => {
                            const newTitle = e.target.value;
                            onUpdate(id, { content: { ...gridContent, title: newTitle } });
                        }}
                        // onFocus={() => !isSelected && onSelectElement?.(id, false)} // REMOVIDO - interfiere con edición
                        className="flex-1 min-w-0 bg-transparent outline-none cursor-text font-headline text-xs font-semibold text-black p-0 leading-none"
                        onClick={(e) => e.stopPropagation()}
                        placeholder=""
                        disabled={isPreview}
                    />
                </div>

                {/* Botones del header */}
                <div className="flex items-center gap-0 flex-shrink-0">
                    <Button
                        variant="ghost"
                        className="h-6 w-6 p-1 text-black hover:bg-gray-300"
                        title="Agregar imágenes desde URL"
                        onClick={() => setIsImageUrlDialogOpen(true)}
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        className="h-6 w-6 p-1 text-black hover:bg-gray-300"
                        title="Agregar caja de texto"
                        onClick={handleAddTextBox}
                    >
                        <Type className="h-4 w-4" />
                    </Button>

                    {/* Botón de Restaurar Tamaño Original */}
                    <Button
                        variant="ghost"
                        className="h-6 w-6 p-1 text-black hover:bg-gray-300"
                        title="Restaurar tamaño original"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize(); }}
                    >
                        <Maximize className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        className="h-6 w-6 p-1 text-black hover:bg-gray-300"
                        title="Cargar imágenes desde archivo"
                        onClick={() => {
                            // Cambiar el input file para usar la función del recibidor
                            if (fileInputRef.current) {
                                fileInputRef.current.onchange = (e) => {
                                    handleFileUploadToRecibidor((e.target as HTMLInputElement).files);
                                };
                                fileInputRef.current.click();
                            }
                        }}
                    >
                        <Upload className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        className="h-6 w-6 p-1 text-black hover:bg-gray-300"
                        title="Exportar como imagen PNG"
                        onClick={handleExportPNG}
                    >
                        <FileImage className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        className="h-6 w-6 ml-2 p-1 border-gray-400 text-black hover:bg-gray-300"
                        title="Ocultar elemento"
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(id, { hidden: true });
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            {/* CONTENT - Área limpia sin grid */}
            <CardContent
                ref={containerRef}
                className="flex-1 p-3 overflow-auto bg-white relative"
                style={{ minHeight: 0 }}
                onMouseDown={(e) => e.stopPropagation()} // Prevenir que el canvas principal inicie arrastre
                onClick={(e) => e.stopPropagation()} // Prevenir selección del contenedor padre
            >
                <div className="relative w-full h-full">
                    {childImages.map((imageElement) => (
                        <div
                            key={imageElement.id}
                            className="absolute"
                            style={{
                                left: Number(imageElement.x) || 0,
                                top: Number(imageElement.y) || 0,
                                width: Number(imageElement.width) || 300,
                                height: Number(imageElement.height) || 200,
                                cursor: draggedImageId === imageElement.id ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={(e) => handleImageMouseDown(e, imageElement.id)}
                            onClick={(e) => e.stopPropagation()} // Prevenir selección del contenedor padre
                        >
                            <div
                                onDragStart={(e) => e.preventDefault()} // Prevenir arrastre nativo del ImageElement
                                onMouseDown={(e) => e.stopPropagation()} // Prevenir que llegue al canvas principal
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
                        </div>
                    ))}
                </div>

                {/* RECIBIDOR - Contenedor dentro del área de contenido
                    FUNCIÓN PRINCIPAL: Recibir imágenes exclusivamente desde el botón "Cargar imágenes desde archivo" del header.
                    Las imágenes permanecen aquí y NO se envían a otros elementos de la aplicación.
                    Permite manipulación libre: mover, apilar, redimensionar con autoguardado.
                */}
                <div
                    className="absolute inset-0 bg-transparent pointer-events-none"
                    style={{ zIndex: 10 }}
                >
                    <div
                    className="relative w-full h-full pointer-events-auto recibidor-canvas"
                    onClick={() => setSelectedRecibidorImageId(null)} // Deseleccionar al hacer click en área vacía
                >
                        {recibidorImages.map((item) => (
                            <div
                                key={item.id}
                                className={`absolute ${
                                    item.src
                                        ? `shadow-lg rounded ${
                                            selectedRecibidorImageId === item.id
                                                ? 'border-2 border-blue-600 shadow-xl bg-white'
                                                : 'border-2 border-blue-400 bg-white'
                                        }`
                                        : `border-2 rounded ${
                                            selectedRecibidorImageId === item.id
                                                ? 'border-blue-500 bg-transparent'
                                                : 'border-transparent bg-transparent'
                                        }` // Texto con borde azul cuando seleccionado
                                }`}
                                style={{
                                    left: item.x,
                                    top: item.y,
                                    width: item.width,
                                    height: item.height,
                                    transform: `rotate(${item.rotation}deg)`,
                                    zIndex: item.zIndex,
                                    cursor: item.src && draggedRecibidorImageId === item.id ? 'grabbing' : item.src ? 'grab' : 'default',
                                }}
                                onMouseDown={(e) => item.src && handleRecibidorImageMouseDown(e, item.id)}
                                onDoubleClick={() => item.text && setEditingTextId(item.id)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecibidorImageId(item.id);
                                }}
                            >
                                {/* Handler de arrastre - solo para cajas de texto */}
                                {selectedRecibidorImageId === item.id && !item.src && (
                                    <div
                                        className="absolute top-3 -left-1 w-3 h-3 bg-gray-500 rounded-full cursor-grab active:cursor-grabbing shadow-sm"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            handleRecibidorImageMouseDown(e, item.id);
                                        }}
                                        title="Arrastrar elemento"
                                    />
                                )}

                                {item.src ? (
                                    // Es una imagen
                                    <>
                                        <img
                                            src={item.src}
                                            alt={item.alt}
                                            className="w-full h-full object-cover rounded"
                                            draggable={false}
                                        />
                                        {/* Handle de redimensionamiento proporcional (izquierda abajo) */}
                                        <div
                                            className="absolute bottom-0 left-0 w-4 h-4 flex items-end justify-start cursor-nw-resize"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleRecibidorImageMouseDown(e, item.id, true, true); // true para proporcional
                                            }}
                                        >
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 12 12"
                                                className="text-gray-500"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            >
                                                <path d="M2 2 L6 6 L2 10" />
                                            </svg>
                                        </div>

                                        {/* Handle de redimensionamiento libre (derecha abajo) */}
                                        <div
                                            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleRecibidorImageMouseDown(e, item.id, true, false); // false para libre
                                            }}
                                        />
                                    </>
                                ) : (
                                    // Es una caja de texto
                                    <>
                                        {editingTextId === item.id ? (
                                            <textarea
                                                value={item.text || ''}
                                                onChange={(e) => {
                                                    setRecibidorImages(prev => prev.map(img =>
                                                        img.id === item.id ? { ...img, text: e.target.value } : img
                                                    ));
                                                }}
                                                onBlur={() => setEditingTextId(null)}
                                                className="w-full h-full p-3 border-none outline-none resize-none bg-transparent"
                                                style={{
                                                    fontFamily: item.fontFamily || 'Poppins',
                                                    fontSize: '13px',
                                                    color: item.color || '#000000',
                                                    lineHeight: '1.4',
                                                    textAlign: 'left',
                                                }}
                                                autoFocus
                                                placeholder="Escribe aquí..."
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full p-3 cursor-pointer select-none overflow-hidden"
                                                style={{
                                                    fontFamily: item.fontFamily || 'Poppins',
                                                    fontSize: '13px',
                                                    color: item.color || '#000000',
                                                    lineHeight: '1.4',
                                                    textAlign: 'left',
                                                    wordWrap: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {item.text || 'Texto libre'}
                                            </div>
                                        )}

                                        {/* Handle de redimensionamiento para texto - esquina inferior derecha */}
                                        {selectedRecibidorImageId === item.id && (
                                            <div
                                                className="absolute bottom-0 right-0 w-4 h-4 flex items-end justify-end cursor-se-resize"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    handleRecibidorImageMouseDown(e, item.id, true, false); // false para redimensionamiento libre
                                                }}
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 12 12"
                                                    className="text-gray-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                >
                                                    <path d="M10 2 L6 6 L10 10" />
                                                </svg>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Botón eliminar - Fuera de la caja de texto, esquina superior derecha */}
                                <button
                                    className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-md transition-opacity duration-200 ${
                                        selectedRecibidorImageId === item.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRecibidorImages(prev => prev.filter(img => img.id !== item.id));
                                        setSelectedRecibidorImageId(null);
                                        setEditingTextId(null);
                                    }}
                                    title="Eliminar elemento"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>

            {/* Diálogo clonado del menú principal */}
            <AddImageFromUrlDialog
                isOpen={isImageUrlDialogOpen}
                onOpenChange={setIsImageUrlDialogOpen}
                onAddImage={async (url) => {
                    // Obtener dimensiones reales del contenedor
                    const containerDims = getContainerDimensions();
                    const imageWidth = 300;
                    const imageHeight = 200;
                    // Calcular posición central asegurando que la imagen quepa dentro del contenedor
                    const centerX = Math.max(0, (containerDims.width - imageWidth) / 2);
                    const centerY = Math.max(0, (containerDims.height - imageHeight) / 2);

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

            {/* Botón eliminar completamente fuera del elemento */}
            <div className="absolute -top-6 -right-6 z-50">
                <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 rounded-full shadow-xl border-2 border-white"
                    title="Eliminar elemento"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(id, { hidden: true });
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Input file hidden para subir imágenes */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files)}
            />
        </Card>
    );
}
