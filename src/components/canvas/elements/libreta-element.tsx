'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps, LibretaContent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, FileText, Trash2, Maximize, Check, Calendar, ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
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
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Safe properties parsing
  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};

  // Parsear contenido
  const typedContent = (content || {}) as LibretaContent;
  const textContent = typedContent.text || '';
  const titleContent = typedContent.title || 'Libreta';

  // Auto-guardado para el contenido
  const { saveStatus, handleBlur: handleContentBlur, forceSave } = useAutoSave({
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

  // Función de guardado manual (para compatibilidad con código existente)
  const saveContent = useCallback(async () => {
    await forceSave();
  }, [forceSave]);

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
    }
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    if (isPreview) return;
    saveContent();
    onUpdate(id, { content: { ...typedContent, currentPage: newPage } });
  }, [isPreview, saveContent, onUpdate, id, typedContent]);

  const handleAddPage = useCallback(() => {
    if (isPreview) return;
    if ((typedContent.pages?.length || 0) < 20) {
      saveContent();
      const newPages = [...(typedContent.pages || []), '<div><br></div>'];
      onUpdate(id, {
        content: { ...typedContent, pages: newPages, currentPage: newPages.length - 1 },
      });
    }
  }, [isPreview, typedContent, onUpdate, id, saveContent]);

  const handleRestoreOriginalSize = useCallback(() => {
    if (isPreview) return;

    // Restaurar tamaño original de la libreta (10x15 cm)
    const originalSize = { width: 378, height: 567 };

    onUpdate(id, {
      properties: {
        ...properties,
        size: originalSize,
      },
    });
  }, [isPreview, properties, onUpdate, id]);

  const handleForceSaveContent = useCallback(async () => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML;
      await onUpdate(id, { content: { ...typedContent, text: newContent } });
      toast({ title: 'Contenido guardado exitosamente.' });
    }
  }, [id, onUpdate, typedContent, toast]);

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

  // Guardar tamaño original al montar y inicializar contenido/título
  useEffect(() => {
    if (properties?.size && !originalSizeRef.current) {
      originalSizeRef.current = {
        width: properties.size.width || 600, 
        height: properties.size.height || 400,
      };
    }
    // Inicializar contenido editable y título una sola vez si están vacíos
    // Esto se mantiene para asegurar que el contenido inicial se carga si el DOM está vacío
    if (contentRef.current && typedContent.text && contentRef.current.innerHTML === '') {
      contentRef.current.innerHTML = typedContent.text;
    }
    if (titleRef.current && typedContent.title && titleRef.current.innerText === '') {
      titleRef.current.innerText = typedContent.title;
    }
  }, [properties.size, typedContent.text, typedContent.title]);

  // Función para manejar clic en la libreta (mantener al frente)
  const handleLibretaClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      return; // No hacer nada si se hace click en el drag handle
    }
    // Regla: libretas empiezan en zIndex -1 y suben temporalmente al frente (0)
    const originalZIndex = typeof safeProperties?.zIndex === 'number' ? safeProperties.zIndex : -1;
    const editingZIndex = 0;
    onUpdate(id, { properties: { ...safeProperties, zIndex: editingZIndex }, zIndex: editingZIndex });
    setTimeout(() => {
      if (!isSelected) { // Solo volver si no está seleccionado
        onUpdate(id, { properties: { ...safeProperties, zIndex: originalZIndex }, zIndex: originalZIndex });
      }
    }, 2000);
  }, [id, safeProperties, onUpdate, isSelected]);

  return (
    <>
      <Card className={cn(
        "w-full flex flex-col overflow-hidden rounded-lg shadow-lg border border-gray-200/50",
        hasParent ? "bg-transparent border-none shadow-none" : "bg-white",
        "h-full"
      )} onClick={handleLibretaClick}>
        {/* HEADER - Solo mostrar si NO está dentro de un contenedor */}
        {!hasParent && (
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-row items-center justify-between drag-handle">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" /> {/* Aquí a la izquierda */}
            {/* Título editable */}
            <div
              ref={titleRef}
              contentEditable={!isPreview}
              onInput={(e) => {
                // El auto-guardado se encarga de guardar los cambios
              }}
              onFocus={handleTitleFocus}
              onBlur={handleTitleAutoSave}
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
              <div onMouseDown={(e) => e.stopPropagation()} className="flex items-center gap-1"> {/* Los botones aquí */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-200"
                  title="Guardar dictado/texto"
                  onClick={handleForceSaveContent}
                >
                  <Check className="h-4 w-4 text-gray-700" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-200"
                  title="Restaurar tamaño original"
                  onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize();}}
                >
                  <Maximize className="h-4 w-4 text-gray-700" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-200"
                  title="Copiar texto como .txt ordenado"
                  onClick={handleCopyAsTxt}
                >
                  <FileText className="h-4 w-4 text-gray-700" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-200"
                  title="Insertar fecha completa"
                  onClick={handleInsertDate}
                >
                  <Calendar className="h-4 w-4 text-gray-700" />
                </Button>

                {/* Botón cerrar */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-200 ml-1"
                  title="Cerrar libreta"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(id, { hidden: true });
                  }}
                >
                  <X className="h-4 w-4 text-gray-700" />
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

      {/* Diálogo de eliminación */}
      <DeleteNotepadDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirmed}
      />

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
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </>
  );
}