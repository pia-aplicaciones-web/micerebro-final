'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CommonElementProps, MoodboardContent, MoodboardAnnotation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GripVertical, X, Plus, ImageIcon, Type, FileImage, Paintbrush, Minus, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import html2canvas from 'html2canvas';

// Paletas expandidas con texto oscuro del mismo tono (NO usar negro)
const EXTENDED_PALETTES = {
  // Pasteles clásicos
  yellow: { bg: '#FFF9C4', text: '#7D6608', name: 'Amarillo' },
  pink: { bg: '#F8BBD9', text: '#880E4F', name: 'Rosa' },
  blue: { bg: '#B3E5FC', text: '#01579B', name: 'Azul' },
  green: { bg: '#C8E6C9', text: '#1B5E20', name: 'Verde' },
  orange: { bg: '#FFE0B2', text: '#E65100', name: 'Naranja' },
  purple: { bg: '#E1BEE7', text: '#4A148C', name: 'Morado' },

  // Tierra
  sage: { bg: '#D7E4C0', text: '#3D5C2E', name: 'Salvia' },
  terracotta: { bg: '#FFCCBC', text: '#BF360C', name: 'Terracota' },
  sand: { bg: '#FFF3E0', text: '#8D6E63', name: 'Arena' },
  coffee: { bg: '#D7CCC8', text: '#4E342E', name: 'Café' },

  // Océano
  seafoam: { bg: '#B2DFDB', text: '#004D40', name: 'Espuma' },
  coral: { bg: '#FFAB91', text: '#D84315', name: 'Coral' },
  navy: { bg: '#90CAF9', text: '#0D47A1', name: 'Marino' },
  aqua: { bg: '#80DEEA', text: '#006064', name: 'Aqua' },

  // Sofisticados
  lavender: { bg: '#D1C4E9', text: '#311B92', name: 'Lavanda' },
  mint: { bg: '#A5D6A7', text: '#2E7D32', name: 'Menta' },
  peach: { bg: '#FFCCBC', text: '#E64A19', name: 'Durazno' },
  rose: { bg: '#F48FB1', text: '#AD1457', name: 'Rosa Fuerte' },
  // Nuevos
  limeOlive: { bg: '#C2D96A', text: '#2F3A11', name: 'Lima Oliva' },
  brick: { bg: '#DB6441', text: '#4A1C0F', name: 'Ladrillo' },
  sky: { bg: '#42B0DB', text: '#0A3A52', name: 'Cielo' },
  aquaSoft: { bg: '#9ED5DE', text: '#0E3C46', name: 'Aqua' },
  lavenderSoft: { bg: '#CEC5DB', text: '#3A3046', name: 'Lavanda Suave' },
  sand: { bg: '#DBD393', text: '#4A4320', name: 'Arena' },
  amber: { bg: '#E09D22', text: '#4A2F00', name: 'Ámbar' },
  chartreuse: { bg: '#B8E100', text: '#2E3B00', name: 'Chartreuse' },
  ocean: { bg: '#1D93CE', text: '#062C3E', name: 'Océano' },

  // Colores adicionales de otras paletas
  calypso: { bg: '#CAE3E1', text: '#2C3E3D', name: 'Calipso' },
  lightYellow: { bg: '#FEF08A', text: '#7C4A03', name: 'Amarillo Claro' },
  lightBlue: { bg: '#DBEAFE', text: '#1E3A8A', name: 'Azul Claro' },
  lightGreen: { bg: '#DCFCE7', text: '#14532D', name: 'Verde Claro' },
  lightPink: { bg: '#FCE7F3', text: '#831843', name: 'Rosa Claro' },
  lightGray: { bg: '#F3F4F6', text: '#374151', name: 'Gris Claro' },
  lightRose: { bg: '#FCE4EC', text: '#9D174D', name: 'Rosa Suave' },
  skyLight: { bg: '#E0F2FE', text: '#0C4A6E', name: 'Cielo Claro' },
  skyVeryLight: { bg: '#F0F9FF', text: '#0F172A', name: 'Cielo Muy Claro' },
  emeraldVeryLight: { bg: '#ECFDF5', text: '#064E3B', name: 'Esmeralda Muy Claro' },
};

// Type guard para MoodboardContent
function isMoodboardContent(content: unknown): content is MoodboardContent {
  return typeof content === 'object' && content !== null && 'images' in content;
}

