
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';
import { Paintbrush, GripVertical, Plus, X, Maximize, FileImage, Copy, FileText, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

const COLORS = [
  '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3',
  '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF'
];

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

// Función helper para obtener colores
const getColorPalette = (colorValue: string) => {
  // Si es un color del mapa
  if (colorValue in EXTENDED_PALETTES) {
    return EXTENDED_PALETTES[colorValue as keyof typeof EXTENDED_PALETTES];
  }
  // Si es un hex directo, generar texto oscuro automáticamente
  if (colorValue.startsWith('#')) {
    return { bg: colorValue, text: '#333333', name: 'Personalizado' };
  }
  // Default amarillo
  return EXTENDED_PALETTES.yellow;
};

export default function StickyNoteElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    isSelected,
    onUpdate,
    onEditElement,
    onSelectElement,
    deleteElement,
    isPreview,
    minimized,
    scale = 1,
    offset = { x: 0, y: 0 },
  } = props;

  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const colorValue = (typeof safeProperties.color === 'string' ? safeProperties.color : 'yellow') || 'yellow';
  const currentPalette = getColorPalette(colorValue);

  // REGLA #4: Rotación para notas adhesivas
  const rotation = safeProperties.rotation || 0;

  // Tamaño de fuente del menú format
  const fontSize = safeProperties.fontSize || '16px';

  const editorRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

   // Type guard para content: sticky notes usan un objeto con una propiedad de texto
   const typedContent = (content || {}) as { text: string };
   const textContent = typedContent.text || '';

  // Hook de autoguardado robusto
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = editorRef.current?.innerHTML || '';
      // Normalizar HTML para comparación consistente
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newContent) => {
      // Normalizar también el contenido guardado para comparar
      const normalizedTextContent = (textContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      if (newContent !== normalizedTextContent) {
        await onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => {
      // Normalizar ambos para comparación
      const normalizedOld = (oldContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedNew = (newContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      return normalizedOld === normalizedNew;
    },
  });

  // Ref para almacenar el contenido anterior y evitar loops
  const prevContentRef = useRef<string>('');
  
  // Sincronizar contenido desde props y restaurar al maximizar
  useEffect(() => {
    if (editorRef.current) {
      const isFocused = document.activeElement === editorRef.current;
      // Restaurar contenido si no está minimizado y no está enfocado, y el texto de la prop ha cambiado
      if (!minimized && !isFocused && editorRef.current.innerHTML !== textContent) {
        // Usar helper para preservar cursor y formato si hay HTML
        try {
          const { updateInnerHTMLPreservingCursor } = require('@/lib/cursor-helper');
          const hasHTML = /<[^>]+>/.test(textContent);
          if (hasHTML) {
            updateInnerHTMLPreservingCursor(editorRef.current, textContent);
          } else {
            editorRef.current.innerText = textContent || ''; // Si es texto plano, simplemente actualizar innerText
          }
        } catch (error) {
          // Fallback si el helper no está disponible
          editorRef.current.innerHTML = textContent || '';
        }
      } else if (minimized && editorRef.current.innerHTML !== '') {
        // Cuando se minimiza, el contenido del div puede ser vaciado temporalmente
        // editorRef.current.innerHTML = '';
      }
    }
  }, [textContent, minimized]);


  const handleContentChange = () => {
    // Programar auto-save con debounce
    handleChange();
  };

  const handleBlurWithSave = async () => {
    // Guardado inmediato y obligatorio en onBlur
    await handleAutoSaveBlur();
  };

  const handleColorChange = (newColor: { hex: string }) => {
    onUpdate(id, { properties: { ...safeProperties, color: newColor.hex } });
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteElement) {
      deleteElement(id);
    }
  };

  const handleAddContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Crear una nueva etiqueta/tag para la nota adhesiva
    const newTag = `etiqueta${(properties?.tags?.length || 0) + 1}`;
    const currentTags = properties?.tags || [];
    const updatedTags = [...currentTags, newTag];

    // Actualizar las propiedades con la nueva etiqueta
    onUpdate(id, {
      properties: {
        ...properties,
        tags: updatedTags
      }
    });
  };

  // REGLA #4: Manejar rotación
  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRotation = ((rotation || 0) + 15) % 360;
    onUpdate(id, { properties: { ...safeProperties, rotation: newRotation } });
  };

  // Exportar a PNG (copiado de todo-list-element)
  const handleExportPNG = async () => {
    const stickyCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
    if (!stickyCard) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo encontrar el elemento para exportar.',
      });
      return;
    }

    try {
      // Mostrar toast de carga
      toast({
        title: 'Exportando...',
        description: 'Generando imagen PNG de la nota adhesiva.',
      });

      // Capturar el elemento usando html2canvas
      const canvas = await html2canvas(stickyCard, {
        scale: 2.1,
        backgroundColor: currentPalette.bg,
        useCORS: true,
        logging: false,
        allowTaint: false,
      });

      // Convertir canvas a blob y descargar
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo generar la imagen.',
          });
          return;
        }

        // Crear URL temporal y descargar
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nota_adhesiva_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportado',
          description: 'La nota adhesiva se ha exportado como PNG.',
        });
      }, 'image/png', 1.0);
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo exportar.',
      });
    }
  };

  // Nueva función: Exportar captura usando html-to-image
  const handleExportCapture = useCallback(async () => {
    try {
      const stickyElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!stickyElement) {
        console.error('No se pudo encontrar el elemento de la nota adhesiva');
        return;
      }

      console.log('Capturando nota adhesiva...');
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

      const dataUrl = await toPng(stickyElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: currentPalette.bg,
        includeQueryParams: false,
        skipFonts: true,
        width: stickyElement.offsetWidth,
        height: stickyElement.offsetHeight,
        filter: (element) => {
          if (element.tagName === 'LINK' && element.getAttribute('href')?.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });

      setIsCapturing(false);

      const link = document.createElement('a');
      link.download = `nota-adhesiva_captura.png`;
      link.href = dataUrl;
      link.click();

      console.log('Captura de la nota adhesiva completada');
    } catch (error: any) {
      setIsCapturing(false);
      console.error('Error en captura de la nota adhesiva:', error);
      console.error('Error message:', error.message);
    }
  }, [id, currentPalette.bg]);

  // Copiar texto de la nota adhesiva
  const handleCopyText = async () => {
    try {
      const textContent = content?.text || '';
      const tagText = properties?.tags?.length ? `\nEtiquetas: ${properties.tags.join(', ')}` : '';

      const fullText = `${textContent}${tagText}`.trim();

      if (!fullText) {
        toast({
          variant: 'destructive',
          title: 'Sin contenido',
          description: 'La nota adhesiva no tiene texto para copiar.',
        });
        return;
      }

      await navigator.clipboard.writeText(fullText);
      toast({
        title: 'Copiado',
        description: 'El contenido de la nota adhesiva se ha copiado al portapapeles.',
      });
    } catch (error: any) {
      console.error('Error al copiar:', error);
      toast({
        variant: 'destructive',
        title: 'Error al copiar',
        description: 'No se pudo copiar el contenido.',
      });
    }
  };

  // Toggle minimize (copiado del notepad)
  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as CanvasElementProperties)?.size || { width: 224, height: 224 };

    // Convertir currentSize a valores numéricos para originalSize
    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 224,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 224,
    };

    if (isCurrentlyMinimized) {
        // Restaurar: recuperar tamaño original
        const { originalSize, ...restProps } = (properties || {}) as Partial<CanvasElementProperties>;
        const restoredSize = originalSize || { width: 224, height: 224 };
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
        const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 224;
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
        className={cn(
          'w-full h-full flex flex-col relative group overflow-visible',
          'min-w-[200px] min-h-[150px] max-w-[400px] max-h-[500px]',
          'rounded-lg shadow-md border-none'
        )}
        style={{
          backgroundColor: currentPalette.bg,
        }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('.drag-handle')) return;
          e.stopPropagation();
          onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        onDoubleClick={() => onEditElement(id)}
      >
      {/* Header con iconos en la esquina superior izquierda */}
      <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded">
          <GripVertical className="h-4 w-4 text-gray-700" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 hover:bg-black/10 rounded"
          title="Crear etiqueta"
          onClick={handleAddContent}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-4 w-4 text-gray-700" />
        </Button>
        {isSelected && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1 hover:bg-black/10 rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Paintbrush className="h-4 w-4 text-gray-700" />
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
                        colorValue === key && 'ring-2 ring-offset-1 ring-gray-800 scale-110'
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
            {/* Botón exportar PNG */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1 hover:bg-black/10 rounded"
                  title="Más opciones"
                >
                  <Maximize className="h-4 w-4 text-gray-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing}>
                  <Camera className="mr-2 h-4 w-4" />
                  <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleExportPNG(); }}>
                  <FileImage className="mr-2 h-4 w-4" />
                  <span>Exportar PNG</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyText(); }}>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Copiar texto</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 hover:bg-black/10 rounded"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="h-4 w-4 text-gray-700" />
        </Button>
      </div>

      {/* Contenido editable */}
      <div className="relative flex-grow">
        <div
          ref={editorRef}
          contentEditable={!isPreview}
          suppressContentEditableWarning
          onInput={handleContentChange}
          onBlur={handleBlurWithSave}
          onFocus={() => onEditElement(id)}
          className="text-base font-medium break-words outline-none cursor-text p-4 pt-6"
          style={{
            color: currentPalette.text,
            fontFamily: '"Patrick Hand", "Caveat", "Comic Sans MS", cursive',
            fontSize: fontSize,
            lineHeight: '1.6',
            minHeight: 'calc(100% - 1rem)'
          }}
        />
        {/* Indicador de estado de guardado */}
        <div className="absolute top-2 right-2 z-10">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      </div>

    </Card>
  );
}
