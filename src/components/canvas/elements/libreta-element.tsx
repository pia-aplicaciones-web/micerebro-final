'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps, LibretaContent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, FileText, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DeleteNotepadDialog from './delete-notepad-dialog';

// Type guard para LibretaContent
function isLibretaContent(content: unknown): content is LibretaContent {
  return typeof content === 'object' && content !== null && 'title' in content;
}

export default function LibretaElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview = false,
    parentId,
  } = props;

  // Si está dentro de un contenedor, no mostrar header para evitar doble header
  const hasParent = parentId && parentId !== id;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Parsear contenido
  const typedContent = (content || {}) as LibretaContent;
  const textContent = typedContent.text || '';
  const titleContent = typedContent.title || 'Libreta';

  // Auto-guardado para el contenido
  const { saveStatus, handleBlur: handleContentBlur } = useAutoSave({
    getContent: () => contentRef.current?.innerHTML || textContent,
    onSave: async (newContent) => {
      await onUpdate(id, { content: { ...typedContent, text: newContent } });
    },
    debounceMs: 500,
  });

  // Auto-guardado para el título
  const { handleBlur: handleTitleAutoSave } = useAutoSave({
    getContent: () => titleRef.current?.innerText || titleContent,
    onSave: async (newTitle) => {
      await onUpdate(id, { content: { ...typedContent, title: newTitle } });
    },
    debounceMs: 300,
  });

  // Función para copiar texto como .txt ordenado
  const handleCopyAsTxt = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      // Obtener el texto plano sin formato HTML
      const textContent = contentRef.current.innerText || contentRef.current.textContent || '';

      // Crear contenido ordenado con título
      const libretaTitle = typedContent.title || 'Libreta sin título';
      const orderedText = `${libretaTitle}\n${'='.repeat(libretaTitle.length)}\n\n${textContent.trim()}\n\n---\nExportado desde CanvasMind\n${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      await navigator.clipboard.writeText(orderedText);
      toast({ title: 'Texto copiado como .txt ordenado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar texto' });
    }
  }, [typedContent.title, toast]);

  // Función para cerrar la libreta (minimizar)
  const handleCloseLibreta = useCallback(() => {
    onUpdate(id, { properties: { ...properties, minimized: true } });
  }, [id, onUpdate, properties]);

  // Función para eliminar la libreta
  const handleDeleteConfirmed = useCallback(() => {
    setIsDeleteDialogOpen(false);
    if (deleteElement) {
      deleteElement(id);
    }
  }, [id, deleteElement]);

  // Función para manejar input del contenido
  const handleContentInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    // Actualizar inmediatamente para feedback visual
    onUpdate(id, { content: { ...typedContent, text: newContent } });
  }, [id, onUpdate, typedContent]);

  // Función para manejar focus del título
  const handleTitleFocus = useCallback((e: React.FocusEvent) => {
    e.stopPropagation();
  }, []);

  // Función para manejar blur del título
  const handleTitleBlur = useCallback((e: React.FocusEvent) => {
    handleTitleAutoSave();
  }, [handleTitleAutoSave]);

  // Restaurar contenido al montar
  useEffect(() => {
    if (contentRef.current && textContent) {
      contentRef.current.innerHTML = textContent;
    }
    if (titleRef.current && titleContent) {
      titleRef.current.innerText = titleContent;
    }
  }, [textContent, titleContent]);

  // Sincronizar título
  useEffect(() => {
    if (titleRef.current && titleRef.current.innerText !== titleContent) {
      titleRef.current.innerText = titleContent;
    }
  }, [titleContent]);

  return (
    <>
      <Card className={cn(
        "w-full h-full flex flex-col overflow-hidden rounded-lg shadow-lg border border-gray-200/50",
        hasParent ? "bg-transparent border-none shadow-none" : "bg-white"
      )}>
        {/* HEADER - Solo mostrar si NO está dentro de un contenedor */}
        {!hasParent && (
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-row items-center justify-between">
          {/* Título editable */}
          <div
            ref={titleRef}
            contentEditable={!isPreview}
            onInput={(e) => {
              const newTitle = e.currentTarget.innerText;
              onUpdate(id, { content: { ...typedContent, title: newTitle } });
            }}
            onFocus={handleTitleFocus}
            onBlur={handleTitleBlur}
            className="bg-transparent flex-grow outline-none cursor-text font-headline text-sm font-semibold p-1"
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '12px'
            }}
            data-placeholder='Título'
            onMouseDown={(e) => e.stopPropagation()}
          />

          {/* Botones del header */}
          {!isPreview && (
            <div onMouseDown={(e) => e.stopPropagation()} className="flex items-center gap-1">
              {/* Botón copiar como .txt */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-gray-200"
                title="Copiar texto como .txt ordenado"
                onClick={handleCopyAsTxt}
              >
                <FileText className="h-4 w-4 text-gray-700" />
              </Button>

              {/* Botón cerrar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-gray-200"
                title="Cerrar libreta"
                onClick={handleCloseLibreta}
              >
                <X className="h-4 w-4 text-gray-700" />
              </Button>

              {/* Botón eliminar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600 hover:bg-red-50"
                title="Eliminar libreta"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 p-0 relative">
          <div
            ref={contentRef}
            contentEditable={!isPreview}
            onInput={handleContentInput}
            onBlur={handleContentBlur}
            onMouseDown={(e) => {
              // CRÍTICO: Prevenir que el drag se active cuando se está seleccionando texto
              if (e.target === e.currentTarget || (e.target as HTMLElement).isContentEditable) {
                e.stopPropagation();
              }
            }}
            className={cn(
              'relative w-full h-full overflow-y-auto p-4',
              'text-black',
              'whitespace-pre-wrap',
              'break-words',
              'select-text'
            )}
            style={{
              color: '#000000',
              minHeight: '567px', // Altura de 15cm para scroll infinito
              userSelect: 'text',
              WebkitUserSelect: 'text',
              backgroundColor: '#FEFEF2', // Fondo blanco marfil
              backgroundImage: `
                linear-gradient(#E5E5E5 1px, transparent 1px),
                linear-gradient(90deg, #E5E5E5 1px, transparent 1px)
              `, // Cuadriculado gris claro
              backgroundSize: '20px 20px', // Cuadriculado de 20px
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', // Tipografía monospace 12px
              fontSize: '12px',
              lineHeight: '1.2', // Interlineado sencillo
              whiteSpace: 'pre-wrap',
              border: 'none',
              outline: 'none',
            }}
          />

          {/* Indicador de guardado */}
          {isSelected && (
            <div className="absolute top-2 right-2 z-20">
              <SaveStatusIndicator status={saveStatus} size="sm" />
            </div>
          )}
        </div>
      </Card>

      {/* Diálogo de eliminación */}
      <DeleteNotepadDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}