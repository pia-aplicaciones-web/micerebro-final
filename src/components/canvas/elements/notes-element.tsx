'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Search, Trash2, FileImage, MoreVertical, Grid3x3, CalendarDays, Minus, X, Paintbrush, Edit, Plus, FileText, Copy, ArrowLeft, ArrowRight, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function NotesElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview,
  } = props;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Parsear contenido
  const typedContent = (content || {}) as { text?: string; searchQuery?: string };
  const textContent = typedContent.text || '';
  const initialSearchQuery = typedContent.searchQuery || '';

  // Estado del texto
  const [text, setText] = useState(textContent);

  // Inicializar color de fondo desde properties o usar valor por defecto
  const initialBackgroundColor = (properties as any)?.backgroundColor || '#dcefe1';
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);

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

  // Refs para mantener referencias estables y evitar loops
  const typedContentRef = useRef(typedContent);
  const textContentRef = useRef(textContent);

  // Sincronizar refs cuando cambian
  useEffect(() => {
    typedContentRef.current = typedContent;
    textContentRef.current = textContent;
  }, [typedContent, textContent]);

  // Estado local para búsqueda (sincronizado con contenido)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Ref para almacenar el searchQuery anterior y evitar loops
  const prevSearchQueryRef = useRef<string | undefined>(undefined);

  // Sincronizar searchQuery cuando cambia el contenido
  useEffect(() => {
    const currentSearchQuery = typedContent.searchQuery;
    // Solo actualizar si realmente cambió
    if (currentSearchQuery !== undefined && currentSearchQuery !== prevSearchQueryRef.current) {
      prevSearchQueryRef.current = currentSearchQuery;
      if (currentSearchQuery !== searchQuery) {
        setSearchQuery(currentSearchQuery);
      }
    }
  }, [typedContent.searchQuery, searchQuery]);

  // Hook de autoguardado
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = contentRef.current?.innerText || '';
      return html;
    },
    onSave: async (newText) => {
      setText(newText);
      await onUpdate(id, {
        content: {
          text: newText,
          searchQuery: searchQuery
        }
      });
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => {
      const normalizedCurrent = (text || '').trim();
      const normalizedNew = (newContent || '').trim();
      return normalizedCurrent === normalizedNew;
    },
  });

  // Ref para almacenar el textContent anterior y evitar loops
  const prevTextContentRef = useRef<string>('');

  // Sincronizar contenido desde props y restaurar al maximizar
  useEffect(() => {
    if (contentRef.current) {
      const isFocused = document.activeElement === contentRef.current;
      // Restaurar contenido si no está minimizado y no está enfocado, y el texto de la prop ha cambiado
      if (!isMinimized && !isFocused && contentRef.current.innerText !== text) {
        contentRef.current.innerText = text || '';
      } else if (isMinimized && contentRef.current.innerText !== '') {
        // Cuando se minimiza, el contenido del div puede ser vaciado temporalmente para evitar que se vea
        // No es estrictamente necesario, pero evita que el contenido se muestre si el div no está oculto visualmente
        // contentRef.current.innerText = ''; 
      }
    }
  }, [text, isMinimized]);


  // Exportar a PNG
  const handleExportToPng = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const notesCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!notesCard) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo encontrar el elemento para exportar.',
        });
        return;
      }

      setIsExportingPng(true);
      toast({
        title: 'Exportando...',
        description: 'Generando imagen PNG de alta resolución.',
      });

      const canvas = await html2canvas(notesCard, {
        backgroundColor: backgroundColor,
        scale: 2.1, // Alta resolución reducida 30% (de 3x a 2.1x)
        useCORS: true,
        logging: false,
        allowTaint: false,
        windowWidth: notesCard.scrollWidth,
        windowHeight: notesCard.scrollHeight,
      });

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo generar la imagen.',
          });
          setIsExportingPng(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `apuntes_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportado',
          description: 'Los apuntes se han exportado como PNG de alta resolución.',
        });
        setIsExportingPng(false);
      }, 'image/png', 1.0);
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo exportar.',
      });
      setIsExportingPng(false);
    }
  }, [toast, id]);

  // Manejar cambios en el contenido
  const handleContentInput = useCallback(() => {
    handleChange();
  }, [handleChange]);

  const handleContentBlur = useCallback(async () => {
    await handleAutoSaveBlur();
  }, [handleAutoSaveBlur]);

  // Manejar búsqueda
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // No guardar inmediatamente, solo actualizar localmente para filtrado
  }, []);

  // Insertar fecha
  const handleInsertDate = useCallback(() => {
    if (!contentRef.current) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('es-ES');
    const dateTimeStr = `${dateStr} ${timeStr}`;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(dateTimeStr));
      // Colocar cursor después del texto insertado
      range.setStartAfter(range.endContainer);
      range.setEndAfter(range.endContainer);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Si no hay selección, agregar al final
      contentRef.current.innerText += dateTimeStr;
    }
    // Trigger save
    handleChange();
  }, [handleChange]);

  // Función de guardado manual (para compatibilidad con código existente)
  const saveContent = useCallback(async () => {
    handleChange();
  }, [handleChange]);

  // Función para copiar texto como .txt ordenado
  const handleCopyAsTxt = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      // Obtener el texto plano sin formato HTML
      const textContent = contentRef.current.innerText || contentRef.current.textContent || '';

      // Crear contenido ordenado con título
      const notesTitle = typedContent.title || 'Apuntes sin título';
      const orderedText = `${notesTitle}\n${'='.repeat(notesTitle.length)}\n\n${textContent.trim()}\n\n---\nExportado desde CanvasMind\n${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      await navigator.clipboard.writeText(orderedText);
      toast({ title: 'Texto copiado como .txt ordenado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar texto' });
    }
  }, [typedContent.title, toast]);

  const handlePageChange = useCallback((newPage: number) => {
    if (isPreview) return;
    handleChange();
    onUpdate(id, { content: { ...typedContent, currentPage: newPage } });
  }, [isPreview, handleChange, onUpdate, id, typedContent]);

  const handleAddPage = useCallback(() => {
    if (isPreview) return;
    if ((typedContent.pages?.length || 0) < 20) {
      handleChange();
      const newPages = [...(typedContent.pages || []), '<div><br></div>'];
      onUpdate(id, {
        content: { ...typedContent, pages: newPages, currentPage: newPages.length - 1 },
      });
    }
  }, [isPreview, typedContent, onUpdate, id, handleChange]);

  const handleRestoreOriginalSize = useCallback(() => {
    if (isPreview) return;

    // Restaurar tamaño original de notes (21cm x 15cm horizontal)
    const originalSize = { width: 794, height: 567 };

    onUpdate(id, {
      properties: {
        ...properties,
        size: originalSize,
      },
    });
  }, [isPreview, properties, onUpdate, id]);

  // Cambiar color de fondo
  const handleChangeColor = useCallback((colorKey: { hex: string }) => {
    const selectedPalette = EXTENDED_PALETTES[colorKey.hex as keyof typeof EXTENDED_PALETTES];
    if (selectedPalette) {
      setBackgroundColor(selectedPalette.bg);
      // Guardar el color en properties
      onUpdate(id, {
        properties: {
          ...properties,
          backgroundColor: selectedPalette.bg
        }
      });
    }
  }, [id, onUpdate, properties]);



  // Toggle minimize - FIX CRÍTICO: Guardar estado en elemento para persistencia
  const toggleMinimize = useCallback(() => {
    const newMinimizedState = !isMinimized;
    setIsMinimized(newMinimizedState);

    // CRÍTICO: Guardar estado de minimización en el elemento para persistencia
    onUpdate(id, {
      properties: {
        ...properties,
        minimized: newMinimizedState
      }
    });
  }, [isMinimized, onUpdate, id, properties]);

  // Handle delete
  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    deleteElement(id);
  }, [deleteElement, id]);

  return (
    <div
      data-element-id={id}
      className={cn(
        'relative w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md border-none',
        isMinimized ? 'h-12' : 'h-full'
      )}
      style={{
        backgroundColor: backgroundColor,
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      onMouseDown={(e) => {
        // CRÍTICO: Solo activar drag si el clic NO es en el área de texto editable
        const target = e.target as HTMLElement;
        const isTextArea = target === contentRef.current || contentRef.current?.contains(target);
        if (!isTextArea) {
          // Agregar clase drag-handle dinámicamente solo si no es el área de texto
          e.currentTarget.classList.add('drag-handle');
        } else {
          // Remover drag-handle si es el área de texto
          e.currentTarget.classList.remove('drag-handle');
        }
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 drag-handle"
        style={{
          backgroundColor: '#F7D946',
          color: '#000000',
        }}
      >
        {/* Left: Menu icon and title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            style={{ color: '#000000' }}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <span
              className="text-sm font-bold leading-tight cursor-text select-none"
              style={{ color: '#000000' }}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={(e) => {
                const newTitle = e.currentTarget.textContent || 'Apuntes';
                // Aquí puedes agregar lógica para guardar el título si es necesario
              }}
              onFocus={() => onUpdate(id, { isSelected: true })}
            >
              Apuntes
            </span>
          </div>
        </div>

        {/* Center: Search bar */}
        <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
          <Search className="h-4 w-4" style={{ color: '#000000' }} />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-7 text-sm bg-transparent border-none text-black placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{
              color: '#000000',
            }}
          />
        </div>

        {/* Right: Action icons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Insertar fecha"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsertDate(); }}
            style={{ color: '#000000' }}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Copiar texto"
            onClick={handleCopyAsTxt}
            style={{ color: '#000000' }}
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/10 p-0"
                title="Cambiar color de fondo"
                style={{ color: '#000000' }}
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
                    onClick={() => handleChangeColor({ hex: key })}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/10 p-0"
                style={{ color: '#000000' }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleExportToPng(e)}} disabled={isExportingPng}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>{isExportingPng ? 'Exportando...' : 'Exportar a PNG: alta resolución'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation();}}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Cambiar título</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation();}}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar nueva página</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Restaurar tamaño original"
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize();}}
            style={{ color: '#000000' }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title={isMinimized ? "Maximizar" : "Minimizar"}
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); toggleMinimize();}}
            style={{ color: '#000000' }}
          >
            {isMinimized ? <Grid3x3 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0 text-red-600 hover:bg-red-50"
            title="Eliminar apuntes"
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleDelete();}}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0 text-gray-600 hover:bg-gray-200"
            title="Cerrar apuntes"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { hidden: true });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Solo mostrar si no está minimizado */}
      {!isMinimized && (
        <div
          ref={contentRef}
          contentEditable={!isPreview}
          onInput={handleContentInput}
          onBlur={handleContentBlur}
          onMouseDown={(e) => {
            // CRÍTICO: Prevenir que el drag se active cuando se está seleccionando texto
            // Si el usuario hace clic en el área de texto, no activar el drag
            if (e.target === e.currentTarget || (e.target as HTMLElement).isContentEditable) {
              e.stopPropagation();
            }
          }}
          className={cn(
            'relative flex-1 p-4',
            'text-black',
            'whitespace-pre-wrap',
            'break-words',
            'select-text'
          )}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '14px', // Tamaño solicitado
            lineHeight: '24px', // Interlineado preciso de 24px para alineación perfecta
            color: '#000000',
            height: '300px', // Altura fija
            overflowY: 'auto', // Scroll vertical
            userSelect: 'text',
            WebkitUserSelect: 'text',
            backgroundColor: '#FFFFFF', // Contenedor blanco
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px)', // Líneas horizontales
            backgroundSize: '100% 24px', // Tamaño exacto de las líneas
            paddingTop: '8px', // Ajustar texto sobre la línea del cuaderno
          }}
        />
      )}

      {/* FOOTER DE PAGINACIÓN */}
      {!isPreview && (
          <div className="p-2 border-t flex items-center justify-between bg-gray-50">
              <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Página Anterior"
                  onClick={() => handlePageChange((typedContent.currentPage || 0) - 1)}
                  disabled={(typedContent.currentPage || 0) === 0}
              >
                  <ArrowLeft className="size-4" />
              </Button>
              <span className="text-xs text-gray-700">
                  Página {(typedContent.currentPage || 0) + 1} de {typedContent.pages?.length || 1}
              </span>
              <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Página Siguiente"
                  onClick={() => handlePageChange((typedContent.currentPage || 0) + 1)}
                  disabled={(typedContent.currentPage || 0) === (typedContent.pages?.length || 1) - 1}
              >
                  <ArrowRight className="size-4" />
              </Button>
              <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 ml-2"
                  title="Agregar Página"
                  onClick={handleAddPage}
                  disabled={(typedContent.pages?.length || 0) >= 20}
              >
                  <Plus className="size-4" />
              </Button>
          </div>
      )}

      {/* Indicador de guardado */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-20">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      )}
    </div>
  );
}