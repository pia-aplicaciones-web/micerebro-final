// @ts-nocheck
'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { CommonElementProps, YellowNotepadContent } from '@/lib/types';
import {
  Grid3x3,
  Search,
  Trash2,
  X,
  FileImage,
  MoreVertical,
  CalendarDays,
  Minus,
  Maximize,
  FileText,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function YellowNotepadElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview,
    minimized,
  } = props;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Parsear contenido
  const typedContent = (content || {}) as YellowNotepadContent;
  const textContent = typedContent.text || '';
  const initialSearchQuery = typedContent.searchQuery || '';
  const initialTitle = typedContent.title || 'Nuevo Notepad';
  
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
  const [title, setTitle] = useState(initialTitle);
  
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
      // Usar refs para evitar dependencias circulares
      const currentText = textContentRef.current;
      const normalizedText = (currentText || '').trim();
      if (newText !== normalizedText) {
        await onUpdate(id, { 
          content: { 
            text: newText,
            searchQuery: searchQuery 
          } 
        });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => {
      const normalizedOld = (oldContent || '').trim();
      const normalizedNew = (newContent || '').trim();
      return normalizedOld === normalizedNew;
    },
  });

  // Ref para almacenar el textContent anterior y evitar loops
  const prevTextContentRef = useRef<string>('');
  
  // Sincronizar contenido desde props y restaurar al maximizar
  useEffect(() => {
    if (contentRef.current) {
      const isFocused = document.activeElement === contentRef.current;
      // Restaurar contenido si no está minimizado y no está enfocado, y el texto de la prop ha cambiado
      if (!minimized && !isFocused && contentRef.current.innerText !== textContent) {
        contentRef.current.innerText = textContent || '';
      } else if (minimized && contentRef.current.innerText !== '') {
        // Cuando se minimiza, el contenido del div puede ser vaciado temporalmente
        // contentRef.current.innerText = '';
      }
    }
  }, [textContent, minimized]);


  // Exportar a PNG
  const handleExportToPng = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const yellowNotepadCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!yellowNotepadCard) {
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

      const canvas = await html2canvas(yellowNotepadCard, {
        backgroundColor: '#FFFFE0',
        scale: 2.1, // Alta resolución reducida 30% (de 3x a 2.1x)
        useCORS: true,
        logging: false,
        allowTaint: false,
        windowWidth: yellowNotepadCard.scrollWidth,
        windowHeight: yellowNotepadCard.scrollHeight,
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
        link.download = `yellow-notepad_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportado',
          description: 'El cuaderno se ha exportado como PNG de alta resolución.',
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

  // Copiar texto como .txt ordenado
  const handleCopyAsTxt = useCallback(async () => {
    try {
      const notepadContent = isYellowNotepadContent(content) ? content : { title: 'Cuaderno Amarillo', pages: Array(5).fill('<div><br></div>') };
      const title = notepadContent.title || 'Cuaderno Amarillo';

      let text = `${title}\n${'='.repeat(title.length)}\n\n`;

      // Agregar cada página
      notepadContent.pages?.forEach((pageContent: string, index: number) => {
        if (pageContent && pageContent.trim()) {
          // Convertir HTML a texto plano
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = pageContent;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';

          if (plainText.trim()) {
            text += `Página ${index + 1}:\n${plainText}\n\n`;
          }
        }
      });

      if (!text.trim()) {
        toast({
          variant: 'destructive',
          title: 'Sin contenido',
          description: 'El cuaderno no tiene contenido para copiar.',
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'El contenido del cuaderno se ha copiado como texto ordenado.',
      });
    } catch (error: any) {
      console.error('Error al copiar:', error);
      toast({
        variant: 'destructive',
        title: 'Error al copiar',
        description: 'No se pudo copiar el contenido.',
      });
    }
  }, [content, toast]);

  const handleInsertDate = () => {
    if (!contentRef.current) return;
    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const dateStr = formatter.format(new Date());
    const current = contentRef.current.innerText || '';
    contentRef.current.innerText = current ? `${current}\n${dateStr}` : dateStr;
    handleContentInput();
  };


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
    // Usar ref para evitar dependencias circulares
    const currentContent = typedContentRef.current;
    onUpdate(id, { 
      content: { 
        ...currentContent,
        searchQuery: query 
      } 
    });
  }, [id, onUpdate]); // Eliminar typedContent de dependencias

  // Manejar cambio de título
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Guardar inmediatamente
    onUpdate(id, {
      content: {
        text: textContent,
        searchQuery: searchQuery,
        title: newTitle
      }
    });
  }, [id, textContent, searchQuery, onUpdate]);

  // Manejar eliminar
  const handleDelete = useCallback(() => {
    if (isDeleting) return;
    setIsDeleting(true);
    deleteElement(id);
  }, [id, deleteElement, isDeleting]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteElement) {
      deleteElement(id);
    }
  }, [id, deleteElement]);

  // Toggle minimize (copiado del notepad)
  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as any)?.size || { width: 400, height: 600 };

    // Convertir currentSize a valores numéricos para originalSize
    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 400,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 600,
    };

    if (isMinimized) {
        // Restaurar: recuperar tamaño original
        const { originalSize, ...restProps } = (properties || {}) as any;
        const restoredSize = originalSize || { width: 400, height: 600 };
        const newProperties = {
          ...restProps,
          size: restoredSize
        };

        onUpdate(id, {
            minimized: false,
            properties: newProperties,
        });
    } else {
        // Minimizar: guardar tamaño actual y reducir altura
        const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 400;
        onUpdate(id, {
            minimized: true,
            properties: {
              ...properties,
              size: { width: currentWidth, height: 48 },
              originalSize: currentSizeNumeric
            },
        });
    }
  }, [isPreview, isMinimized, properties, onUpdate, id]);

  return (
    <div 
      data-element-id={id}
      className={cn(
        'relative w-full h-full flex flex-col overflow-hidden',
        isMinimized ? 'h-20' : 'h-full'
      )}
      style={{
        backgroundColor: '#FFFFE0', // Amarillo claro
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
      {/* Header - Color amarillo claro */}
      <div
        className="flex items-center justify-between px-4 py-3 drag-handle"
        style={{
          backgroundColor: '#FFF9C4',
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
          <Input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-sm font-bold border-none shadow-none focus-visible:ring-0 p-0 bg-transparent h-8 w-32"
            style={{ color: '#000000' }}
            placeholder="Título..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={() => onUpdate(id, { isSelected: true })}
            contentEditable={!isPreview}
          />
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
              <DropdownMenuItem onClick={handleCopyAsTxt}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Copiar texto como .txt ordenado</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleExportToPng(e)}} disabled={isExportingPng}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>{isExportingPng ? 'Exportando...' : 'Exportar a PNG: alta resolución'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            onClick={handleDelete}
            style={{ color: '#000000' }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            onClick={handleClose}
            style={{ color: '#000000' }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area - Amarillo con líneas */}
      <div
        className="flex-1 overflow-y-auto relative"
        style={{
          backgroundColor: '#FFFFE0',
          position: 'relative',
        }}
      >
        {/* Línea vertical izquierda (margen) */}
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: '15px',
            borderLeft: '1px solid #ADD8E6',
          }}
        />

        {/* Líneas horizontales de fondo - Ajustadas al lineHeight exacto */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            // lineHeight es 25px, así que las líneas deben estar cada 25px
            // La primera línea empieza en 0, luego cada 25px
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 24px, #ADD8E6 24px, #ADD8E6 25px)',
            backgroundPosition: '15px 0',
            backgroundSize: '100% 25px', // Exactamente igual al lineHeight
          }}
        />

        {/* Área de texto editable */}
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
            'relative z-10 w-full min-h-full',
            'outline-none',
            'text-black',
            'whitespace-pre-wrap',
            'break-words',
            'select-text' // Permitir selección de texto
          )}
          style={{
            paddingLeft: '20px', // Espacio después de la línea vertical (15px línea + 5px espacio)
            paddingRight: '15px',
            paddingTop: '12px', // Padding superior para alinear con la primera línea
            paddingBottom: '12px',
            fontFamily: "'Poppins', sans-serif",
            fontSize: '14px',
            lineHeight: '25px', // CRÍTICO: Debe coincidir exactamente con el backgroundSize de las líneas
            color: '#000000',
            minHeight: '100%',
            userSelect: 'text', // Permitir selección de texto
            WebkitUserSelect: 'text',
          }}
        />

        {/* Indicador de guardado */}
        {isSelected && (
          <div className="absolute top-2 right-2 z-20">
            <SaveStatusIndicator status={saveStatus} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
