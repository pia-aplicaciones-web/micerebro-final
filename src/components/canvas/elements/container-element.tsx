'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CommonElementProps,
  ContainerContent,
  CanvasElementProperties,
  WithId,
  CanvasElement,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GripVertical, X, Paintbrush, Columns2, Link as LinkIcon, Move, Minus, Maximize, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
// import { useDictationBinding } from '@/hooks/use-dictation-binding';

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

function isContainerContent(content: unknown): content is ContainerContent {
  return typeof content === 'object' && content !== null && 'elementIds' in content;
}

interface ElementCard {
  elementId: string;
  element: WithId<CanvasElement>;
}

export default function ContainerElement(
  props: CommonElementProps & { unanchorElement?: (id: string) => void }
) {
  const {
    id,
    properties,
    isSelected,
    onSelectElement,
    onEditElement,
    content,
    onUpdate,
    deleteElement,
    allElements = [],
    unanchorElement,
    isPreview,
    minimized,
  } = props;

  const safeProperties: CanvasElementProperties =
    typeof properties === 'object' && properties !== null ? properties : {};

  const defaultLayout = content && typeof content === 'object' && (content as any).layout === 'two-columns'
    ? 'two-columns'
    : props.type === 'two-columns'
      ? 'two-columns'
      : 'single';

  const containerContent: ContainerContent = isContainerContent(content)
    ? { ...content, layout: content.layout || defaultLayout }
    : { title: 'Nuevo Contenedor', elementIds: [], layout: defaultLayout };

  const backgroundColor = safeProperties.backgroundColor || '#ffffff';
  const layout = containerContent.layout || 'single';
  const [isDragOver, setIsDragOver] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevZRef = useRef<number | null>(null);
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null); // Ref para el tamaño original

  // Handler para recibir elementos arrastrados
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // Obtener el ID del elemento arrastrado
    const elementId = e.dataTransfer.getData('application/element-id');
    if (!elementId) return;
    
    // Verificar que el elemento existe y no es el mismo contenedor
    const element = allElements.find(el => el.id === elementId);
    if (!element || element.id === id) return;
    
    // Agregar el elemento al contenedor
    if (!(containerContent as ContainerContent).elementIds.includes(elementId)) {
      const newElementIds = [...(containerContent as ContainerContent).elementIds, elementId];
      onUpdate(id, { content: { ...containerContent, elementIds: newElementIds } as ContainerContent });
      
      // Ocultar el elemento original del canvas
      onUpdate(elementId, { parentId: id, hidden: true });
    }
  }, [id, containerContent, allElements, onUpdate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Regla: al seleccionar, traer al frente; al deseleccionar, volver a z original
  useEffect(() => {
    const currentZ = (safeProperties as any)?.zIndex ?? -1;
    if (isSelected) {
      if (prevZRef.current === null) prevZRef.current = currentZ;
      if (currentZ !== 9999) {
        onUpdate(id, { zIndex: 9999, properties: { ...(properties || {}), zIndex: 9999 } });
      }
    } else {
      if (prevZRef.current !== null && currentZ !== prevZRef.current) {
        onUpdate(id, { zIndex: prevZRef.current, properties: { ...(properties || {}), zIndex: prevZRef.current } });
      }
      prevZRef.current = null;
    }
  }, [isSelected, id, onUpdate, properties, safeProperties]);

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

  const containedElements: ElementCard[] = (containerContent as ContainerContent).elementIds
    .map((elementId) => {
      const element = allElements.find((el) => el.id === elementId);
      return element ? { elementId, element } : null;
    })
    .filter((card): card is ElementCard => card !== null);

  const { saveStatus: titleSaveStatus, handleBlur: handleTitleBlur, handleChange: handleTitleChange } =
    useAutoSave({
      getContent: () => titleInputRef.current?.value || containerContent.title || '',
      onSave: async (newTitle) => {
        if (newTitle !== containerContent.title) {
          onUpdate(id, { content: { ...containerContent, title: newTitle } });
        }
      },
      debounceMs: 1000,
    });

  const handleColorChange = useCallback(
    (colorKey: { hex: string }) => {
      const selectedPalette = EXTENDED_PALETTES[colorKey.hex as keyof typeof EXTENDED_PALETTES];
      if (selectedPalette) {
        onUpdate(id, {
          properties: {
            ...safeProperties,
            backgroundColor: selectedPalette.bg,
          },
        });
      }
    },
    [id, safeProperties, onUpdate]
  );

  const handleLayoutToggle = useCallback(() => {
    const newLayout = layout === 'single' ? 'two-columns' : 'single';
    onUpdate(id, { content: { ...containerContent, layout: newLayout } as ContainerContent });
  }, [id, containerContent, layout, onUpdate]);

  const handleClose = useCallback(() => {
    onUpdate(id, { hidden: true });
  }, [id, onUpdate]);

  const handleReleaseElement = useCallback(
    (elementId: string) => {
      const newElementIds = (containerContent as ContainerContent).elementIds.filter((eid) => eid !== elementId);
      onUpdate(id, { content: { ...containerContent, elementIds: newElementIds } as ContainerContent });

      const containerPosition = safeProperties.position || { x: 0, y: 0 };
      const containerSize = safeProperties.size || { width: 378, height: 567 };
      const releasedElement = allElements.find((el) => el.id === elementId);
      if (releasedElement) {
        const releasePosition = {
          x:
            containerPosition.x +
            (typeof containerSize.width === 'number'
              ? containerSize.width
              : parseInt(String(containerSize.width))) +
            20,
          y: containerPosition.y,
        };

        const releasedProps =
          typeof releasedElement.properties === 'object' && releasedElement.properties !== null
            ? releasedElement.properties
            : {};

        const props = {
          ...releasedProps,
          position: releasePosition,
          relativePosition: null,
        };

        // Limpiar undefined antes de enviar
        Object.keys(props).forEach((k) => {
          if (props[k as keyof typeof props] === undefined) {
            delete (props as any)[k];
          }
        });

        onUpdate(elementId, {
          parentId: null,
          hidden: false,
          x: releasePosition.x,
          y: releasePosition.y,
          properties: props,
        });
      }
    },
    [id, containerContent, allElements, onUpdate, unanchorElement, safeProperties]
  );

  const getElementName = (element: WithId<CanvasElement>): string => {
    if (element.type === 'text') {
      return typeof element.content === 'string' ? element.content.substring(0, 30) : 'Texto';
    }
    if (element.type === 'sticky') {
      return typeof element.content === 'string' ? element.content.substring(0, 30) : 'Nota';
    }
    if (element.type === 'notepad' || element.type === 'yellow-notepad') {
      const notepadContent = element.content as any;
      return notepadContent?.title || 'Cuaderno';
    }
    if (element.type === 'todo') {
      const todoContent = element.content as any;
      return todoContent?.title || 'Lista de Tareas';
    }
    if (element.type === 'image') {
      return 'Imagen';
    }
    return element.type.charAt(0).toUpperCase() + element.type.slice(1);
  };

  const getElementThumbnail = (element: WithId<CanvasElement>): React.ReactNode => {
    const size =
      typeof element.properties === 'object' && element.properties !== null && element.properties.size
        ? element.properties.size
        : { width: element.width || 100, height: element.height || 100 };

    const elementWidth = typeof size.width === 'number' ? size.width : parseInt(String(size.width));
    const elementHeight = typeof size.height === 'number' ? size.height : parseInt(String(size.height));

    const maxThumbnailSize = 100;
    const aspectRatio = elementWidth / elementHeight;
    let thumbWidth = maxThumbnailSize;
    let thumbHeight = maxThumbnailSize;

    if (aspectRatio > 1) {
      thumbHeight = maxThumbnailSize / aspectRatio;
    } else {
      thumbWidth = maxThumbnailSize * aspectRatio;
    }

    if (element.type === 'image') {
      const imageContent = element.content as any;
      if (imageContent?.url) {
        return (
          <div className="absolute inset-0 w-full h-full rounded overflow-hidden">
            <img
              src={imageContent.url}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        );
      }
      return null;
    }

    if (element.type === 'sticky') {
      const stickyColor = (element.properties as any)?.color || element.color || 'yellow';
      // Usar la misma paleta que el elemento sticky real
      const colorPalette = EXTENDED_PALETTES[stickyColor as keyof typeof EXTENDED_PALETTES] || EXTENDED_PALETTES.yellow;
      const bgColor = colorPalette.bg;
      const textColor = colorPalette.text;
      
      // Extraer texto limpio del contenido HTML si es necesario
      let stickyText = typeof element.content === 'string' ? element.content : 'Nota';
      // Remover HTML tags si existen
      stickyText = stickyText.replace(/<[^>]*>/g, '').trim();
      if (!stickyText) stickyText = 'Nota';
      
      return (
        <div
          className="w-full h-full rounded overflow-hidden shadow-sm absolute inset-0"
          style={{ 
            backgroundColor: bgColor,
            fontFamily: '"Patrick Hand", "Caveat", "Comic Sans MS", cursive',
          }}
        >
          <div className="p-3 h-full flex items-start">
            <p 
              className="text-sm font-medium break-words line-clamp-4"
              style={{ color: textColor }}
            >
              {stickyText.substring(0, 100)}
            </p>
          </div>
        </div>
      );
    }

    if (element.type === 'text') {
      const safeProps = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
      const textContent = typeof element.content === 'string' ? element.content : 'Texto';
      // Remover HTML tags para preview
      const cleanText = textContent.replace(/<[^>]*>/g, '').trim() || 'Texto';
      const fontSize = safeProps.fontSize || 24;
      const textColor = safeProps.color || '#000000';
      const bgColor = safeProps.backgroundColor || '#ffffff';
      const fontWeight = safeProps.fontWeight || 'normal';
      const textAlign = safeProps.textAlign || 'left';
      
      return (
        <div 
          className="w-full h-full rounded overflow-hidden flex items-center p-2 absolute inset-0"
          style={{ 
            backgroundColor: bgColor,
            color: textColor,
          }}
        >
          <p 
            className="w-full break-words line-clamp-4"
            style={{
              fontSize: `${Math.min((fontSize as number) * 0.4, 12)}px`,
              fontWeight,
              textAlign,
            }}
          >
            {cleanText.substring(0, 150)}
          </p>
        </div>
      );
    }

    if (element.type === 'notepad' || element.type === 'yellow-notepad') {
      const notepadContent = element.content as any;
      const title = notepadContent?.title || 'Cuaderno';
      
      // Intentar obtener el contenido de diferentes formas según el tipo de notepad
      // El código actual guarda el contenido HTML en 'text' aunque el tipo dice 'content' o 'pages'
      let preview = '';
      
      if (element.type === 'yellow-notepad') {
        // YellowNotepadContent usa 'text'
        preview = notepadContent?.text || '';
      } else {
        // NotepadContent: buscar en 'text' primero (lo que usa el código actual)
        // luego en 'content', luego en 'pages'
        if (notepadContent?.text) {
          preview = notepadContent.text;
        } else if (notepadContent?.content) {
          preview = notepadContent.content;
        } else if (Array.isArray(notepadContent?.pages) && notepadContent.pages.length > 0) {
          const currentPage = notepadContent.currentPage || 0;
          preview = notepadContent.pages[currentPage] || notepadContent.pages[0] || '';
        }
      }
      
      // Limpiar HTML y obtener texto plano
      let previewText = String(preview || '').replace(/<[^>]*>/g, '').trim();
      
      // Si después de limpiar HTML está vacío pero había HTML, mostrar indicador
      if (!previewText && preview && preview.length > 0) {
        previewText = '[Contenido con formato]';
      }
      
      
      // Si no hay preview text pero hay preview (HTML), mostrar indicador visual
      const displayText = previewText || (preview && preview.length > 0 ? '[Contenido con formato]' : 'Sin contenido');
      
      return (
        <div className="w-full h-full rounded overflow-hidden bg-white border border-gray-300 shadow-sm flex flex-col absolute inset-0">
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="font-semibold text-xs text-gray-800 truncate">{title}</div>
          </div>
          <div className="flex-1 p-3 overflow-hidden">
            <div className="text-xs text-gray-600 line-clamp-4 leading-relaxed">
              {displayText.substring(0, 120)}
            </div>
          </div>
        </div>
      );
    }

    if (element.type === 'comment' || (element.type as any) === 'comment-small') {
      const c = (element.content || {}) as any;
      const text = c?.text || c?.label || c?.title || 'Comentario';
      const safeProps = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
      const bgColor = safeProps.backgroundColor || 'rgba(255,255,255,0.7)';
      
      return (
        <div 
          className="w-full h-full rounded-lg overflow-hidden border border-gray-300 shadow-sm flex items-center justify-center p-3 absolute inset-0"
          style={{ backgroundColor: bgColor }}
        >
          <div className="flex items-center gap-2 w-full">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xs">💬</span>
            </div>
            <p className="text-xs text-gray-700 line-clamp-3 flex-1">
              {String(text).substring(0, 80)}
            </p>
          </div>
        </div>
      );
    }

    if (
      element.type === 'photo-grid' ||
      element.type === 'photo-grid-horizontal' ||
      element.type === 'photo-grid-adaptive'
    ) {
      const grid = (element.content || {}) as any;
      const title = grid?.title || 'Guía Fotos';
      const rows = grid?.rows || 0;
      const cols = grid?.columns || 0;
      const cells = Array.isArray(grid?.cells) ? grid.cells : [];
      const imageCells = cells.filter((c: any) => c?.url).slice(0, 4); // Mostrar hasta 4 imágenes
      
      return (
        <div className="w-full h-full rounded overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col absolute inset-0">
          <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="text-[10px] font-semibold text-gray-700 truncate">{title}</div>
            <div className="text-[9px] text-gray-500">{rows} x {cols} • {imageCells.length} imgs</div>
          </div>
          {imageCells.length > 0 ? (
            <div className="flex-1 grid grid-cols-2 gap-0.5 p-0.5">
              {imageCells.map((cell: any, idx: number) => (
                <div key={idx} className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={cell.url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400">
              Sin imágenes
            </div>
          )}
        </div>
      );
    }

    if (element.type === 'todo') {
      const todoContent = element.content as any;
      const title = todoContent?.title || 'Lista';
      const items = Array.isArray(todoContent?.items) ? todoContent.items : [];
      const visibleItems = items.slice(0, 3); // Mostrar hasta 3 items
      const completedCount = items.filter((item: any) => item && item.completed).length;
      
      return (
        <div className="w-full h-full rounded overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col absolute inset-0">
          <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="font-semibold text-xs text-gray-800 truncate">{title}</div>
            <div className="text-[10px] text-gray-500">{completedCount}/{items.length} completadas</div>
          </div>
          <div className="flex-1 p-2 space-y-1 overflow-y-auto">
            {visibleItems.length > 0 ? (
              visibleItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className={`w-3 h-3 rounded border-2 flex-shrink-0 ${
                    item.completed 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {item.completed && (
                      <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 truncate ${
                    item.completed ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}>
                    {item.text || `Item ${idx + 1}`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 text-center py-2">Sin items</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="bg-gradient-to-br from-gray-100 to-gray-200 rounded flex flex-col items-center justify-center text-xs text-gray-500 p-2"
        style={{ minHeight: thumbHeight }}
      >
        <div className="text-lg mb-1">{element.type.charAt(0).toUpperCase()}</div>
        <div className="text-center capitalize">{element.type}</div>
      </div>
    );
  };

  // Toggle minimize (copiado del notepad)
  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as CanvasElementProperties)?.size || { width: 378, height: 567 };

    // Convertir currentSize a valores numéricos para originalSize
    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 378,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 567,
    };

    if (isCurrentlyMinimized) {
        // Restaurar: recuperar tamaño original
        const { originalSize, ...restProps } = (properties || {}) as Partial<CanvasElementProperties>;
        const restoredSize = originalSize || { width: 378, height: 567 };
        const newProperties: Partial<CanvasElementProperties> = {
          ...restProps,
          size: restoredSize
        };

        onUpdate(id, {
            minimized: false,
            properties: newProperties,
        });
    } else {
        // Minimizar: guardar tamaño actual y reducir altura
        const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 378;
        onUpdate(id, {
            minimized: true,
            properties: {
              ...properties,
              size: { width: currentWidth, height: 48 },
              originalSize: currentSizeNumeric
            },
        });
    }
  }, [isPreview, minimized, properties, onUpdate, id]);

  return (
    <Card
      id={id}
      data-element-type="container"
      data-element-id={id}
      ref={containerRef}
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[200px] min-h-[300px]',
        'rounded-lg shadow-lg border border-gray-200/50',
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : '',
        isDragOver && 'ring-2 ring-green-500 ring-offset-2 bg-green-50/50',
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
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardHeader className="p-3 border-b border-gray-200 bg-white flex flex-row items-center justify-between group/header">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="drag-handle cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={titleInputRef}
            type="text"
            value={containerContent.title || ''}
            onChange={(e) => {
              handleTitleChange();
              const newContent: ContainerContent = { ...containerContent, title: e.target.value };
              onUpdate(id, { content: newContent });
            }}
            onBlur={handleTitleBlur}
            className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-1"
            placeholder="Título del contenedor..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => {}}
          />
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <SaveStatusIndicator status={titleSaveStatus} size="sm" />

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={layout === 'single' ? 'Dividir en dos columnas' : 'Una sola columna'}
            onClick={(e) => {
              e.stopPropagation();
              handleLayoutToggle();
            }}
          >
            <Columns2 className={cn('h-4 w-4', layout === 'two-columns' && 'text-blue-600')} />
          </Button>

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
            className="h-7 w-7"
            title="Restaurar Tamaño Original"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize(); }}
          >
            <Maximize className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            title="Cerrar contenedor"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex-1 p-3 overflow-y-auto",
          isDragOver && "bg-green-50/30"
        )}
        style={{ minHeight: 0 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {containedElements.length === 0 ? (
          <div className={cn(
            "flex flex-col items-center justify-center h-full text-sm text-gray-400 border-2 border-dashed rounded-lg transition-colors",
            isDragOver ? "border-green-400 bg-green-50/50 text-green-600" : "border-gray-200"
          )}>
            <Move className="w-8 h-8 mb-2 opacity-50" />
            <span>{isDragOver ? "Suelta aquí para agregar" : "Arrastra elementos aquí"}</span>
          </div>
        ) : (
          <div className={cn('grid gap-3', layout === 'two-columns' ? 'grid-cols-2' : 'grid-cols-1')}>
            {containedElements.map(({ elementId, element }) => (
              <div
                key={elementId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col group/card hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="w-full min-h-[140px] h-[140px] flex-shrink-0 relative">
                  {getElementThumbnail(element)}
                </div>

                <div className="px-3 py-2 border-t border-gray-100 flex flex-col gap-1">
                  <div className="text-xs font-medium text-gray-700 truncate">{getElementName(element)}</div>
                  <div className="text-[10px] text-gray-500">
                    {(() => {
                      const props = element.properties as any;
                      const size = props?.size || element.properties?.size;
                      if (size && typeof size === 'object') {
                        const width = size.width || element.width || 'Auto';
                        const height = size.height || element.height || 'Auto';
                        return `${width} × ${height}`;
                      }
                      return `${element.width || 'Auto'} × ${element.height || 'Auto'}`;
                    })()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                    title="Soltar elemento del contenedor"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReleaseElement(elementId);
                    }}
                  >
                    <LinkIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

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
