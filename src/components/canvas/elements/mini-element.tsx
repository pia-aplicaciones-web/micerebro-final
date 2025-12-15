'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Search, Trash2, FileImage, MoreVertical, Square, Minus, X } from 'lucide-react';
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

export default function MiniElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview,
    width = 567, // 15cm
    height = 567, // 15cm
  } = props;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isMinimized, setIsMinimized] = useState((properties as any)?.minimized || false);

  // Parsear contenido
  const typedContent = (content || {}) as { text?: string; searchQuery?: string };
  const textContent = typedContent.text || '';
  const initialSearchQuery = typedContent.searchQuery || '';

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
      if (!isMinimized && !isFocused && contentRef.current.innerText !== textContent) {
        contentRef.current.innerText = textContent || '';
      } else if (isMinimized && contentRef.current.innerText !== '') {
        // Cuando se minimiza, el contenido del div puede ser vaciado temporalmente
        // contentRef.current.innerText = '';
      }
    }
  }, [textContent, isMinimized]);

  // Exportar a PNG
  const handleExportToPng = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const miniCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!miniCard) {
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
        description: 'Generando imagen PNG.',
      });

      const canvas = await html2canvas(miniCard, {
        backgroundColor: '#FEF3C7', // Amarillo muy claro
        scale: 2.0,
        useCORS: true,
        logging: false,
        allowTaint: false,
        windowWidth: miniCard.scrollWidth,
        windowHeight: miniCard.scrollHeight,
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
        link.download = `mini_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportado',
          description: 'El mini se ha exportado como PNG.',
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
        backgroundColor: '#FEF3C7', // Amarillo muy claro
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: width, // Usar tamaño real
        height: isMinimized ? 48 : height, // Usar tamaño real
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
        className="flex items-center justify-between px-3 py-2 drag-handle"
        style={{
          backgroundColor: '#FEF3C7', // Amarillo muy claro
          color: '#000000',
        }}
      >
        {/* Left: Menu icon and title */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0"
            style={{ color: '#000000' }}
          >
            <Square className="h-3 w-3" />
          </Button>
          <div className="flex flex-col">
            <div
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={(e) => {
                const newTitle = e.currentTarget.textContent || 'Mini';
                // Aquí puedes agregar lógica para guardar el título si es necesario
              }}
              onFocus={() => onUpdate(id, { isSelected: true })}
              className="bg-transparent flex-grow outline-none cursor-text font-headline text-sm font-semibold p-1"
              style={{ color: '#000000' }}
              data-placeholder='Título'
            >
              Mini
            </div>
          </div>
        </div>

        {/* Center: Search bar */}
        <div className="flex items-center gap-1 flex-1 max-w-xs mx-2">
          <Search className="h-3 w-3" style={{ color: '#000000' }} />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-6 text-xs bg-transparent border-none text-black placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{
              color: '#000000',
            }}
            onFocus={() => onUpdate(id, { isSelected: true })}
          />
        </div>

        {/* Right: Action icons */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-black/10 p-0"
                style={{ color: '#000000' }}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleExportToPng(e)}} disabled={isExportingPng}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>{isExportingPng ? 'Exportando...' : 'Exportar a PNG'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0"
            title={isMinimized ? "Maximizar" : "Minimizar"}
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); toggleMinimize();}}
            style={{ color: '#000000' }}
          >
            {isMinimized ? <Square className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0 text-red-600 hover:bg-red-50"
            title="Eliminar mini"
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleDelete();}}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0 text-gray-600 hover:bg-gray-200"
            title="Cerrar mini"
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); setIsMinimized(true);}}
          >
            <X className="h-3 w-3" />
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
            'relative flex-1 overflow-hidden p-3',
            'text-black',
            'whitespace-pre-wrap',
            'break-words',
            'select-text'
          )}
          style={{
            color: '#000000',
            minHeight: '200px', // Altura mínima razonable
            userSelect: 'text',
            WebkitUserSelect: 'text',
            backgroundColor: '#80DEEA', // Fondo Aqua
            backgroundImage: 'linear-gradient(#ADD8E6 1px, transparent 1px)', // Líneas horizontales azules sutiles
            backgroundSize: '100% 20px', // Interlineado fijo de 20px
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', // Tipografía monospace 12px
            fontSize: '12px',
            lineHeight: '1.5', // Interlineado 1.5
            whiteSpace: 'pre-wrap',
          }}
        />
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