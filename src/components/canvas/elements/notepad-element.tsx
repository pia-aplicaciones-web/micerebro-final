'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { CommonElementProps, NotepadContent, CanvasElementProperties } from '@/lib/types';
import {
  MoreVertical, X, Minus, Maximize, GripVertical,
  FileImage, Settings, Settings2,
  Info, Eraser, CalendarDays, FileSignature, Calendar,
  ArrowLeft, ArrowRight, Plus, Maximize2, Trash2, Lock, Sparkles, Copy,
  Volume2, Pause, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [isImprovingText, setIsImprovingText] = useState(false);
  const [isImproveDialogOpen, setIsImproveDialogOpen] = useState(false);
  const [improveOptions, setImproveOptions] = useState<Record<string, string>>({});
  const [selectedImproveKey, setSelectedImproveKey] = useState('correccion');
  const [selectedTextForImprove, setSelectedTextForImprove] = useState('');
  const [isImproveWholePage, setIsImproveWholePage] = useState(false);
  const selectionRangeRef = useRef<Range | null>(null);
  const [isSelectAllDialogOpen, setIsSelectAllDialogOpen] = useState(false);
  const [allPagesText, setAllPagesText] = useState('');
  const selectAllRef = useRef<HTMLTextAreaElement | null>(null);
  const [customInstruction, setCustomInstruction] = useState(''); // Instrucción personalizada para "Otro"
  const [isReading, setIsReading] = useState(false); // Estado de lectura de voz
  const [isPaused, setIsPaused] = useState(false); // Estado de pausa
  const [speechRate, setSpeechRate] = useState(0.85); // Velocidad de lectura (0.5-1.5)
  const [selectedVoiceName, setSelectedVoiceName] = useState('Paulina'); // Voz seleccionada
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false); // Popover de configuración
  
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

  const escapeHtml = useCallback((text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }, []);

  const captureSelectionText = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !contentRef.current) return '';
    const range = selection.getRangeAt(0);
    if (!contentRef.current.contains(range.commonAncestorContainer)) return '';
    const text = selection.toString();
    if (!text.trim()) return '';
    selectionRangeRef.current = range.cloneRange();
    return text;
  }, []);

  const fetchImproveOptions = useCallback(async (text: string, customInstr?: string) => {
    setIsImprovingText(true);
    try {
      const response = await fetch('/api/gemini/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, customInstruction: customInstr }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error || 'Error al mejorar el texto';
        toast({ variant: 'destructive', title: message });
        return false;
      }
      const data = await response.json();
      const nextOptions = {
        correccion: data.correccion || '',
        reescritura: data.reescritura || '',
        agrupar: data.agrupar || '',
        ordenar: data.ordenar || '',
        resumir: data.resumir || '',
        desarrollar: data.desarrollar || '',
        mejorar_todo: data.mejorar_todo || '',
        otro: data.otro || '', // Respuesta personalizada
      };
      const hasAny = Object.values(nextOptions).some((value) => (value || '').trim().length > 0);
      if (!hasAny) {
        toast({ variant: 'destructive', title: 'Respuesta vacía de Gemini' });
      }
      setImproveOptions(nextOptions);
      return true;
    } catch (error) {
      console.error('Error al mejorar texto:', error);
      toast({ variant: 'destructive', title: 'Error al mejorar texto' });
      return false;
    } finally {
      setIsImprovingText(false);
    }
  }, [toast]);

  // Función para ejecutar mejora cuando se selecciona una opción
  const handleSelectImproveOption = useCallback(async (key: string) => {
    setSelectedImproveKey(key);
    if (!selectedTextForImprove) return;
    // Si ya tenemos resultado para esta opción, no volver a consultar
    if (improveOptions[key]) return;
    // Consultar a Gemini
    await fetchImproveOptions(selectedTextForImprove);
  }, [selectedTextForImprove, improveOptions, fetchImproveOptions]);

  // Función para enviar instrucción personalizada
  const handleSendCustomInstruction = useCallback(async () => {
    if (!selectedTextForImprove || !customInstruction.trim()) {
      toast({ variant: 'destructive', title: 'Escribe una instrucción' });
      return;
    }
    setSelectedImproveKey('otro');
    await fetchImproveOptions(selectedTextForImprove, customInstruction);
  }, [selectedTextForImprove, customInstruction, fetchImproveOptions, toast]);

  const handleImproveText = useCallback(() => {
    if (isPreview || !contentRef.current) return;
    if (typedContent.password && !isUnlockedForEditing) {
      setIsPasswordDialogOpen(true);
      return;
    }
    const selectedText = captureSelectionText();
    const fullText = contentRef.current.innerText || contentRef.current.textContent || '';
    if (selectedText) {
      setIsImproveWholePage(false);
      setSelectedTextForImprove(selectedText);
      setImproveOptions({}); // Limpiar opciones anteriores
      setIsImproveDialogOpen(true);
      // NO llamar a fetchImproveOptions automáticamente
      return;
    }
    if (!fullText.trim()) {
      toast({ variant: 'destructive', title: 'No hay texto para mejorar' });
      return;
    }
    setIsImproveWholePage(true);
    setSelectedTextForImprove(fullText);
    setSelectedImproveKey('mejorar_todo');
    setImproveOptions({}); // Limpiar opciones anteriores
    setIsImproveDialogOpen(true);
    // NO llamar a fetchImproveOptions automáticamente
  }, [isPreview, typedContent.password, isUnlockedForEditing, captureSelectionText, toast]);

  const handleRetryImprove = useCallback(async () => {
    if (!selectedTextForImprove) return;
    await fetchImproveOptions(selectedTextForImprove);
  }, [selectedTextForImprove, fetchImproveOptions]);

  // INSERTAR: Agrega el texto DESPUÉS de la selección (no reemplaza)
  const handleInsertImprovedText = useCallback(() => {
    if (!contentRef.current) return;
    const newText = improveOptions[selectedImproveKey];
    if (!newText) {
      toast({ variant: 'destructive', title: 'No hay texto para insertar' });
      return;
    }
    if (isImproveWholePage) {
      // Si es toda la página, agregar al final
      const currentContent = contentRef.current.innerText || '';
      contentRef.current.innerText = currentContent + '\n\n' + newText;
      contentRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      setIsImproveDialogOpen(false);
      toast({ title: 'Texto agregado al final' });
      return;
    }
    if (!selectionRangeRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRangeRef.current);
    const range = selectionRangeRef.current;
    // Mover al final de la selección (NO borrar)
    range.collapse(false); // false = colapsar al final
    const textNode = document.createTextNode('\n' + newText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    contentRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    setIsImproveDialogOpen(false);
    toast({ title: 'Texto agregado después de la selección' });
  }, [improveOptions, selectedImproveKey, toast, isImproveWholePage]);

  // REEMPLAZAR: Reemplaza el texto seleccionado
  const handleReplaceImprovedText = useCallback(() => {
    if (!contentRef.current) return;
    const newText = improveOptions[selectedImproveKey];
    if (!newText) {
      toast({ variant: 'destructive', title: 'No hay texto para reemplazar' });
      return;
    }
    if (isImproveWholePage) {
      contentRef.current.innerText = newText;
      contentRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      setIsImproveDialogOpen(false);
      toast({ title: 'Texto reemplazado' });
      return;
    }
    if (!selectionRangeRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRangeRef.current);
    const range = selectionRangeRef.current;
    range.deleteContents();
    const textNode = document.createTextNode(newText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    contentRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    setIsImproveDialogOpen(false);
    toast({ title: 'Texto reemplazado' });
  }, [improveOptions, selectedImproveKey, toast, isImproveWholePage]);

  const safeProperties = (typeof properties === 'object' && properties !== null) ? properties : {};
  const formatType = (safeProperties as CanvasElementProperties)?.format || 'letter';

  const handleDuplicateNotepad = useCallback(async () => {
    if (!props.addElement) {
      toast({ variant: 'destructive', title: 'Duplicar no disponible' });
      return;
    }
    const newTitle = typedContent.title ? `${typedContent.title} (copia)` : 'Copia de cuaderno';
    const newContent: NotepadContent = {
      ...typedContent,
      title: newTitle,
      pages: [...(typedContent.pages || ['<div><br></div>'])],
      currentPage: typedContent.currentPage || 0,
    };
    await props.addElement('notepad', {
      content: newContent,
      properties: { format: formatType },
    });
    toast({ title: 'Cuaderno duplicado' });
  }, [props.addElement, typedContent, formatType, toast]);

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
  
  // Función para calcular líneas disponibles por formato
  const getLinesPerPage = useCallback((format: string) => {
    switch (format) {
      case '10x15': return 33; // 33 líneas en formato pequeño
      case '20x15': return 33; // 33 líneas en formato mediano
      case 'letter':
      default: return 33; // 33 líneas en formato letter (8.5x11)
    }
  }, []);

  // Estado para el diálogo de auto-paginación
  const [autoPageDialog, setAutoPageDialog] = useState<{
    isOpen: boolean;
    pages: string[];
    totalLines: number;
    linesPerPage: number;
  } | null>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    // Limpiar estilos HTML y obtener texto plano
    const clipboardData = e.clipboardData;
    let pastedText = clipboardData.getData('text/plain');

    // Si no hay texto plano, intentar limpiar HTML
    if (!pastedText) {
      const htmlContent = clipboardData.getData('text/html');
      if (htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        pastedText = tempDiv.textContent || tempDiv.innerText || '';
      }
    }

    if (!pastedText) return;

    // Limpiar y normalizar el texto
    pastedText = pastedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
      .trim();

    if (!pastedText) return;

    // Contar líneas del texto pegado
    const lines = pastedText.split('\n');
    const totalLines = lines.length;

    // Obtener formato actual y calcular líneas por página
    const notepadFormat = (properties as any)?.format || 'letter';
    const linesPerPage = getLinesPerPage(notepadFormat);

    // Usar las líneas por página completas (33 líneas)
    const maxLinesPerPage = linesPerPage; // Usar todas las líneas disponibles

    if (totalLines <= maxLinesPerPage) {
      // Texto pequeño, pegar normalmente
      document.execCommand('insertText', false, pastedText);
    } else {
      // Texto grande, mostrar diálogo de auto-paginación
      const pages: string[] = [];
      let currentPageLines: string[] = [];
      let currentLineCount = 0;

      for (const line of lines) {
        currentPageLines.push(line);
        currentLineCount++;

        // Crear nueva página cuando se alcance el límite de líneas (dejando 2 líneas de margen)
        if (currentLineCount >= maxLinesPerPage) {
          pages.push(currentPageLines.join('\n'));
          currentPageLines = [];
          currentLineCount = 0;
        }
      }

      // Agregar la última página si tiene contenido
      if (currentPageLines.length > 0) {
        pages.push(currentPageLines.join('\n'));
      }

      // Mostrar diálogo de confirmación
      setAutoPageDialog({
        isOpen: true,
        pages,
        totalLines,
        linesPerPage: maxLinesPerPage
      });
    }
  }, [properties, getLinesPerPage]);
  

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

  const handleDeletePage = useCallback(() => {
    if (isPreview) return;

    const currentPages = typedContent.pages || [];
    const totalPages = currentPages.length;

    // No permitir eliminar si es la única página
    if (totalPages <= 1) {
      return;
    }

    // Confirmar eliminación
    if (!confirm(`¿Eliminar la página ${currentPageIndex + 1}? Esta acción no se puede deshacer.`)) {
      return;
    }

    saveContent();

    // Crear nuevo array sin la página actual
    const newPages = currentPages.filter((_, index) => index !== currentPageIndex);

    // Ajustar el currentPage si es necesario
    let newCurrentPage = currentPageIndex;
    if (newCurrentPage >= newPages.length) {
      newCurrentPage = newPages.length - 1;
    }

    onUpdate(id, {
      content: { ...typedContent, pages: newPages, currentPage: newCurrentPage },
    });
  }, [isPreview, typedContent, currentPageIndex, onUpdate, id, saveContent]);

  // Función para aplicar auto-paginación
  const handleApplyAutoPagination = useCallback(() => {
    if (!autoPageDialog) return;

    // Crear páginas nuevas a partir del contenido dividido
    const newPages = [...(typedContent.pages || [])];

    // Reemplazar la página actual con la primera porción
    newPages[currentPageIndex] = autoPageDialog.pages[0];

    // Agregar las páginas adicionales
    for (let i = 1; i < autoPageDialog.pages.length; i++) {
      newPages.push(autoPageDialog.pages[i]);
    }

    // Actualizar el contenido con las nuevas páginas
    onUpdate(id, {
      content: {
        ...typedContent,
        pages: newPages,
        currentPage: currentPageIndex // Mantener en la página actual
      }
    });

    // Cerrar diálogo
    setAutoPageDialog(null);
  }, [autoPageDialog, typedContent, currentPageIndex, onUpdate, id]);

  const handleCancelAutoPagination = useCallback(() => {
    setAutoPageDialog(null);
  }, []);

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

  useEffect(() => {
    if (!isSelectAllDialogOpen) return;
    if (selectAllRef.current) {
      selectAllRef.current.focus();
      selectAllRef.current.select();
    }
  }, [isSelectAllDialogOpen, allPagesText]);

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
  
  const getAllPagesText = useCallback(() => {
    const pages = typedContent.pages || [];
    if (pages.length === 0) return '';
    return pages.map((pageHtml, index) => {
      const temp = document.createElement('div');
      temp.innerHTML = pageHtml || '';
      const text = temp.innerText || temp.textContent || '';
      const header = `--- Página ${index + 1} ---`;
      return `${header}\n${text.trim()}`;
    }).join('\n\n');
  }, [typedContent.pages]);

  // Voces disponibles para selección
  const voiceOptions = ['Paulina', 'Google español (Latinoamérica)', 'Luciana'];

  const getReadableText = useCallback((pages: string[], currentPageIndex: number, contentRef: React.RefObject<HTMLDivElement>): string => {
    const selection = window.getSelection();
    let selectedText = '';
    if (selection && selection.rangeCount > 0 && contentRef.current && contentRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      selectedText = selection.toString().trim();
    }

    if (selectedText) {
      return selectedText;
    }

    // No explicit selection, get text from current cursor position or start of current page
    const allPagesTextArray: string[] = [];
    
    // Process current page
    let currentPageRawText = (contentRef.current?.innerText || contentRef.current?.textContent || '').trim();
    let textFromCurrentPosition = '';

    if (selection && selection.rangeCount > 0 && contentRef.current && contentRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      const range = selection.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(contentRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      textFromCurrentPosition = currentPageRawText.substring(preSelectionRange.toString().length);
    } else {
      // No specific cursor position in current page, read from start
      textFromCurrentPosition = currentPageRawText;
    }
    
    if (textFromCurrentPosition) {
      allPagesTextArray.push(textFromCurrentPosition);
    }

    // Process subsequent pages
    for (let i = currentPageIndex + 1; i < pages.length; i++) {
      const pageHtml = pages[i];
      const temp = document.createElement('div');
      temp.innerHTML = pageHtml || '';
      const pageText = (temp.innerText || temp.textContent || '').trim();
      if (pageText) {
        allPagesTextArray.push(pageText);
      }
    }

    return allPagesTextArray.filter(t => t).join('. ');
  }, []);

  // Función para leer todas las páginas
  const handleReadAloud = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ variant: 'destructive', title: 'Tu navegador no soporta lectura de voz' });
      return;
    }
    // Si está pausado, reanudar
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    // Si ya está leyendo, pausar
    if (isReading) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    
    const pages = typedContent.pages || [];
    const currentPageIndex = typedContent.currentPage || 0; // Obtener el índice de la página actual

    const textToRead = getReadableText(pages, currentPageIndex, contentRef);

    if (!textToRead.trim()) {
      toast({ variant: 'destructive', title: 'No hay texto para leer desde la posición actual' });
      return;
    }
    // Cancelar cualquier lectura previa
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    // Buscar voz seleccionada
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;
    
    // Buscar la voz por el nombre seleccionado y el idioma español
    selectedVoice = voices.find(v => v.name.includes(selectedVoiceName) && v.lang.startsWith('es'));

    const fallbackVoice = voices.find(v => v.lang.startsWith('es'));
    utterance.voice = selectedVoice || fallbackVoice || null;
    utterance.lang = 'es-ES'; // Cambiar a es-ES para un español más neutro por defecto
    utterance.rate = speechRate;
    utterance.pitch = 1; // Tono medio
    utterance.volume = 1; // Volumen medio
    utterance.onstart = () => { setIsReading(true); setIsPaused(false); };
    utterance.onend = () => { setIsReading(false); setIsPaused(false); };
    utterance.onerror = () => { setIsReading(false); setIsPaused(false); };
    window.speechSynthesis.speak(utterance);
  }, [typedContent.pages, typedContent.currentPage, isReading, isPaused, toast, speechRate, selectedVoiceName, getReadableText, contentRef]);

  // Detener lectura
  const handleStopReading = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
  }, []);

  const handleSelectAllText = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = getAllPagesText();
    if (!text.trim()) {
      toast({ variant: 'destructive', title: 'No hay texto para seleccionar' });
      return;
    }
    setAllPagesText(text);
    setIsSelectAllDialogOpen(true);
  }, [getAllPagesText, toast]);

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

  const improveOptionLabels: Record<string, string> = {
    correccion: 'Corrección ortográfica',
    reescritura: 'Reescritura clara',
    agrupar: 'Agrupar ideas',
    ordenar: 'Ordenar por temas',
    resumir: 'Resumir',
    desarrollar: 'Desarrollar idea',
    mejorar_todo: 'Mejorar todo',
  };
  
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title={isImprovingText ? 'Mejorando...' : 'Mejorar texto'}
                      onClick={handleImproveText}
                      disabled={isImprovingText}
                    >
                      <Sparkles className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Seleccionar todo"
                      onClick={handleSelectAllText}
                    >
                      <FileSignature className="size-4" />
                    </Button>
                    <Button
                      variant={isReading ? 'secondary' : 'ghost'}
                      size="icon"
                      className="size-7"
                      title={isReading ? (isPaused ? 'Reanudar' : 'Pausar') : 'Leer en voz alta'}
                      onClick={handleReadAloud}
                    >
                      {isReading && !isPaused ? <Pause className="size-4" /> : <Volume2 className="size-4" />}
                    </Button>
                    {isReading && (
                      <Button variant="ghost" size="icon" className="size-7" title="Detener" onClick={handleStopReading}>
                        <Square className="size-4" />
                      </Button>
                    )}
                    <Popover open={isVoiceSettingsOpen} onOpenChange={setIsVoiceSettingsOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7" title="Configurar voz">
                          <Settings2 className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3" align="start">
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium">Voz</label>
                            <select
                              className="w-full mt-1 p-1.5 text-sm border rounded"
                              value={selectedVoiceName}
                              onChange={(e) => setSelectedVoiceName(e.target.value)}
                            >
                              {voiceOptions.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium">Velocidad: {speechRate.toFixed(2)}</label>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.05"
                              value={speechRate}
                              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                              className="w-full mt-1"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Lenta</span>
                              <span>Rápida</span>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
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
                          <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleDuplicateNotepad();}}>
                              <Copy className="mr-2 h-4 w-4" />
                              <span>Duplicar cuaderno</span>
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
                    title="Eliminar Página Actual"
                    onClick={handleDeletePage}
                    disabled={(typedContent.pages?.length || 0) <= 1}
                >
                    <Minus className="size-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 ml-1"
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

        {/* Diálogo de Auto-Paginación */}
        <Dialog open={autoPageDialog?.isOpen || false} onOpenChange={(open) => !open && handleCancelAutoPagination()}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📄 Auto-Paginación de Texto</DialogTitle>
              <DialogDescription>
                El texto pegado tiene {autoPageDialog?.totalLines} líneas, que excede el límite de {autoPageDialog?.linesPerPage} líneas por página.
                Se dividirá automáticamente en {autoPageDialog?.pages.length} páginas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📊 Distribución de Páginas:</h4>
                <div className="space-y-2">
                  {autoPageDialog?.pages.map((pageContent, index) => {
                    const linesInPage = pageContent.split('\n').length;
                    return (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Página {index + 1}:</span>
                          <span className="text-sm text-gray-600">{linesInPage} líneas</span>
                        </div>
                        <div className="text-xs text-gray-500 max-w-[300px] truncate">
                          {pageContent.substring(0, 100)}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">⚠️ Importante:</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• La página actual será reemplazada con el contenido de la Página 1</li>
                  <li>• Se crearán {((autoPageDialog?.pages.length || 1) - 1)} páginas adicionales</li>
                  <li>• El contenido existente de otras páginas no se verá afectado</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCancelAutoPagination}>
                  Cancelar
                </Button>
                <Button onClick={handleApplyAutoPagination}>
                  Aplicar Auto-Paginación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Mejorar Texto */}
        <Dialog open={isImproveDialogOpen} onOpenChange={setIsImproveDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>✨ Mejorar texto con IA</DialogTitle>
              <DialogDescription>
                Elige qué quieres hacer con tu texto. Gemini lo procesará cuando hagas clic.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-gray-500 mb-1 font-medium">Opciones predefinidas:</div>
                {Object.entries(improveOptionLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedImproveKey === key && improveOptions[key] ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleSelectImproveOption(key)}
                    disabled={isImprovingText}
                  >
                    {isImprovingText && selectedImproveKey === key ? '⏳ ' : ''}{label}
                  </Button>
                ))}

                {/* Sección "Otro" - instrucción personalizada */}
                <div className="border-t pt-3 mt-3">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Pedir otra cosa:</div>
                  <textarea
                    className="w-full p-2 border rounded text-sm resize-none"
                    rows={3}
                    placeholder="Escribe cualquier instrucción para Gemini..."
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    disabled={isImprovingText}
                  />
                  <Button
                    variant={selectedImproveKey === 'otro' ? 'default' : 'outline'}
                    className="w-full mt-2"
                    onClick={handleSendCustomInstruction}
                    disabled={isImprovingText || !customInstruction.trim()}
                  >
                    {isImprovingText && selectedImproveKey === 'otro' ? '⏳ Procesando...' : '🚀 Enviar instrucción'}
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {isImproveWholePage ? 'Texto completo' : 'Texto seleccionado'}
                  </div>
                  <div className="p-2 border rounded bg-gray-50 text-sm whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                    {selectedTextForImprove || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Resultado de Gemini</div>
                  <div className="p-3 border rounded min-h-[200px] bg-white text-sm whitespace-pre-wrap overflow-y-auto max-h-[300px]">
                    {isImprovingText ? (
                      <span className="text-gray-400 animate-pulse">⏳ Generando respuesta...</span>
                    ) : improveOptions[selectedImproveKey] ? (
                      improveOptions[selectedImproveKey]
                    ) : (
                      <span className="text-gray-400">👈 Elige una opción para comenzar</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleRetryImprove} disabled={isImprovingText || !selectedTextForImprove}>
                Intentar de nuevo
              </Button>
              <Button variant="outline" onClick={handleInsertImprovedText} disabled={isImprovingText || !improveOptions[selectedImproveKey]}>
                Insertar (agregar)
              </Button>
              <Button onClick={handleReplaceImprovedText} disabled={isImprovingText || !improveOptions[selectedImproveKey]}>
                Reemplazar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo Seleccionar todo el texto */}
        <Dialog open={isSelectAllDialogOpen} onOpenChange={setIsSelectAllDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Seleccionar todo el texto</DialogTitle>
              <DialogDescription>
                Texto combinado de todas las páginas. Puedes copiarlo completo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <textarea
                ref={selectAllRef}
                className="w-full min-h-[260px] border rounded p-3 text-sm"
                value={allPagesText}
                readOnly
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(allPagesText);
                      toast({ title: 'Texto copiado' });
                    } catch {
                      toast({ variant: 'destructive', title: 'No se pudo copiar' });
                    }
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </Card>
  );
}