export default function MoodboardElement(props: CommonElementProps) {
  const {
    id,
    properties,
    isSelected,
    onSelectElement,
    onEditElement,
    content,
    onUpdate,
    deleteElement,
    isPreview,
    minimized,
  } = props;

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const moodboardContent: MoodboardContent = isMoodboardContent(content)
    ? content
    : { title: 'Nuevo Moodboard', images: [], annotations: [], layout: 'grid' };

  const [isAddingImage, setIsAddingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Export to PNG
  const handleExportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const el = containerRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `${moodboardContent.title || 'moodboard'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting moodboard:', error);
    }
  }, [moodboardContent.title]);

  // Handle color change
  const handleColorChange = useCallback((colorKey: { hex: string }) => {
    const selectedPalette = EXTENDED_PALETTES[colorKey.hex as keyof typeof EXTENDED_PALETTES];
    if (selectedPalette) {
      onUpdate(id, {
        properties: {
          ...safeProperties,
          backgroundColor: selectedPalette.bg,
        },
      });
    }
  }, [id, safeProperties, onUpdate]);

  // Hook de autoguardado para el título
  const { saveStatus: titleSaveStatus, handleBlur: handleTitleBlur, handleChange: handleTitleChange } = useAutoSave({
    getContent: () => titleInputRef.current?.value || moodboardContent.title || '',
    onSave: async (newTitle) => {
      if (newTitle !== moodboardContent.title) {
        onUpdate(id, { content: { ...moodboardContent, title: newTitle } });
      }
    },
    debounceMs: 1000,
  });

  // Agregar imagen
  const handleAddImage = useCallback(() => {
    if (!imageUrl.trim()) return;
    
    const newImage = {
      id: `img-${Date.now()}`,
      url: imageUrl.trim(),
    };
    
    const updatedContent: MoodboardContent = {
      ...moodboardContent,
      images: [...moodboardContent.images, newImage],
    };
    
    onUpdate(id, { content: updatedContent });
    setImageUrl('');
    setIsAddingImage(false);
  }, [id, moodboardContent, imageUrl, onUpdate]);

  // Eliminar imagen
  const handleRemoveImage = useCallback((imageId: string) => {
    const updatedContent: MoodboardContent = {
      ...moodboardContent,
      images: moodboardContent.images.filter(img => img.id !== imageId),
      annotations: moodboardContent.annotations.filter(ann => ann.imageId !== imageId),
    };
    onUpdate(id, { content: updatedContent });
  }, [id, moodboardContent, onUpdate]);

  // Agregar anotación
  const handleAddAnnotation = useCallback((imageId: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const newAnnotation: MoodboardAnnotation = {
      id: `ann-${Date.now()}`,
      imageId,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      text: 'Nueva anotación',
      color: '#fffb8b',
    };
    
    const updatedContent: MoodboardContent = {
      ...moodboardContent,
      annotations: [...moodboardContent.annotations, newAnnotation],
    };
    
    onUpdate(id, { content: updatedContent });
    setEditingAnnotation(newAnnotation.id);
  }, [id, moodboardContent, onUpdate]);

  // Actualizar anotación
  const handleUpdateAnnotation = useCallback((annotationId: string, updates: Partial<MoodboardAnnotation>) => {
    const updatedContent: MoodboardContent = {
      ...moodboardContent,
      annotations: moodboardContent.annotations.map(ann =>
        ann.id === annotationId ? { ...ann, ...updates } : ann
      ),
    };
    onUpdate(id, { content: updatedContent });
  }, [id, moodboardContent, onUpdate]);

  // Eliminar anotación
  const handleRemoveAnnotation = useCallback((annotationId: string) => {
    const updatedContent: MoodboardContent = {
      ...moodboardContent,
      annotations: moodboardContent.annotations.filter(ann => ann.id !== annotationId),
    };
    onUpdate(id, { content: updatedContent });
    setEditingAnnotation(null);
  }, [id, moodboardContent, onUpdate]);

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', imageId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedImageId) return;

    const draggedIndex = moodboardContent.images.findIndex(img => img.id === draggedImageId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedImageId(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...moodboardContent.images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, removed);

    const updatedContent: MoodboardContent = {
      ...moodboardContent,
      images: newImages,
    };
    onUpdate(id, { content: updatedContent });
    
    setDraggedImageId(null);
    setDragOverIndex(null);
  }, [draggedImageId, moodboardContent, id, onUpdate]);

  const handleDragEnd = useCallback(() => {
    setDraggedImageId(null);
    setDragOverIndex(null);
  }, []);

  // Cerrar moodboard
  const handleClose = useCallback(() => {
    onUpdate(id, { hidden: true });
  }, [id, onUpdate]);

  const backgroundColor = safeProperties?.backgroundColor || '#ffffff';
  const layout = moodboardContent.layout || 'grid';

  // Toggle minimize - FIX CRÍTICO: Guardar estado en elemento para persistencia
  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as any)?.size || { width: 600, height: 500 };

    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 600,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 500,
    };

    if (isCurrentlyMinimized) {
      const { originalSize, ...restProps } = (properties || {}) as any;
      const restoredSize = originalSize || { width: 600, height: 500 };
      const newProperties = {
        ...restProps,
        size: restoredSize
      };

      onUpdate(id, {
        minimized: false,
        properties: newProperties,
        content: moodboardContent, // Asegurar que el contenido se preserve
      });
    } else {
      // Guardar el contenido actual antes de minimizar
      const updatedContent = { ...moodboardContent }; // No hay texto directo, pero se pasa el objeto completo
      const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 600;
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
  }, [isPreview, minimized, properties, onUpdate, id, moodboardContent]);

  return (
    <Card
      id={id}
      data-element-type="moodboard"
      data-element-id={id}
      ref={containerRef}
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[400px] min-h-[300px]',
        'rounded-lg shadow-lg border border-gray-200/50',
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : '',
        'hover:shadow-xl transition-shadow'
      )}
      style={{
        backgroundColor: backgroundColor === 'transparent' ? '#ffffff' : backgroundColor,
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('.drag-handle')) {
          onEditElement(id);
        }
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) {
          return;
        }
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      {/* HEADER */}
      <CardHeader className="p-3 border-b border-gray-200 bg-white flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="drag-handle cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={titleInputRef}
            type="text"
            value={moodboardContent.title || ''}
            onChange={(e) => {
              handleTitleChange();
              const newContent: MoodboardContent = { ...moodboardContent, title: e.target.value };
              onUpdate(id, { content: newContent });
            }}
            onBlur={handleTitleBlur}
            className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-1"
            placeholder="Título del moodboard..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <SaveStatusIndicator status={titleSaveStatus} size="sm" />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Agregar imagen"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingImage(true);
            }}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          {/* Exportar PNG */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Exportar a PNG"
            onClick={(e) => {
              e.stopPropagation();
              handleExportPng();
            }}
          >
            <FileImage className="h-4 w-4" />
          </Button>

          {/* Paleta de colores */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Cambiar color de fondo"
                onClick={(e) => e.stopPropagation()}
              >
                <Paintbrush className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              onClick={(e) => e.stopPropagation()}
              className="w-auto p-3 border-none bg-white shadow-xl rounded-xl"
            >
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(EXTENDED_PALETTES).map(([key, palette]) => (
                  <button
                    key={key}
                    onClick={() => handleColorChange({ hex: key })}
                    className={cn(
                      'w-8 h-8 rounded-lg shadow-sm hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold',
                      backgroundColor === palette.bg && 'ring-2 ring-offset-1 ring-gray-800 scale-110'
                    )}
                    style={{
                      backgroundColor: palette.bg,
                      color: palette.text,
                      border: `1px solid ${palette.text}30`
                    }}
                    title={palette.name}
                  >
                    Aa
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Botón minimizar */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={minimized ? "Maximizar" : "Minimizar"}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleMinimize(e); }}
          >
            {minimized ? <Maximize className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            title="Cerrar moodboard"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="flex-1 p-3 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* Formulario para agregar imagen */}
        {isAddingImage && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="URL de la imagen..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddImage();
                  } else if (e.key === 'Escape') {
                    setIsAddingImage(false);
                    setImageUrl('');
                  }
                }}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddImage();
                }}
              >
                Agregar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingImage(false);
                  setImageUrl('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Grid de imágenes con drag and drop */}
        {moodboardContent.images.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Haz clic en el botón de imagen para agregar imágenes al moodboard
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            layout === 'masonry' ? "grid-cols-2" : "grid-cols-2"
          )}>
            {moodboardContent.images.map((image, index) => {
              const imageAnnotations = moodboardContent.annotations.filter(ann => ann.imageId === image.id);
              const isDragging = draggedImageId === image.id;
              const isDragOver = dragOverIndex === index;
              
              return (
                <div
                  key={image.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, image.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 transition-all",
                    isDragging && "opacity-50 cursor-grabbing",
                    isDragOver && "ring-2 ring-blue-500 ring-offset-2 scale-105"
                  )}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  {/* Imagen */}
                  <div
                    className="relative w-full aspect-square cursor-crosshair"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('.annotation')) {
                        handleAddAnnotation(image.id, e);
                      }
                    }}
                  >
                    <img
                      src={image.url}
                      alt="Moodboard image"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    
                    {/* Anotaciones sobre la imagen */}
                    {imageAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className={cn(
                          "annotation absolute p-2 rounded shadow-lg cursor-move min-w-[80px]",
                          editingAnnotation === annotation.id ? 'z-10 ring-2 ring-blue-500' : ''
                        )}
                        style={{
                          left: `${annotation.x}%`,
                          top: `${annotation.y}%`,
                          backgroundColor: annotation.color || '#fffb8b',
                          transform: 'translate(-50%, -50%)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAnnotation(annotation.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {editingAnnotation === annotation.id ? (
                          <Input
                            type="text"
                            value={annotation.text}
                            onChange={(e) => {
                              handleUpdateAnnotation(annotation.id, { text: e.target.value });
                            }}
                            onBlur={() => setEditingAnnotation(null)}
                            className="text-xs h-6 px-1"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            data-annotation-id={annotation.id}
                            autoFocus
                          />
                        ) : (
                          <div className="text-xs font-medium">{annotation.text}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Botón eliminar imagen */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(image.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
