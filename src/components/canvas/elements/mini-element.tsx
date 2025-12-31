'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps, MiniContent } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, FileImage, MoreVertical, Square, CalendarDays, Copy, X, Lock } from 'lucide-react';
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
import { MiniPasswordDialog } from '@/components/MiniPasswordDialog';

export default function MiniElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview,
    width = 302, // 8cm
    height = 362, // 12cm
  } = props;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUnlockedForEditing, setIsUnlockedForEditing] = useState(false);

  // Parsear contenido
  const typedContent = (content || {}) as MiniContent;
  const textContent = typedContent.text || '';

  // Refs para mantener referencias estables y evitar loops
  const typedContentRef = useRef(typedContent);
  const textContentRef = useRef(textContent);

  // Sincronizar refs cuando cambian
  useEffect(() => {
    typedContentRef.current = typedContent;
    textContentRef.current = textContent;
  }, [typedContent, textContent]);


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
            text: newText
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
      // Restaurar contenido si no está enfocado y el texto de la prop ha cambiado
      if (!isFocused && contentRef.current.innerText !== textContent) {
        contentRef.current.innerText = textContent || '';
      }
    }
  }, [textContent]);

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



  // Handle delete
  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    deleteElement(id);
  }, [deleteElement, id]);

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

  // Función para copiar texto como .txt (solo el contenido)
  const handleCopyAsTxt = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      // Obtener solo el texto plano sin formato HTML
      const textContent = contentRef.current.innerText || contentRef.current.textContent || '';

      await navigator.clipboard.writeText(textContent.trim());
      toast({ title: 'Texto copiado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar texto' });
    }
  }, [toast]);

  // Función para manejar cambios de contraseña
  const handlePasswordChange = useCallback(async (password: string | null) => {
    const newContent: MiniContent = {
      ...typedContent,
      password: password || undefined,
      isLocked: false // Al cambiar contraseña, desbloqueamos automáticamente
    };

    await onUpdate(id, {
      content: newContent
    });
  }, [typedContent, onUpdate, id]);

  // Función para manejar doble clic en elemento bloqueado
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typedContent.password && !isUnlockedForEditing) {
      setIsPasswordDialogOpen(true);
    }
  }, [typedContent.password, isUnlockedForEditing]);

  // Función para manejar el desbloqueo desde el diálogo
  const handleUnlockForEditing = useCallback(() => {
    setIsUnlockedForEditing(true);
    // El diálogo se cierra automáticamente en MiniPasswordDialog
  }, []);

  return (
    <div
      data-element-id={id}
      className={cn(
        'relative w-full h-full flex flex-col overflow-hidden rounded-lg shadow-md border-none'
      )}
      style={{
        backgroundColor: '#ADD8E6', // Fondo aqua
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: width, // Usar tamaño real
        height: height, // Usar tamaño real
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
          backgroundColor: '#F3F4F6', // Gris claro
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
              contentEditable={!isPreview && (!typedContent.password || isUnlockedForEditing)}
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
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); setIsPasswordDialogOpen(true)}}>
                <Lock className="mr-2 h-4 w-4" />
                <span>{typedContent.password ? 'Cambiar contraseña' : 'Configurar contraseña'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0"
            title="Insertar fecha"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsertDate(); }}
            style={{ color: '#000000' }}
          >
            <CalendarDays className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-black/10 p-0"
            title="Copiar texto"
            onClick={handleCopyAsTxt}
            style={{ color: '#000000' }}
          >
            <Copy className="h-3 w-3" />
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

          {/* Botón cerrar con X grande */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/10 p-0 ml-1"
            title="Cerrar mini"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { hidden: true });
            }}
            style={{ color: '#000000' }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
          ref={contentRef}
          contentEditable={!isPreview && (!typedContent.password || isUnlockedForEditing)}
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
            // backgroundImage: 'linear-gradient(#4B5563 1px, transparent 1px)', // Líneas horizontales gris oscuro - DESACTIVADO
            // backgroundSize: '100% 20px', // Interlineado fijo de 20px - DESACTIVADO
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', // Tipografía monospace 12px
            fontSize: '12px',
            lineHeight: '1.5', // Interlineado 1.5
            whiteSpace: 'pre-wrap',
            overflowX: 'auto', // Scroll horizontal infinito
            paddingTop: '2px', // Ajustar texto más cerca de las líneas
          }}
        />

      {/* Overlay de bloqueo */}
      {typedContent.password && !isUnlockedForEditing && (
        <div
          className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 cursor-pointer"
          onDoubleClick={handleDoubleClick}
          title="Doble clic para desbloquear"
        >
          <div className="bg-white/90 p-3 rounded-lg shadow-lg text-center">
            <Lock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Protegido con contraseña</p>
            <p className="text-xs text-gray-500 mt-1">Doble clic para desbloquear</p>
          </div>
        </div>
      )}

      {/* Indicador de guardado */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-20">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      )}

      {/* Diálogo de contraseña */}
      {isPasswordDialogOpen && (
        <MiniPasswordDialog
          elementTitle="Mini"
          currentPassword={typedContent.password}
          isLocked={typedContent.password && !isUnlockedForEditing}
          onPasswordChange={handlePasswordChange}
          onUnlock={handleUnlockForEditing}
          onClose={() => setIsPasswordDialogOpen(false)}
        />
      )}
    </div>
  );
}