'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { CommonElementProps, NotepadContent, CanvasElementProperties } from '@/lib/types';
import {
  MoreVertical, X, Minus, Maximize, GripVertical,
  FileImage, Settings,
  Info, Eraser, CalendarDays, FileSignature, Calendar,
  ArrowLeft, ArrowRight, Plus, Maximize2, Trash2, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DeleteNotepadDialog from './delete-notepad-dialog';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ExportPdfDialog from './export-pdf-dialog';
import { MiniPasswordDialog } from '@/components/MiniPasswordDialog';
import './notepad-element.css';


export default function NotepadElement(props: CommonElementProps) {
  const { 
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isPreview = false, 
    onFormatToggle, 
    isSelected,
    minimized,
    onChangeNotepadFormat,
    onEditElement,
  } = props;
  const prevZRef = useRef<number | null>(null);

  // Regla: al seleccionar, traer al frente temporalmente; al deseleccionar, volver a su z-index original
  useEffect(() => {
    const currentZ = (properties as any)?.zIndex ?? -1;
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
  }, [isSelected, id, onUpdate, properties]);
  
  const typedContent = (content || {}) as NotepadContent;
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Obtener el contenido de la página actual
  const currentPageIndex = typedContent.currentPage || 0;
  const currentPageContent = typedContent.pages?.[currentPageIndex] || '';


  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportPdfDialogOpen, setIsExportPdfDialogOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUnlockedForEditing, setIsUnlockedForEditing] = useState(false);
  
  // Hook de autoguardado robusto para el contenido del cuaderno
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange, forceSave } = useAutoSave({
    getContent: () => {
      if (isPreview || !contentRef.current) return '';
      const html = contentRef.current.innerHTML;
      // Normalizar HTML para comparación consistente
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newHtml) => {
      if (isPreview || !contentRef.current) return;
      const currentContent = currentPageContent || '';
      // Comparar contenido normalizado
      const normalizedNew = newHtml.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedCurrent = currentContent.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      if (normalizedNew !== normalizedCurrent) {
        // Actualizar la página actual en el array de páginas
        const updatedPages = [...(typedContent.pages || [])];
        updatedPages[currentPageIndex] = newHtml;
        await onUpdate(id, { content: { ...typedContent, pages: updatedPages } });
      }
    },
    debounceMs: 2000,
    disabled: isPreview,
    compareContent: (oldContent, newContent) => {
      // Normalizar ambos para comparación
      const normalizedOld = (oldContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedNew = (newContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      return normalizedOld === normalizedNew && normalizedOld === currentPageContent;
    },
  });

  // Función de guardado manual (para compatibilidad con código existente)
  const saveContent = useCallback(async () => {
    await forceSave();
  }, [forceSave]);

  // Función para manejar cambios de contraseña
  const handlePasswordChange = useCallback(async (password: string | null) => {
    const newContent: NotepadContent = {
      ...typedContent,
      password: password || undefined,
      isLocked: false // Al cambiar contraseña, desbloqueamos automáticamente
    };

    await onUpdate(id, {
      content: newContent
    });
  }, [typedContent, onUpdate, id]);

  // Función para manejar doble clic en elemento bloqueado
  const handleNotepadDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typedContent.password && !isUnlockedForEditing) {
      setIsPasswordDialogOpen(true);
    }
  }, [typedContent.password, isUnlockedForEditing]);

  // Función para manejar el desbloqueo desde el diálogo
  const handleUnlockForEditing = useCallback(() => {
    setIsUnlockedForEditing(true);
  }, []);

  // Función para copiar texto como .txt ordenado
  const handleCopyAsTxt = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      // Obtener el texto plano sin formato HTML
      const textContent = contentRef.current.innerText || contentRef.current.textContent || '';

      // Crear contenido ordenado con título
      const notepadTitle = typedContent.title || 'Cuaderno sin título';
      const orderedText = `${notepadTitle}\n${'='.repeat(notepadTitle.length)}\n\n${textContent.trim()}\n\n---\nExportado desde CanvasMind\n${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      await navigator.clipboard.writeText(orderedText);
      toast({ title: 'Texto copiado como .txt ordenado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar texto' });
    }
  }, [typedContent.title, toast]);

  useEffect(() => {
    if (contentRef.current) {
        const isFocused = document.activeElement === contentRef.current;
        if (!isFocused) {
            const content = currentPageContent || '';
            // Limpiar contenido vacío o con solo <div><br></div>
            const cleanContent = content === '<div><br></div>' || content === '<div></div>' || content.trim() === '' ? '' : content;
            // CRÍTICO: Solo actualizar si NO está enfocado (preservar cursor)
            if (!isFocused && contentRef.current.innerHTML !== cleanContent) {
                contentRef.current.innerHTML = cleanContent;
            }
        }
    }
  }, [currentPageContent]);

  
  const handleTitleFocus = useCallback(() => {
    if (isPreview) return;
    onEditElement(id);
  }, [isPreview, onEditElement, id]);

  // Hook de autoguardado para el título
  const { handleBlur: handleTitleBlurAutoSave } = useAutoSave({
    getContent: () => titleRef.current?.innerText || '',
    onSave: async (newTitle) => {
      if (isPreview || !titleRef.current) return;
      if (typedContent.title !== newTitle) {
        const newContent: NotepadContent = { ...typedContent, title: newTitle };
        onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 1000, // Título se guarda más rápido
    disabled: isPreview,
  });

  const handleTitleBlur = useCallback(async () => {
    if (isPreview || !titleRef.current) return;
    await handleTitleBlurAutoSave();
  }, [isPreview, handleTitleBlurAutoSave]);
  
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    if (pastedText) {
        document.execCommand('insertText', false, pastedText);
    }
  }, []);
  

  const handlePageChange = useCallback((newPage: number) => {
    if (isPreview) return;
    if (newPage >= 0 && newPage < (typedContent.pages?.length || 0)) {
      saveContent();
      onUpdate(id, {
        content: { ...typedContent, currentPage: newPage }
      });
    }
  }, [isPreview, typedContent, onUpdate, id, saveContent]);

  const handleAddPage = useCallback(() => {
    if (isPreview) return;
    if ((typedContent.pages?.length || 0) < 20) {
      saveContent();
      const newPages = [...(typedContent.pages || []), '']; // Página vacía sin <div><br></div>
      onUpdate(id, {
        content: { ...typedContent, pages: newPages, currentPage: newPages.length - 1 },
      });
    }
  }, [isPreview, typedContent, onUpdate, id, saveContent]);

  const handleRestoreOriginalSize = useCallback(() => {
    if (isPreview) return;

    // Calcular tamaño original basado en el formato
    const notepadFormat = (properties as any)?.format || 'letter';
    let originalSize;

    if (notepadFormat === '10x15') {
      originalSize = { width: 378, height: 567 }; // 10cm x 15cm
    } else if (notepadFormat === '20x15') {
      originalSize = { width: 756, height: 567 }; // 20cm x 15cm
    } else {
      originalSize = { width: 794, height: 978 }; // letter (8.5" x 11")
    }

    // Restaurar tamaño original
    onUpdate(id, {
      properties: {
        ...properties,
        size: originalSize,
      },
    });
  }, [isPreview, properties, onUpdate, id]);

  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;
    
      const isMinimized = !!minimized;
      const currentSize = (properties as CanvasElementProperties)?.size || { width: 794, height: 1021 };
      
      // Convertir currentSize a valores numéricos para originalSize
      const currentSizeNumeric = {
        width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 794,
        height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 1021,
      };

      if (isMinimized) {
          // Restaurar: recuperar tamaño original y asegurar que el contenido se mantiene
          const { originalSize, ...restProps } = (properties || {}) as Partial<CanvasElementProperties>;
          const restoredSize = originalSize || { width: 794, height: 1021 };
          const newProperties: Partial<CanvasElementProperties> = { 
            ...restProps, 
            size: restoredSize 
          };
          
        // DEBUG: Log para verificar el título antes de restaurar
        console.log('RESTAURANDO - Título actual en typedContent:', typedContent.title);
        console.log('RESTAURANDO - Título en titleRef:', titleRef.current?.innerText);

        // FIX: Preservar el contenido al restaurar (incluyendo el título)
          onUpdate(id, {
              minimized: false,
              properties: newProperties,
            content: typedContent, // PASAR EL CONTENT PARA ASEGURAR QUE EL TÍTULO SE PRESERVE
        });

        // FIX CRÍTICO: Forzar sincronización del título inmediatamente después de restaurar
        setTimeout(() => {
          if (titleRef.current && typedContent.title) {
            titleRef.current.innerText = typedContent.title;
            console.log('RESTAURANDO - Título forzado:', typedContent.title);
          }
        }, 10);
      } else {
        // FIX: Guardar contenido Y título ANTES de minimizar
        saveContent();
        const titleText = titleRef.current?.innerText || '';
        const updatedContent = { ...typedContent, title: titleText };

          // Minimizar: guardar tamaño actual y reducir altura
          const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 794;
          onUpdate(id, {
              minimized: true,
              properties: { 
                ...properties, 
                size: { width: currentWidth, height: 48 }, 
                originalSize: currentSizeNumeric 
              },
            content: updatedContent, // Guardar el contenido actualizado con el título
          });
      }
  }, [isPreview, minimized, properties, onUpdate, id, saveContent]);
  
  const handleCloseNotepad = useCallback((e: React.MouseEvent) => { 
    e.stopPropagation(); 
    e.preventDefault();
    if (isPreview) return; 
    saveContent();
    onUpdate(id, { hidden: true }); 
  }, [isPreview, saveContent, onUpdate, id]);

  const handleExportNotepadToPng = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    try {
      // Buscar el elemento Card del notepad
      const notepadCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!notepadCard) {
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
        description: 'Generando imagen PNG de alta resolución del cuaderno.',
      });

      // Capturar el elemento usando html2canvas con alta resolución
      const canvas = await html2canvas(notepadCard, {
        backgroundColor: '#ffffff',
        scale: 3, // Alta resolución (3x)
        useCORS: true,
        logging: false,
        allowTaint: false,
        windowWidth: notepadCard.scrollWidth,
        windowHeight: notepadCard.scrollHeight,
      });

      // Convertir canvas a blob y descargar
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

        // Crear URL temporal y descargar
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const notepadTitle = typedContent.title || 'cuaderno';
        link.download = `${notepadTitle}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Mostrar toast de éxito
        toast({
          title: 'Exportado',
          description: 'El cuaderno se ha exportado como PNG de alta resolución.',
        });
        setIsExportingPng(false);
      }, 'image/png', 1.0); // Calidad máxima
    } catch (error: any) {
      console.error('Error al exportar cuaderno:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo exportar el cuaderno.',
      });
      setIsExportingPng(false);
    }
  }, [toast, id, isPreview, typedContent.title]);

  const handleExportNotepadToPdf = useCallback(async (selectedPages: number[]) => {
    if (isPreview) return;

    try {
      setIsExportingPdf(true);
      toast({
        title: 'Exportando...',
        description: `Generando PDF con ${selectedPages.length} página${selectedPages.length > 1 ? 's' : ''}.`,
      });

      // Buscar el elemento Card del notepad
      const notepadCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!notepadCard) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo encontrar el elemento para exportar.',
        });
        setIsExportingPdf(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1021], // Tamaño carta en píxeles
      });

      // Guardar la página actual
      const savedCurrentPage = typedContent.currentPage || 0;

      // Exportar cada página seleccionada
      for (let i = 0; i < selectedPages.length; i++) {
        const pageIndex = selectedPages[i];
        
        // Cambiar a la página que queremos exportar
        if (onUpdate && pageIndex !== savedCurrentPage) {
          onUpdate(id, { content: { ...typedContent, currentPage: pageIndex } });
          // Esperar un momento para que se renderice
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Capturar la página actual
        const canvas = await html2canvas(notepadCard, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: false,
          windowWidth: notepadCard.scrollWidth,
          windowHeight: notepadCard.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');

        // Agregar página al PDF (excepto la primera)
        if (i > 0) {
          pdf.addPage();
        }

        // Calcular dimensiones manteniendo aspecto
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      }

      // Restaurar la página original
      if (onUpdate && savedCurrentPage !== typedContent.currentPage) {
        onUpdate(id, { content: { ...typedContent, currentPage: savedCurrentPage } });
      }

      // Descargar PDF
      const notepadTitle = typedContent.title || 'cuaderno';
      pdf.save(`${notepadTitle}_${Date.now()}.pdf`);

      toast({
        title: 'Exportado',
        description: `PDF exportado con ${selectedPages.length} página${selectedPages.length > 1 ? 's' : ''}.`,
      });
      setIsExportingPdf(false);
    } catch (error: any) {
      console.error('Error al exportar cuaderno a PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo exportar el cuaderno a PDF.',
      });
      setIsExportingPdf(false);
    }
  }, [toast, id, isPreview, typedContent, onUpdate]);

  useEffect(() => {
    const titleEl = titleRef.current;
    if (titleEl && titleEl.innerText !== (typedContent.title || '')) {
      titleEl.innerText = typedContent.title || '';
    }
  }, [typedContent.title]);

  // FIX CRÍTICO: Sincronizar título cuando cambia el estado minimized
  useEffect(() => {
    if (!minimized && titleRef.current && typedContent.title) {
      const titleEl = titleRef.current;
      if (titleEl.innerText !== typedContent.title) {
        titleEl.innerText = typedContent.title;
      }
    }
  }, [minimized, typedContent.title]);

  const execCommand = useCallback((e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (contentRef.current) {
      contentRef.current.focus();
      document.execCommand(command, false, value ?? undefined);
    }
  }, []);

  const handleRemoveFormat = useCallback((e: React.MouseEvent) => execCommand(e, 'removeFormat'), [execCommand]);
  const handleInsertShortDate = useCallback((e: React.MouseEvent) => execCommand(e, 'insertHTML', `<span style="color: #a0a1a6;">-- ${format(new Date(), 'dd/MM/yy')} </span>`), [execCommand]);
  
  const handleSelectAllText = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (contentRef.current) {
      contentRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, []);

  const handleDelete = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirmed = useCallback(() => {
    deleteElement(id);
    setIsDeleteDialogOpen(false);
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

  const safeProperties = (typeof properties === 'object' && properties !== null) ? properties : {};
  const formatType = (safeProperties as CanvasElementProperties)?.format || 'letter';
  
  // Color de fondo: #f8f0ad para elementos específicos, blanco para otros
  const isSpecialNotepad = id === 'oyDN2LIr8z7VyYA5727F' || id === 'FdQ656GJ94TePuHpotbY' || id === 'Iz0UWQ5gQwXlkX1kGBf1' || id === 'kRfKpBDg946Y99668Tih';
  const notepadBackgroundColor = isSpecialNotepad ? '#f8f0ad' : '#ffffff';

  // =====================================================
  // CRÍTICO: Todos los hooks DEBEN estar ANTES de cualquier return condicional
  // Esto incluye useCallback, useMemo, useEffect, etc.
  // Error #300 de React ocurre si los hooks están después de un return
  // =====================================================
  
  // REGLA ESPECIAL: Cuadernos - Al hacer click suben a primera capa para editar, luego vuelven atrás
  const handleNotepadClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      return; // No hacer nada si se hace click en el drag handle
    }
    // Regla: cuadernos empiezan en zIndex -1 y suben temporalmente al frente (0)
    const originalZIndex = typeof safeProperties?.zIndex === 'number' ? safeProperties.zIndex : -1;
    const editingZIndex = 0;
    onUpdate(id, { properties: { ...safeProperties, zIndex: editingZIndex }, zIndex: editingZIndex });
    setTimeout(() => {
      if (!isSelected) { // Solo volver si no está seleccionado
        onUpdate(id, { properties: { ...safeProperties, zIndex: originalZIndex }, zIndex: originalZIndex });
      }
    }, 2000);
  }, [id, safeProperties, onUpdate, isSelected]);

  // =====================================================
  // AHORA sí podemos hacer el return condicional para minimizado
  // =====================================================
  if (minimized) {
      return (
          <Card className="notepad-card w-full h-full flex items-center shadow-lg rounded-lg bg-card border-2 border-primary/50 group" data-element-id={id}>
               <div className="p-2 flex flex-row items-center gap-1 w-full cursor-grab active:cursor-grabbing drag-handle">
                  <div className="p-1"><GripVertical className="size-5 text-muted-foreground" /></div>
                  <p className="font-headline text-sm font-semibold truncate flex-grow">{typedContent.title || 'Sin título'}</p>
                  <Button variant="ghost" size="icon" className="size-7" title="Maximizar" onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); toggleMinimize(e)}}>
                      <Maximize className="size-4" />
                  </Button>
              </div>
          </Card>
      )
  }

  return (
    <Card
      data-element-id={id}
      className="notepad-card w-full h-full flex flex-col shadow-lg rounded-lg group"
      style={{ backgroundColor: notepadBackgroundColor }}
      onClick={handleNotepadClick}
    >
        <div className="p-2 border-b flex flex-row items-center gap-1">
            <div className="p-1 drag-handle cursor-grab active:cursor-grabbing"><GripVertical className="size-5 text-muted-foreground" /></div>
            <div
                ref={titleRef}
                contentEditable={!isPreview && (!typedContent.password || isUnlockedForEditing)}
                spellCheck="true"
                suppressContentEditableWarning
                onFocus={handleTitleFocus}
                onBlur={handleTitleBlur}
                className="bg-transparent flex-grow outline-none cursor-text font-headline text-sm font-semibold p-1"
                data-placeholder='Título'
                onMouseDown={(e) => e.stopPropagation()}
            />
            {!isPreview && (!typedContent.password || isUnlockedForEditing) && (
                <div onMouseDown={(e) => e.stopPropagation()} className="flex items-center">
                    <Button variant="ghost" size="icon" className="size-7" title="Info" onClick={() => setIsInfoOpen(!isInfoOpen)}><Info className="size-4"/></Button>
                    <Button variant="ghost" size="icon" className="size-7" title="Limpiar Formato" onClick={handleRemoveFormat}><Eraser className="size-4"/></Button>
                    <Button variant="ghost" size="icon" className="size-7" title="Insertar Fecha Corta" onClick={handleInsertShortDate}><CalendarDays className="size-4"/></Button>
                    <Button variant="ghost" size="icon" className="size-7" title="Insertar Fecha Completa" onClick={handleInsertDate}><Calendar className="size-4"/></Button>
                    <Button variant="ghost" size="icon" className="size-7" title="Restaurar tamaño original" onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize();}}><Maximize2 className="size-4"/></Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7" title="Más opciones"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                          <DropdownMenuItem onClick={handleCopyAsTxt}>
                              <FileSignature className="mr-2 h-4 w-4" />
                              <span>Copiar texto como .txt ordenado</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleExportNotepadToPng(e)}} disabled={isExportingPng}>
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
                          {onChangeNotepadFormat && (
                            <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); onChangeNotepadFormat(id)}}>
                                <Settings className="mr-2 h-4 w-4" /><span>Cambiar formato...</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); setIsPasswordDialogOpen(true)}}>
                            <Lock className="mr-2 h-4 w-4" />
                            <span>{typedContent.password ? 'Cambiar contraseña' : 'Configurar contraseña'}</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-red-600 hover:bg-red-50"
                      title="Eliminar cuaderno"
                      onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleDelete();}}
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    <Button variant="ghost" size="icon" className="size-7" title="Cerrar" onMouseDown={handleCloseNotepad}><X className="size-4" /></Button>
                </div>
            )}
        </div>
        {!minimized && (
            <>
                <CardContent
                  className={cn(
                    "p-0 flex-grow relative font-body",
                    id === 'kRfKpBDg946Y99668Tih' ? "" : "" // Sin scroll - paginación automática
                  )}
                  style={{
                    backgroundColor: id === 'rzBhqCTd8wwZmD8JCNEk' ? '#fafad7' : notepadBackgroundColor,
                    height: formatType === '10x15' ? '400px' : formatType === '20x15' ? '567px' : '600px', // Altura fija para páginas según formato
                    overflow: 'hidden' // Quitar scroll
                  }} // Color de fondo especial para rzBhqCTd8wwZmD8JCNEk
                >
                    {/* Sistema de líneas y margen rojo del super cuaderno */}
                    <div className={cn("notepad-content-container", (id === 'oyDN2LIr8z7VyYA5727F' || id === 'FdQ656GJ94TePuHpotbY' || id === 'Iz0UWQ5gQwXlk1kGBf1' || id === 'kRfKpBDg946Y99668Tih' || id === 'EktERYKT8kyk3JWymwbu' || id === 'rzBhqCTd8wwZmD8JCNEk') && "small-typography")} data-element-id={id}>
                        {/* Fondo con líneas horizontales perfectas y margen rojo */}
                        <div className={cn("notepad-lines-background", (id === 'oyDN2LIr8z7VyYA5727F' || id === 'FdQ656GJ94TePuHpotbY' || id === 'Iz0UWQ5gQwXlk1kGBf1' || id === 'kRfKpBDg946Y99668Tih' || id === 'EktERYKT8kyk3JWymwbu' || id === 'rzBhqCTd8wwZmD8JCNEk') && "small-typography")} data-element-id={id} />
                    {!isPreview && (
                       <div 
                          className="absolute w-1 h-1 bg-red-500 rounded-full"
                          style={{
                            left: '38px',
                            top: 'calc(100% - 48px)'
                          }}
                          title="Indicador de fin de página visible"
                       />
                    )}
                    {isInfoOpen && (
                      <div className='absolute inset-0 bg-white/95 z-20 p-4 text-xs overflow-y-auto' onClick={() => setIsInfoOpen(false)}>
                        <h3 className='font-bold mb-2 text-base'>Comandos de Dictado por Voz</h3>
                        <p>WIP</p>
                        <p className="text-center mt-4 text-gray-500">Haz clic en cualquier lugar para cerrar</p>
                      </div>
                    )}
                        {/* Área de contenido editable con alineación perfecta */}
                        <div
                            ref={contentRef}
                            contentEditable={!isPreview && (!typedContent.password || isUnlockedForEditing)}
                            spellCheck="true"
                            suppressContentEditableWarning
                            onPaste={handlePaste}
                            onFocus={() => onEditElement(id)}
                            onInput={handleChange}
                            onBlur={handleAutoSaveBlur}
                            className={cn(
                                "notepad-content-editable",
                                formatType === '20x15' && "horizontal-format",
                                (id === 'oyDN2LIr8z7VyYA5727F' || id === 'FdQ656GJ94TePuHpotbY' || id === 'Iz0UWQ5gQwXlk1kGBf1' || id === 'kRfKpBDg946Y99668Tih' || id === 'EktERYKT8kyk3JWymwbu' || id === 'rzBhqCTd8wwZmD8JCNEk') && "small-typography",
                                "p-[32px_24px_16px_0px]" // Padding estándar - sin scroll infinito
                            )}
                            data-element-id={id}
                        />
                        
                        {/* Indicador de estado de guardado */}
                        {!isPreview && (
                            <div className="absolute top-2 right-2 z-20">
                                <SaveStatusIndicator status={saveStatus} size="sm" />
                            </div>
                        )}

                        {/* Overlay de bloqueo */}
                        {typedContent.password && !isUnlockedForEditing && (
                          <div
                            className="absolute inset-0 bg-black/20 flex items-center justify-center z-30 cursor-pointer"
                            onDoubleClick={handleNotepadDoubleClick}
                            title="Doble clic para desbloquear"
                          >
                            <div className="bg-white/90 p-4 rounded-lg shadow-lg text-center">
                              <Lock className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-gray-700">Cuaderno protegido</p>
                              <p className="text-xs text-gray-500 mt-1">Doble clic para desbloquear</p>
                            </div>
                          </div>
                        )}
                    </div>
                </CardContent>
            </>
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
        <DeleteNotepadDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteConfirmed}
        />
        <ExportPdfDialog
          isOpen={isExportPdfDialogOpen}
          onOpenChange={setIsExportPdfDialogOpen}
          totalPages={typedContent.pages?.length || 1}
          onExport={handleExportNotepadToPdf}
        />

        {/* Diálogo de contraseña */}
        {isPasswordDialogOpen && (
          <MiniPasswordDialog
            elementTitle={typedContent.title || 'Cuaderno'}
            currentPassword={typedContent.password}
            isLocked={typedContent.password && !isUnlockedForEditing}
            onPasswordChange={handlePasswordChange}
            onUnlock={handleUnlockForEditing}
            onClose={() => setIsPasswordDialogOpen(false)}
          />
        )}
    </Card>
  );
}
