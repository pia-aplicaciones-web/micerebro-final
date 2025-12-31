// @ts-nocheck
'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { CommonElementProps, YellowNotepadContent, NotepadContent } from '@/lib/types';
import {
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
  GripVertical,
  Info,
  Eraser,
  Settings,
  ArrowLeft,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
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
  const titleRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportPdfDialogOpen, setIsExportPdfDialogOpen] = useState(false);

  // Parsear contenido
  const typedContent = (content || {}) as YellowNotepadContent;
  const currentPageIndex = typedContent.currentPage || 0;
  const currentPageContent = typedContent.pages?.[currentPageIndex] || '';
  const initialSearchQuery = typedContent.searchQuery || '';
  const initialTitle = typedContent.title || 'Nuevo Block';
  
  // Refs para mantener referencias estables y evitar loops
  const typedContentRef = useRef(typedContent);
  const currentPageContentRef = useRef(currentPageContent);
  
  // Sincronizar refs cuando cambian
  useEffect(() => {
    typedContentRef.current = typedContent;
    currentPageContentRef.current = currentPageContent;
  }, [typedContent, currentPageContent]);
  
  // Estado local para búsqueda (sincronizado con contenido)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Estado local para título editable
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

  // Sincronizar título cuando cambia el contenido
  useEffect(() => {
    const currentTitle = typedContent.title || 'Nuevo Block';
    if (currentTitle !== title) {
      setTitle(currentTitle);
      // Actualizar el DOM si el ref existe
      if (titleRef.current && titleRef.current.innerText !== currentTitle) {
        titleRef.current.innerText = currentTitle;
      }
    }
  }, [typedContent.title, title]);

  // Hook de autoguardado
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = contentRef.current?.innerHTML || '';
      return html;
    },
    onSave: async (newHtml) => {
      // Usar refs para evitar dependencias circulares
      const currentContent = currentPageContentRef.current;
      const normalizedCurrent = (currentContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedNew = (newHtml || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

      if (normalizedNew !== normalizedCurrent) {
        const updatedPages = [...(typedContent.pages || [])];
        updatedPages[currentPageIndex] = newHtml;

        await onUpdate(id, {
          content: {
            ...typedContent,
            pages: updatedPages
          }
        });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => {
      const normalizedOld = (oldContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedNew = (newContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
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
      if (!minimized && !isFocused && contentRef.current.innerHTML !== currentPageContent) {
        contentRef.current.innerHTML = currentPageContent || '';
      } else if (minimized && contentRef.current.innerHTML !== '') {
        // Cuando se minimiza, el contenido del div puede ser vaciado temporalmente
        // contentRef.current.innerHTML = '';
      }
    }
  }, [currentPageContent, minimized]);


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
      const title = typedContent.title || 'Nuevo Block';
      const pages = typedContent.pages || [];

      if (!pages.length || !pages.some(page => page && page.trim())) {
        toast({
          variant: 'destructive',
          title: 'Sin contenido',
          description: 'El block no tiene contenido para copiar.',
        });
        return;
      }

      let text = `${title}\n${'='.repeat(title.length)}\n\n`;

      // Agregar cada página
      pages.forEach((pageContent: string, index: number) => {
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
          description: 'El block no tiene contenido para copiar.',
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'El contenido del block se ha copiado como texto ordenado.',
      });
    } catch (error: any) {
      console.error('Error al copiar:', error);
      toast({
        variant: 'destructive',
        title: 'Error al copiar',
        description: 'No se pudo copiar el contenido.',
      });
    }
  }, [typedContent, toast]);

  const handlePageChange = useCallback((newPage: number) => {
    if (isPreview) return;
    const totalPages = typedContent.pages?.length || 1;
    if (newPage >= 0 && newPage < totalPages) {
      onUpdate(id, {
        content: { ...typedContent, currentPage: newPage },
      });
    }
  }, [isPreview, typedContent, onUpdate, id]);

  const handleAddPage = useCallback(() => {
    if (isPreview) return;
    if ((typedContent.pages?.length || 0) < 20) {
      const newPages = [...(typedContent.pages || []), '']; // Página vacía
      onUpdate(id, {
        content: { ...typedContent, pages: newPages, currentPage: newPages.length - 1 },
      });
    }
  }, [isPreview, typedContent, onUpdate, id]);

  const execCommand = useCallback((e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (contentRef.current) {
      contentRef.current.focus();
      document.execCommand(command, false, value ?? undefined);
    }
  }, []);

  const handleRemoveFormat = useCallback((e: React.MouseEvent) => execCommand(e, 'removeFormat'), [execCommand]);

  const handleInsertDate = useCallback((e: React.MouseEvent) => execCommand(e, 'insertHTML', `<span style="color: #a0a1a6;">-- ${format(new Date(), 'dd/MM/yy')} </span>`), [execCommand]);

  // Hook de autoguardado para el título
  const { handleBlur: handleTitleBlurAutoSave } = useAutoSave({
    getContent: () => titleRef.current?.innerText || '',
    onSave: async (newTitle) => {
      if (isPreview || !titleRef.current) return;
      if (typedContent.title !== newTitle) {
        await onUpdate(id, { content: { ...typedContent, title: newTitle } });
      }
    },
    debounceMs: 1000, // Título se guarda más rápido
    disabled: isPreview,
  });

  const handleTitleFocus = useCallback(() => {
    if (isPreview) return;
    onUpdate(id, { isSelected: true });
  }, [isPreview, onUpdate, id]);

  const handleTitleBlur = useCallback(async () => {
    if (isPreview || !titleRef.current) return;
    await handleTitleBlurAutoSave();
  }, [isPreview, handleTitleBlurAutoSave]);


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
        className="flex items-center justify-between px-4 py-3"
        style={{
          backgroundColor: '#FFF9C4',
          color: '#000000',
        }}
      >
        {/* Left: Drag handler and editable title */}
        <div className="flex items-center gap-3">
          <div className="p-1 drag-handle cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4" style={{ color: '#000000' }} />
          </div>
          <div
            ref={titleRef}
            contentEditable={!isPreview}
            spellCheck="true"
            suppressContentEditableWarning
            onFocus={handleTitleFocus}
            onBlur={handleTitleBlur}
            className="bg-transparent flex-grow outline-none cursor-text font-semibold text-sm p-1"
            data-placeholder='Título'
            onMouseDown={(e) => e.stopPropagation()}
            style={{ color: '#000000' }}
          >
            {title}
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
            title="Info"
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            style={{ color: '#000000' }}
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Limpiar Formato"
            onClick={handleRemoveFormat}
            style={{ color: '#000000' }}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0"
            title="Insertar fecha"
            onMouseDown={handleInsertDate}
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
              <DropdownMenuItem
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExportPdfDialogOpen(true);
                }}
                disabled={isExportingPdf}
              >
                <FileImage className="mr-2 h-4 w-4" />
                <span>{isExportingPdf ? 'Exportando PDF...' : 'Exportar páginas a PDF'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation();}}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Cambiar formato...</span>
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
            paddingTop: '0px', // Comenzar desde la línea horizontal
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

      {/* Controles de página */}
      {!isPreview && (
        <div className="p-2 border-t flex items-center justify-between" style={{ backgroundColor: '#FFF9C4', borderTop: '1px solid #ADD8E6' }}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Página Anterior"
            onClick={() => handlePageChange((typedContent.currentPage || 0) - 1)}
            disabled={(typedContent.currentPage || 0) === 0}
            style={{ color: '#000000' }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-xs" style={{ color: '#000000' }}>
            Página {(typedContent.currentPage || 0) + 1} de {typedContent.pages?.length || 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Página Siguiente"
            onClick={() => handlePageChange((typedContent.currentPage || 0) + 1)}
            disabled={(typedContent.currentPage || 0) === (typedContent.pages?.length || 1) - 1}
            style={{ color: '#000000' }}
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
            style={{ color: '#000000' }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}

      {/* Panel de información */}
      {isInfoOpen && (
        <div className='absolute inset-0 bg-white/95 z-20 p-4 text-xs overflow-y-auto' onClick={() => setIsInfoOpen(false)} style={{ backgroundColor: 'rgba(255, 255, 224, 0.95)' }}>
          <h3 className='font-bold mb-2 text-base' style={{ color: '#000000' }}>Comandos de Dictado por Voz</h3>
          <p style={{ color: '#000000' }}>WIP</p>
          <p className="text-center mt-4 text-gray-500">Haz clic en cualquier lugar para cerrar</p>
        </div>
      )}
    </div>
  );
}
