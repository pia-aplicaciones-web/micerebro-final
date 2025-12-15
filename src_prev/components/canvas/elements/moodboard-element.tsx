'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CommonElementProps, MoodboardContent, MoodboardAnnotation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GripVertical, X, Plus, ImageIcon, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';

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
    isListening,
    liveTranscript,
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
