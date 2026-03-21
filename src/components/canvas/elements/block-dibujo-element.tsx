'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CommonElementProps, BlockDibujoContent } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Trash2, FileImage, MoreVertical, Minus, X, Copy, Camera, Pencil, Plus, ChevronLeft, ChevronRight, Clipboard, HelpCircle, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { cn } from '@/lib/utils';
import { shouldAllowTouchEdit } from '@/lib/touch-edit-guard';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const HELP_ITEMS = [
  { title: 'Escribir', detail: 'Usa el área principal para escribir o pegar contenido.' },
  { title: 'Páginas', detail: 'Usa + para crear nuevas páginas y las flechas para navegar.' },
  { title: 'Copiar', detail: 'Copia texto, imágenes o todo desde el menú ⋮.' },
  { title: 'Pegar', detail: 'Pega desde otro block con el botón correspondiente en el menú.' },
  { title: 'Exportar', detail: 'Exporta como PNG o captura desde el menú ⋮.' },
  { title: 'Minimizar', detail: 'Usa el botón de minimizar para cerrar temporalmente.' },
];

const COPIED_KEY = 'micerebro-block-dibujo-clipboard';
const COPIED_IMAGES_KEY = 'micerebro-block-dibujo-images';

export default function BlockDibujoElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isSelected,
    isPreview,
    minimized: minimizedProp,
  } = props;

  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copyingPageIndex, setCopyingPageIndex] = useState<number | null>(null);
  const isMinimized = !!minimizedProp;

  // Parsear contenido
  const typedContent = (content || {}) as BlockDibujoContent;
  const textContent = typedContent.text || '';
  const initialTitle = typedContent.title || 'BLOCK DIBUJO';
  
  // Inicializar páginas: si no hay páginas, crear una página inicial
  const initialPages = typedContent.pages && typedContent.pages.length > 0 
    ? typedContent.pages 
    : [textContent || ''];
  const initialCurrentPage = typedContent.currentPage !== undefined 
    ? typedContent.currentPage 
    : 0;

  // Estado del texto y título
  const [text, setText] = useState(textContent);
  const [title, setTitle] = useState(initialTitle);
  const [pages, setPages] = useState<string[]>(initialPages);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialCurrentPage);

  // Refs para mantener referencias estables
  const typedContentRef = useRef(typedContent);
  const textContentRef = useRef(textContent);

  useEffect(() => {
    typedContentRef.current = typedContent;
    textContentRef.current = textContent;
  }, [typedContent, textContent]);

  // Guardar página actual antes de cambiar
  const saveCurrentPage = useCallback(async () => {
    if (!contentRef.current) return;
    const currentHtml = contentRef.current.innerHTML || '';
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = currentHtml;
    setPages(updatedPages);
    
    // Extraer imágenes del HTML para guardarlas en el array de imágenes
    const images: Array<{ id: string; url: string; alt?: string }> = [];
    if (contentRef.current) {
      const imgElements = contentRef.current.querySelectorAll('img');
      for (const img of Array.from(imgElements)) {
        images.push({
          id: `img-${Date.now()}-${Math.random()}`,
          url: img.src,
          alt: img.alt || '',
        });
      }
    }
    
    await onUpdate(id, {
      content: {
        ...typedContent,
        text: currentHtml, // Guardar HTML de la página actual
        pages: updatedPages,
        currentPage: currentPageIndex,
        images: images.length > 0 ? images : typedContent.images || [],
      }
    });
  }, [pages, currentPageIndex, typedContent, onUpdate, id]);

  // Hook de autoguardado para contenido
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = contentRef.current?.innerHTML || '';
      return html;
    },
    onSave: async (newHtml) => {
      const currentText = contentRef.current?.innerText || contentRef.current?.textContent || '';
      const currentHtml = contentRef.current?.innerHTML || '';
      setText(currentText);
      
      // Actualizar la página actual en el array de páginas
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = currentHtml;
      setPages(updatedPages);
      
      // Extraer imágenes del HTML para guardarlas en el array de imágenes
      const images: Array<{ id: string; url: string; alt?: string }> = [];
      if (contentRef.current) {
        const imgElements = contentRef.current.querySelectorAll('img');
        for (const img of Array.from(imgElements)) {
          images.push({
            id: `img-${Date.now()}-${Math.random()}`,
            url: img.src,
            alt: img.alt || '',
          });
        }
      }
      
      // Guardar HTML completo en text para preservar formato e imágenes
      await onUpdate(id, {
        content: {
          ...typedContent,
          text: currentHtml, // Guardar HTML completo, no solo texto plano
          pages: updatedPages,
          currentPage: currentPageIndex,
          images: images.length > 0 ? images : typedContent.images || [],
        }
      });
    },
    debounceMs: 4000,
    compareContent: (oldContent, newContent) => {
      const normalizedCurrent = (text || '').trim();
      const normalizedNew = (newContent || '').trim();
      return normalizedCurrent === normalizedNew;
    },
  });

  // Hook de autoguardado para título
  const { handleBlur: handleTitleBlurAutoSave } = useAutoSave({
    getContent: () => titleRef.current?.innerText || 'BLOCK DIBUJO',
    onSave: async (newTitle) => {
      if (isPreview || !titleRef.current) return;
      if (typedContent.title !== newTitle) {
        setTitle(newTitle);
        const newContent: BlockDibujoContent = { ...typedContent, title: newTitle };
        onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 1000,
    disabled: isPreview,
  });

  const handleTitleBlur = useCallback(async () => {
    if (isPreview || !titleRef.current) return;
    await handleTitleBlurAutoSave();
  }, [isPreview, handleTitleBlurAutoSave]);

  // Cambiar de página
  const changePage = useCallback(async (newPageIndex: number) => {
    if (newPageIndex < 0 || newPageIndex >= pages.length) return;
    
    // Guardar página actual antes de cambiar
    await saveCurrentPage();
    
    // Cambiar a la nueva página
    setCurrentPageIndex(newPageIndex);
    if (contentRef.current) {
      contentRef.current.innerHTML = pages[newPageIndex] || '';
    }
  }, [pages, saveCurrentPage]);

  // Agregar nueva página
  const addNewPage = useCallback(async () => {
    await saveCurrentPage();
    const newPages = [...pages, ''];
    setPages(newPages);
    setCurrentPageIndex(newPages.length - 1);
    if (contentRef.current) {
      contentRef.current.innerHTML = '';
    }
    await onUpdate(id, {
      content: {
        ...typedContent,
        pages: newPages,
        currentPage: newPages.length - 1,
        text: '',
      },
    });
  }, [pages, saveCurrentPage]);

  // Eliminar página actual
  const deleteCurrentPage = useCallback(async () => {
    if (pages.length <= 1) {
      toast({ variant: 'destructive', title: 'No se puede eliminar la última página' });
      return;
    }
    
    const newPages = pages.filter((_, index) => index !== currentPageIndex);
    setPages(newPages);
    const newIndex = currentPageIndex >= newPages.length ? newPages.length - 1 : currentPageIndex;
    setCurrentPageIndex(newIndex);
    
    if (contentRef.current) {
      contentRef.current.innerHTML = newPages[newIndex] || '';
    }
    
    await onUpdate(id, {
      content: {
        ...typedContent,
        pages: newPages,
        currentPage: newIndex,
        text: newPages[newIndex] || '',
      }
    });
  }, [pages, currentPageIndex, typedContent, onUpdate, id, toast]);

  // Sincronizar contenido desde props (HTML completo con imágenes)
  useEffect(() => {
    if (contentRef.current && !isMinimized) {
      const isFocused = document.activeElement === contentRef.current;
      if (!isFocused) {
        const currentPageHtml = pages[currentPageIndex] || '';
        const currentHtml = contentRef.current.innerHTML.trim();
        
        // Si el HTML guardado es diferente al actual, restaurarlo
        if (currentPageHtml && currentHtml !== currentPageHtml.trim()) {
          contentRef.current.innerHTML = currentPageHtml;
        }
      }
    }
  }, [pages, currentPageIndex, isMinimized]);
  
  // Cargar contenido inicial al montar y sincronizar páginas
  useEffect(() => {
    if (contentRef.current && !isMinimized) {
      const currentPageHtml = pages[currentPageIndex] || '';
      const currentHtml = contentRef.current.innerHTML.trim();
      
      // Si hay contenido guardado en la página actual y el contenido actual está vacío, restaurarlo
      if (currentPageHtml && !currentHtml) {
        contentRef.current.innerHTML = currentPageHtml;
      } else if (!currentPageHtml && typedContent.text) {
        // Si no hay páginas pero hay texto guardado (migración), crear página inicial
        const updatedPages = [typedContent.text];
        setPages(updatedPages);
        contentRef.current.innerHTML = typedContent.text;
      }
    }
  }, []); // Solo al montar

  // Sincronizar páginas desde props cuando cambian
  useEffect(() => {
    if (typedContent.pages && typedContent.pages.length > 0) {
      setPages(typedContent.pages);
    }
    if (typedContent.currentPage !== undefined) {
      setCurrentPageIndex(typedContent.currentPage);
    }
  }, [typedContent.pages, typedContent.currentPage]);

  // Sincronizar título desde props
  useEffect(() => {
    const titleEl = titleRef.current;
    if (titleEl && titleEl.innerText !== (typedContent.title || 'BLOCK DIBUJO')) {
      titleEl.innerText = typedContent.title || 'BLOCK DIBUJO';
      setTitle(typedContent.title || 'BLOCK DIBUJO');
    }
  }, [typedContent.title]);

  // Manejar cambios en el contenido
  const handleContentInput = useCallback(() => {
    handleChange();
  }, [handleChange]);

  const handleContentBlur = useCallback(async () => {
    await handleAutoSaveBlur();
  }, [handleAutoSaveBlur]);

  // ========== FUNCIONALIDAD DE COPIAR/PEGAR ==========

  // Copiar texto al clipboard
  const handleCopyText = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      const textContent = contentRef.current.innerText || contentRef.current.textContent || '';
      const blockTitle = typedContent.title || 'BLOCK DIBUJO';
      const orderedText = `${blockTitle}\n${'='.repeat(blockTitle.length)}\n\n${textContent.trim()}\n\n---\nExportado desde CanvasMind\n${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      await navigator.clipboard.writeText(orderedText);
      toast({ title: 'Texto copiado al portapapeles' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar texto' });
    }
  }, [typedContent.title, toast]);

  // Copiar imágenes del contenido
  const handleCopyImages = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      const images = contentRef.current.querySelectorAll('img');
      if (images.length === 0) {
        toast({ variant: 'destructive', title: 'No hay imágenes para copiar' });
        return;
      }

      const imageData: Array<{ id: string; url: string; alt?: string }> = [];
      
      for (const img of Array.from(images)) {
        const src = img.src;
        if (src.startsWith('data:')) {
          imageData.push({
            id: `img-${Date.now()}-${Math.random()}`,
            url: src,
            alt: img.alt || '',
          });
        } else {
          // Si es URL externa, intentar convertir a base64
          try {
            const response = await fetch(src);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              imageData.push({
                id: `img-${Date.now()}-${Math.random()}`,
                url: reader.result as string,
                alt: img.alt || '',
              });
            };
            reader.readAsDataURL(blob);
          } catch (e) {
            // Si falla, guardar la URL directamente
            imageData.push({
              id: `img-${Date.now()}-${Math.random()}`,
              url: src,
              alt: img.alt || '',
            });
          }
        }
      }

      // Guardar en localStorage
      localStorage.setItem(COPIED_IMAGES_KEY, JSON.stringify(imageData));
      toast({ title: `${imageData.length} imagen(es) copiada(s)` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar imágenes' });
    }
  }, [toast]);

  // Copiar todo el contenido (texto + imágenes)
  const handleCopyAll = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      const htmlContent = contentRef.current.innerHTML;
      const textContent = contentRef.current.innerText || contentRef.current.textContent || '';
      
      // Extraer imágenes del HTML
      const images: Array<{ id: string; url: string; alt?: string }> = [];
      const imgElements = contentRef.current.querySelectorAll('img');
      for (const img of Array.from(imgElements)) {
        images.push({
          id: `img-${Date.now()}-${Math.random()}`,
          url: img.src,
          alt: img.alt || '',
        });
      }

      const payload = {
        type: 'block-dibujo',
        html: htmlContent,
        text: textContent,
        images: images,
        title: typedContent.title || 'BLOCK DIBUJO',
      };

      localStorage.setItem(COPIED_KEY, JSON.stringify(payload));
      toast({ title: 'Contenido copiado (texto + imágenes)' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar contenido' });
    }
  }, [typedContent.title, toast]);

  // Pegar desde clipboard externo (texto e imágenes)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Verificar si hay imágenes en el clipboard
    const items = Array.from(clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      // Pegar imagen
      const file = imageItem.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (contentRef.current && reader.result) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              
              const img = document.createElement('img');
              img.src = reader.result as string;
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.alt = 'Imagen pegada';
              
              range.insertNode(img);
              range.setStartAfter(img);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              
              handleChange();
              toast({ title: 'Imagen pegada' });
            }
          }
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    // Pegar texto
    let pastedText = clipboardData.getData('text/plain');
    if (!pastedText) {
      const htmlContent = clipboardData.getData('text/html');
      if (htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        pastedText = tempDiv.textContent || tempDiv.innerText || '';
      }
    }

    if (!pastedText) return;

    // Normalizar saltos de línea
    pastedText = pastedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    if (!pastedText.trim()) return;

    // Insertar texto en la posición del cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && contentRef.current) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Convertir saltos de línea en <br> o divs
      const lines = pastedText.split('\n');
      lines.forEach((line, index) => {
        if (line === '') {
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
        } else {
          const textNode = document.createTextNode(line);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
        }
        if (index < lines.length - 1) {
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
        }
      });
      
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      handleChange();
    }
  }, [handleChange, toast]);

  // Pegar desde otros elementos de la app
  const handlePasteFromApp = useCallback(() => {
    try {
      // Intentar leer desde localStorage
      const copiedData = localStorage.getItem(COPIED_KEY);
      if (!copiedData) {
        toast({ variant: 'destructive', title: 'No hay contenido copiado' });
        return;
      }

      const payload = JSON.parse(copiedData);
      
      if (!contentRef.current) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Si viene HTML con imágenes, insertarlo
        if (payload.html) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = payload.html;
          
          // Insertar contenido
          while (tempDiv.firstChild) {
            range.insertNode(tempDiv.firstChild);
            range.setStartAfter(range.endContainer);
          }
        } else if (payload.text) {
          // Insertar solo texto
          const textNode = document.createTextNode(payload.text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
        }

        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        handleChange();
        toast({ title: 'Contenido pegado desde otro elemento' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al pegar contenido' });
    }
  }, [handleChange, toast]);

  // Exportar a PNG
  const handleExportToPng = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const blockCard = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!blockCard) {
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

      const canvas = await html2canvas(blockCard, {
        backgroundColor: '#FFFFFF',
        scale: 2.1,
        useCORS: true,
        logging: false,
        allowTaint: false,
        windowWidth: blockCard.scrollWidth,
        windowHeight: blockCard.scrollHeight,
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
        link.download = `block-dibujo_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportado',
          description: 'BLOCK DIBUJO exportado como PNG.',
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

  // Exportar captura
  const handleExportCapture = useCallback(async () => {
    try {
      const blockElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!blockElement) {
        console.error('No se pudo encontrar el elemento BLOCK DIBUJO');
        return;
      }

      console.log('Capturando BLOCK DIBUJO...');
      setIsCapturing(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(blockElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: '#FFFFFF',
        includeQueryParams: false,
        skipFonts: true,
        width: blockElement.offsetWidth,
        height: blockElement.offsetHeight,
      });

      setIsCapturing(false);

      const link = document.createElement('a');
      const blockTitle = typedContent.title || 'block-dibujo';
      link.download = `${blockTitle}_captura.png`;
      link.href = dataUrl;
      link.click();

      console.log('Captura de BLOCK DIBUJO completada');
    } catch (error: any) {
      setIsCapturing(false);
      console.error('Error en captura de BLOCK DIBUJO:', error);
    }
  }, [id, typedContent.title]);

  const handleOpenPdfInNewWindow = useCallback(async () => {
    try {
      const blockElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!blockElement) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el block.' });
        return;
      }

      const exportWidth = blockElement.scrollWidth;
      const exportHeight = blockElement.scrollHeight;
      const imgData = await toPng(blockElement, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.98,
        backgroundColor: '#FFFFFF',
        width: exportWidth,
        height: exportHeight,
      });

      const pdf = new jsPDF({
        orientation: exportWidth >= exportHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [exportWidth, exportHeight],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, exportWidth, exportHeight);

      const blob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(blob);
      const opened = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        toast({
          variant: 'destructive',
          title: 'Ventana bloqueada',
          description: 'Permite pop-ups para abrir el PDF.',
        });
      }
    } catch (error: any) {
      console.error('Error al crear PDF de block dibujo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'No se pudo crear el PDF.',
      });
    }
  }, [id, toast]);

  // Copiar una página como imagen al portapapeles (pegar en tablero o dentro de un elemento)
  const copyPageAsImage = useCallback(async (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    const pageHtml = pages[pageIndex] ?? '';
    setCopyingPageIndex(pageIndex);
    try {
      const temp = document.createElement('div');
      temp.setAttribute('data-block-dibujo-copy', '1');
      Object.assign(temp.style, {
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: '500px',
        minHeight: '667px',
        padding: '16px 16px 16px 16px',
        fontFamily: "'Kalam', cursive",
        fontSize: '22px',
        lineHeight: '30px',
        color: '#000',
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
        overflow: 'hidden',
      });
      temp.innerHTML = pageHtml || '<p>&nbsp;</p>';
      document.body.appendChild(temp);

      const canvas = await html2canvas(temp, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false,
        width: 500,
        height: Math.max(667, temp.scrollHeight + 32),
      });
      document.body.removeChild(temp);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 1);
      });
      if (!blob) {
        toast({ variant: 'destructive', title: 'No se pudo generar la imagen' });
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      toast({
        title: 'Página copiada',
        description: `Página ${pageIndex + 1} en el portapapeles. Pega en el tablero o dentro de un elemento.`,
      });
    } catch (err: any) {
      console.error('Error al copiar página como imagen:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'No se pudo copiar al portapapeles.',
      });
    } finally {
      setCopyingPageIndex(null);
    }
  }, [pages, toast]);

  const handleRestoreOriginalSize = useCallback(() => {
    if (isPreview) return;
    const originalSize = { width: 567, height: 756 }; // Estándar iPad
    onUpdate(id, {
      properties: {
        ...properties,
        size: originalSize,
      },
    });
  }, [isPreview, properties, onUpdate, id]);

  const toggleMinimize = useCallback(async () => {
    if (isPreview) return;
    const newMinimizedState = !isMinimized;
    handleChange();
    const currentText = contentRef.current?.innerText ?? contentRef.current?.textContent ?? typedContent.text ?? '';
    const updatedContent = { ...typedContent, text: currentText };
    if (newMinimizedState) {
      const currentSize = (properties as any)?.size || { width: 567, height: 756 };
      const w = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 567;
      const h = typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 756;
      onUpdate(id, {
        minimized: true,
        content: updatedContent,
        properties: {
          ...properties,
          size: { width: w, height: 48 },
          originalSize: { width: w, height: h },
        },
      });
    } else {
      const { originalSize, ...restProps } = (properties || {}) as any;
      const restoredSize = originalSize || { width: 567, height: 756 };
      onUpdate(id, {
        minimized: false,
        content: updatedContent,
        properties: { ...restProps, size: restoredSize },
      });
    }
  }, [isMinimized, isPreview, onUpdate, id, properties, typedContent, handleChange]);

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
        backgroundColor: '#FFFFFF',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        const isTextArea = target === contentRef.current || contentRef.current?.contains(target);
        if (!isTextArea) {
          e.currentTarget.classList.add('drag-handle');
        } else {
          e.currentTarget.classList.remove('drag-handle');
        }
      }}
    >
      {/* Header negro con texto blanco (altura reducida ~40%) */}
      <div
        className="flex items-center justify-between px-3 py-1.5 drag-handle"
        data-notepad-header
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          minHeight: '28px',
        }}
      >
        {/* Left: Icono y título editable */}
        <div className="flex items-center gap-2">
          <Pencil className="h-3 w-3 flex-shrink-0" style={{ color: '#FFFFFF' }} />
          <div className="flex flex-col min-w-0">
            <div
              ref={titleRef}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onBlur={handleTitleBlur}
              className="text-xs font-bold leading-tight cursor-text select-none"
              style={{
                color: '#FFFFFF',
                fontFamily: "'Kalam', cursive",
              }}
              onInput={(e) => {
                const newTitle = e.currentTarget.textContent || 'BLOCK DIBUJO';
                setTitle(newTitle);
              }}
            >
              {title}
            </div>
          </div>
        </div>

        {/* Right: Action icons */}
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-white/10 p-0 min-w-0"
                title="Ayuda"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ color: '#FFFFFF' }}
              >
                <HelpCircle className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="text-sm font-semibold mb-2">Funciones</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {HELP_ITEMS.map((item) => (
                  <li key={item.title}>
                    <span className="font-semibold text-foreground">{item.title}:</span> {item.detail}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-white/10 p-0 min-w-0"
            title="Copiar texto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCopyText();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ color: '#FFFFFF' }}
          >
            <Copy className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-white/10 p-0 min-w-0"
            title="Crear PDF y abrir"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleOpenPdfInNewWindow();
            }}
            style={{ color: '#FFFFFF' }}
          >
            <Printer className="h-3 w-3" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-white/10 p-0 min-w-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ color: '#FFFFFF' }}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleCopyAll}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Copiar todo (texto + imágenes)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyImages}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>Copiar solo imágenes</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePasteFromApp}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Pegar desde otro elemento</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing}>
                <Camera className="mr-2 h-4 w-4" />
                <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleExportToPng(e)}} disabled={isExportingPng}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>{isExportingPng ? 'Exportando...' : 'Exportar a PNG'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-white/10 p-0 min-w-0"
            title="Restaurar tamaño original"
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize();}}
            style={{ color: '#FFFFFF' }}
          >
            <X className="h-3 w-3 rotate-45" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-red-400 hover:bg-red-900/20 min-w-0"
            title="Eliminar BLOCK DIBUJO"
            onMouseDown={(e) => {e.preventDefault(); e.stopPropagation(); handleDelete();}}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-white/80 hover:bg-white/10 min-w-0"
            title="Cerrar"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpdate(id, { hidden: true });
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content - Solo mostrar si no está minimizado */}
      {!isMinimized && (
        <div className="flex flex-row h-full" style={{ height: 'calc(100% - 29px)' }}>
          {/* Panel lateral con miniaturas */}
          <div
            className="flex flex-col items-center gap-2 p-2 border-r border-gray-200 bg-gray-50 overflow-y-auto"
            style={{
              width: '80px',
              minWidth: '80px',
            }}
          >
            {/* Botón agregar página */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-200 rounded-md"
              title="Agregar nueva página"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addNewPage();
              }}
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </Button>

            {/* Miniaturas de páginas */}
            <div className="flex flex-col gap-2 w-full">
              {pages.map((pageHtml, index) => {
                // Crear una miniatura del contenido
                const pagePreview = pageHtml 
                  ? (new DOMParser().parseFromString(pageHtml, 'text/html').body.innerText || '').substring(0, 50)
                  : 'Página vacía';
                
                return (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      changePage(index);
                    }}
                    className={cn(
                      'relative w-full aspect-[3/4] border-2 rounded cursor-pointer transition-all',
                      'bg-white shadow-sm hover:shadow-md',
                      currentPageIndex === index 
                        ? 'border-teal-500 shadow-md' 
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                    title={`Página ${index + 1}${pagePreview ? ': ' + pagePreview : ''}`}
                  >
                    {/* Número de página */}
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[8px] px-1 rounded">
                      {index + 1}
                    </div>
                    
                    {/* Preview del contenido */}
                    <div
                      className="w-full h-full p-1 text-[6px] overflow-hidden"
                      style={{
                        fontFamily: "'Kalam', cursive",
                        lineHeight: '1.2',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: pageHtml 
                          ? pageHtml.replace(/<img[^>]*>/g, '🖼️').substring(0, 200)
                          : ''
                      }}
                    />

                    {/* Copiar página como imagen al portapapeles */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-0 left-0 right-0 h-6 w-full rounded-b border-t border-gray-200 bg-white/95 hover:bg-gray-100 flex items-center justify-center"
                      title="Copiar página como imagen (pegar en tablero o en un elemento)"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyPageAsImage(index);
                      }}
                      disabled={copyingPageIndex !== null}
                    >
                      {copyingPageIndex === index ? (
                        <span className="text-[8px]">...</span>
                      ) : (
                        <Clipboard className="h-3 w-3 text-gray-600" />
                      )}
                    </Button>
                    
                    {/* Botón eliminar página */}
                    {pages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-4 w-4 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white rounded"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (index === currentPageIndex) {
                            deleteCurrentPage();
                          } else {
                            const newPages = pages.filter((_, i) => i !== index);
                            setPages(newPages);
                            if (index < currentPageIndex) {
                              setCurrentPageIndex(currentPageIndex - 1);
                            }
                            onUpdate(id, {
                              content: {
                                ...typedContent,
                                pages: newPages,
                                currentPage: index < currentPageIndex ? currentPageIndex - 1 : currentPageIndex,
                              }
                            });
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.classList.remove('opacity-0');
                          e.currentTarget.classList.add('opacity-100');
                        }}
                        style={{ opacity: 0 }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Área de contenido principal */}
          <div
            ref={contentRef}
            contentEditable={!isPreview}
            onInput={handleContentInput}
            onBlur={handleContentBlur}
            onPaste={handlePaste}
            onFocus={() => {
              // Dejamos que el navegador coloque el cursor donde el usuario toca o hace clic
            }}
            onTouchStart={(e) => {
              const target = contentRef.current || (e.currentTarget as HTMLElement);
              if (!shouldAllowTouchEdit(target)) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }}
            onMouseDown={(e) => {
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
              fontFamily: "'Kalam', cursive",
              fontSize: '22px',
              lineHeight: '30px',
              color: '#000000',
              overflowY: 'auto', // Scroll vertical
              userSelect: 'text',
              WebkitUserSelect: 'text',
              backgroundColor: '#FFFFFF', // Fondo blanco limpio, sin líneas
              paddingTop: '16px',
            }}
          />
        </div>
      )}

      {/* Indicador de guardado */}
      {isSelected && !isMinimized && (
        <div className="absolute top-2 right-2 z-20">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      )}
    </div>
  );
}
