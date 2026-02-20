'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import type { CommonElementProps, TodoItem, TodoContent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  GripVertical,
  Plus,
  Paintbrush,
  MoreVertical,
  Download,
  Copy,
  X,
  FileText,
  Camera,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';

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

export default function TodoListElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    onEditElement,
    isSelected,
    onLocateElement,
    onEditComment,
    width,
    height,
    isListening = false,
    finalTranscript = '',
    interimTranscript = '',
    liveTranscript = '',
  } = props;

  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Hook para pegar texto plano
  const { handlePaste } = usePastePlainText();

  const [newItemText, setNewItemText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const newItemRef = useRef<HTMLTextAreaElement>(null);

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const backgroundColor = safeProperties.backgroundColor || '#ffffff';
  const fontSize = safeProperties.fontSize || '14px';
  
  // Type guard para TodoContent
  const todoContent: TodoContent = (typeof content === 'object' && content !== null && 'items' in content)
    ? content as TodoContent
    : { title: 'Lista de Tareas', items: [] };
  const { title, items } = todoContent;

  // Hook de autoguardado robusto para la lista de tareas
  const { saveStatus, handleChange: handleAutoSaveChange } = useAutoSave({
    getContent: () => todoContent,
    onSave: async (newContent) => {
      // Comparar serializando para detectar cambios profundos
      const currentSerialized = JSON.stringify(todoContent);
      const newSerialized = JSON.stringify(newContent);
      if (currentSerialized !== newSerialized) {
        onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 4000,
    compareContent: (oldContent, newContent) => {
      return JSON.stringify(oldContent) === JSON.stringify(newContent);
    },
  });

  const COPIED_KEY = 'micerebro-copied-element';

  // Dictation binding para el input de nueva tarea

  const handleToggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], completed: !newItems[index].completed };
    const updatedContent: TodoContent = { ...todoContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange(); // Programar auto-save
  };

  const handleItemTextChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    const updatedContent: TodoContent = { ...todoContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange(); // Programar auto-save
  };

  const handleAddItem = () => {
    // Tomar el valor actual del textarea (incluyendo texto dictado)
    const currentText = newItemRef.current?.value || newItemText || '';

    if (currentText.trim() !== '') {
      const newItems = [...items, { id: `item-${Date.now()}`, text: currentText.trim(), completed: false }];
      const updatedContent: TodoContent = { ...todoContent, items: newItems };
      onUpdate(id, { content: updatedContent });
      setNewItemText('');
      // Limpiar el textarea también
      if (newItemRef.current) {
        newItemRef.current.value = '';
      }
      handleAutoSaveChange(); // Programar auto-save
    }
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_: TodoItem, i: number) => i !== index);
    const updatedContent: TodoContent = { ...todoContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange(); // Programar auto-save
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedContent: TodoContent = { ...todoContent, title: e.target.value };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange(); // Programar auto-save
  };

  const handleLabelChange = (value: string) => {
    const updatedContent: TodoContent = { ...todoContent, label: value };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange(); // Programar auto-save
  };

  // Copiar la lista como elemento para pegarla en otros tableros
  const handleCopyAsElement = () => {
    try {
      const props = safeProperties;
      const sizeProp = (props as any).size || {};

      const resolvedWidth =
        typeof sizeProp.width === 'number'
          ? sizeProp.width
          : typeof width === 'number'
            ? width
            : parseFloat(String(sizeProp.width)) || 260;

      const resolvedHeight =
        typeof sizeProp.height === 'number'
          ? sizeProp.height
          : typeof height === 'number'
            ? height
            : parseFloat(String(sizeProp.height)) || 150;

      const size = {
        width: resolvedWidth,
        height: resolvedHeight,
      };

      const payload = {
        type: 'todo' as const,
        content: JSON.parse(JSON.stringify(todoContent)),
        width: resolvedWidth,
        height: resolvedHeight,
        properties: JSON.parse(
          JSON.stringify({
            ...props,
            size,
          })
        ),
      };

      localStorage.setItem(COPIED_KEY, JSON.stringify(payload));

      toast({
        title: 'Lista copiada',
        description: 'Lista copiada. Ve a otro tablero y usa Pegar en Cuadernos.',
      });
    } catch (error) {
      console.error('Error al copiar lista como elemento:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar la lista como elemento.',
      });
    }
  };

  // Pegado de nueva tarea como texto plano, sin formato y sin bullets
  const handlePasteNewTask = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    const plain = e.clipboardData.getData('text/plain') || '';

    const sanitized = plain
      // Quitar bullets comunes (•, -, etc.)
      .replace(/[\u2022\u2023\u25E6\u2043\u2219\-•▪◦]/g, ' ')
      // Convertir saltos de línea a espacios
      .replace(/\r\n|\r|\n/g, ' ')
      // Compactar espacios
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) return;

    const target = e.currentTarget;
    const { selectionStart, selectionEnd, value } = target;

    const nextValue =
      value.slice(0, selectionStart) + sanitized + value.slice(selectionEnd);

    target.value = nextValue;
    setNewItemText(nextValue);

    // Auto-ajustar altura del textarea
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  // Ajustar automáticamente la altura del contenedor cuando cambian los ítems
  useEffect(() => {
    if (!cardRef.current) return;

    const cardElement = cardRef.current;
    const contentHeight = cardElement.scrollHeight;

    const propsSize = (safeProperties as any).size;
    const currentHeight =
      (propsSize && typeof propsSize.height === 'number'
        ? propsSize.height
        : typeof height === 'number'
          ? height
          : 150);

    // Evitar actualizaciones mínimas para no crear bucles
    if (Math.abs(contentHeight - currentHeight) < 4) return;

    const newSize = {
      width:
        (propsSize && typeof propsSize.width === 'number'
          ? propsSize.width
          : typeof width === 'number'
            ? width
            : 260),
      height: contentHeight,
    };

    onUpdate(id, {
      properties: {
        ...safeProperties,
        size: newSize,
      },
    });
  }, [id, items, width, height, onUpdate, safeProperties]);

  const handleColorChange = (colorKey: { hex: string }) => {
    const selectedPalette = EXTENDED_PALETTES[colorKey.hex as keyof typeof EXTENDED_PALETTES];
    if (selectedPalette) {
      onUpdate(id, { properties: { ...safeProperties, backgroundColor: selectedPalette.bg } });
    }
  };

  const handleCopyAsText = async () => {
    try {
      // Copiar solo texto plano, una tarea por línea con bullet simple
      const lines = items.map((item: TodoItem) => `• ${item.text}`);
      const text = lines.join('\n');

      await navigator.clipboard.writeText(text);
      toast({
        title: 'Lista copiada',
        description: 'La lista se ha copiado al portapapeles como texto plano.',
      });
    } catch (error) {
      console.error('Error al copiar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar la lista.',
      });
    }
  };

  const handleExportPNG = async () => {
    try {
      if (!cardRef.current) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo capturar el elemento.',
        });
        return;
      }

      // Mostrar toast de carga
      toast({
        title: 'Exportando...',
        description: 'Generando imagen PNG de la lista.',
      });

      // Capturar el elemento usando html2canvas con configuración completa
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Alta resolución completa
        backgroundColor: backgroundColor,
        useCORS: true,
        logging: false,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight,
        width: cardRef.current.scrollWidth,
        height: cardRef.current.scrollHeight,
      });

      // Convertir canvas a blob y descargar
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo generar la imagen.',
          });
          return;
        }

        // Crear URL temporal y descargar
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'lista'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Mostrar toast de éxito
        toast({
          title: 'Exportado',
          description: 'La lista se ha exportado como PNG.',
        });
      }, 'image/png');
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo exportar la lista.',
      });
    }
  };


  const handleClose = useCallback(() => {
    deleteElement?.(id);
  }, [deleteElement, id]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    const updatedContent: TodoContent = { ...todoContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange(); // Programar auto-save después de reordenar
  };

  // Nueva función: Exportar captura usando html-to-image
  const handleExportCapture = useCallback(async () => {
    try {
      const listElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!listElement) {
        console.error('No se pudo encontrar el elemento de la lista de tareas');
        return;
      }

      console.log('Capturando lista de tareas...');
      setIsCapturing(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      const checkFontsLoaded = () => {
        return document.fonts.check('14px "Poppins", sans-serif') ||
               document.fonts.check('14px "Space Grotesk", sans-serif') ||
               document.fonts.check('14px "Patrick Hand", cursive');
      };

      let fontsReady = checkFontsLoaded();
      if (!fontsReady) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (checkFontsLoaded() || document.fonts.status === 'loaded') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 1500);
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(listElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: backgroundColor,
        includeQueryParams: false,
        skipFonts: true,
        width: listElement.scrollWidth,
        height: listElement.scrollHeight,
        filter: (element) => {
          if (element.tagName === 'LINK' && element.getAttribute('href')?.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });

      setIsCapturing(false);

      const link = document.createElement('a');
      const listTitle = title || 'lista-tareas';
      link.download = `${listTitle}_captura.png`;
      link.href = dataUrl;
      link.click();

      console.log('Captura de la lista de tareas completada');
    } catch (error: any) {
      setIsCapturing(false);
      console.error('Error en captura de la lista de tareas:', error);
      console.error('Error message:', error.message);
    }
  }, [id, title, backgroundColor]);

  return (
    <Card
      ref={cardRef}
      className={cn(
        'flex flex-col relative group overflow-visible',
        'rounded-lg shadow-md border border-gray-300',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{
        backgroundColor: '#ffffff', // Fondo blanco para el card, color solo en header
        width: width || '100%',
        height: 'auto',
        minWidth: '200px',
        minHeight: '150px',
        maxHeight: 'none',
      }}
      onClick={() => onEditElement(id)}
    >
      {/* Contenedor principal que permite altura automática */}
      <div className="w-full flex flex-col" style={{ minHeight: 'inherit' }}>
      {/* Indicador de estado de guardado */}
      <div className="absolute top-2 right-2 z-10">
        <SaveStatusIndicator status={saveStatus} size="sm" />
      </div>
      {/* HEADER */}
      <CardHeader
        className="p-3 pb-2 border-b border-gray-200/50"
        style={{ backgroundColor }} // Color solo en el header
      >
        <div className="flex items-center justify-between gap-1">
          {/* Izquierda: Drag Handle + Título */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div className="drag-handle cursor-grab active:cursor-grabbing flex-shrink-0">
              <GripVertical className="h-3 w-3 text-gray-400" />
            </div>
            <Input
              ref={(el) => {
                if (el) {
                  titleRef.current = el;
                }
              }}
              type="text"
              value={title || ''}
              onChange={handleTitleChange}
              className="font-semibold border-none shadow-none focus-visible:ring-0 p-1 bg-transparent flex-1 min-w-0"
              style={{ fontSize }}
              placeholder="Título..."
              onClick={(e) => { e.stopPropagation(); onEditElement(id); }}
              onFocusCapture={() => onEditElement(id)}
            />
            {todoContent.label && (
              <span
                className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/10 text-black/70 max-w-[80px] truncate flex-shrink-0"
                title={todoContent.label}
              >
                {todoContent.label}
              </span>
            )}
            <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  title="Agregar etiqueta"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                onClick={(e) => e.stopPropagation()}
                className="w-40 p-2 border border-gray-200 bg-white shadow-lg rounded-md"
                align="start"
              >
                <Input
                  autoFocus
                  type="text"
                  value={todoContent.label || ''}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Etiqueta..."
                  maxLength={24}
                  className="h-7 text-xs"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Derecha: Botones de Acción */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Botón Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                  title="Cambiar color del header"
                >
                  <Paintbrush className="h-3 w-3" />
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
                      onClick={() => handleColorChange({ hex: key })}
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

            {/* Menú Más Opciones */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                  title="Más opciones - Copiar, exportar o eliminar lista"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="text-sm">
                <DropdownMenuItem
                  onClick={handleCopyAsElement}
                  className="text-sm"
                  title="Copia la lista como elemento para pegarla en otros tableros desde Cuadernos"
                >
                  <Copy className="mr-2 h-3 w-3" />
                  <span>Copiar lista (entre tableros)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyAsText} className="text-sm" title="Copia la lista completa al portapapeles en formato texto">
                  <Copy className="mr-2 h-3 w-3" />
                  <span>Copiar lista como texto</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing} className="text-sm">
                  <Camera className="mr-2 h-3 w-3" />
                  <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPNG} className="text-sm" title="Exporta la lista como imagen PNG de alta resolución (reducida 30%)">
                  <Download className="mr-2 h-3 w-3" />
                  <span>Exportar a PNG: alta resolución</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botón Cerrar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              title="Cerrar lista de tareas"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* CONTENIDO: Lista de Items */}
      <CardContent className="flex-1 p-3">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={`droppable-${id}`}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0.5 min-h-full">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2 text-center">
                    No hay tareas. Agrega una nueva...
                  </p>
                ) : (
                  items.map((item: TodoItem, index: number) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            'flex items-start gap-1 p-1 rounded transition-colors group/item min-h-[32px]',
                            snapshot.isDragging ? 'bg-blue-100 shadow-md border border-blue-300' : 'hover:bg-gray-50/50',
                            isSelected && 'hover:bg-gray-50'
                          )}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-0.5 opacity-50 hover:opacity-100 flex-shrink-0"
                          >
                            <GripVertical className="h-3 w-3 text-gray-400" />
                          </div>

                          {/* Checkbox */}
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => handleToggleItem(index)}
                            className="flex-shrink-0 h-3 w-3"
                            onClick={(e) => e.stopPropagation()}
                          />

                          {/* Textarea de Texto (Compatible con Dictado) - Auto-expandible sin scroll */}
                          <textarea
                            ref={(el) => {
                              if (el) {
                                // Auto-expandir textarea
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                            data-dictation-target="true"
                            value={item.text}
                            onChange={(e) => {
                              handleItemTextChange(index, e.target.value);
                              // Auto-expandir cuando cambie el contenido
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            onPaste={handlePaste}
                            onInput={(e) => {
                              // Auto-expandir cuando cambie por dictado
                              const target = e.currentTarget as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            className={cn(
                              'flex-1 border-none shadow-none focus:outline-none focus:ring-0 p-1 bg-transparent resize-none leading-snug overflow-hidden',
                              item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                            )}
                            style={{
                              fontSize,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              minHeight: '24px',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                            placeholder="Tarea..."
                            rows={1}
                            onClick={(e) => { e.stopPropagation(); onEditElement(id); }}
                            onFocus={(e) => {
                              onEditElement(id);
                            }}
                          />

                          {/* Botón Borrar Tarea */}
                          {isSelected && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(index);
                              }}
                              className="h-5 w-5 opacity-0 group-hover/item:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <X className="h-2.5 w-2.5 text-gray-400" />
                            </Button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>

      {/* FOOTER: Agregar Nueva Tarea */}
      <CardFooter className="p-3 pt-1.5 border-t border-gray-200/50">
        <div className="flex items-start gap-1 w-full min-h-[36px]">
          <textarea
            data-dictation-target="true"
            ref={(el) => {
              if (el) {
                newItemRef.current = el;
                // Auto-expandir textarea
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            rows={1}
            defaultValue={newItemText}
            onChange={(e) => {
              setNewItemText(e.target.value);
              // Auto-expandir cuando cambie el contenido
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            onPaste={handlePasteNewTask}
            onInput={(e) => {
              // Sincronizar estado con el valor actual cuando cambie (incluyendo dictado)
              const currentValue = e.currentTarget.value;
              setNewItemText(currentValue);
              // Auto-expandir cuando cambie por dictado
              const target = e.currentTarget as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddItem();
              }
            }}
            placeholder="Agregar tarea..."
            className="flex-1 border-none shadow-none focus:outline-none focus:ring-0 p-1 bg-transparent resize-none leading-snug overflow-hidden"
            style={{
              fontSize,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '28px',
              width: '100%',
              boxSizing: 'border-box'
            }}
            onClick={(e) => { e.stopPropagation(); onEditElement(id); }}
            onFocusCapture={() => onEditElement(id)}
          />
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleAddItem();
            }}
            size="sm"
            className="flex-shrink-0 h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
      </div>
    </Card>
  );
}
