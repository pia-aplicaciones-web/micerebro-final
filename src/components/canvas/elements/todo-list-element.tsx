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
import { useDictationBinding } from '@/hooks/use-dictation-binding';

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
    onEditElement,
    isSelected,
    onLocateElement,
    onEditComment,
  } = props;

  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Dictation binding
  const { bindDictationTarget } = useDictationBinding({
    isListening: false,
    finalTranscript: '',
    interimTranscript: '',
    isSelected: isSelected || false,
  });

  // Conectar dictation a los inputs cuando están enfocados
  const handleInputFocus = useCallback((element: HTMLElement) => {
    if (isSelected) {
      bindDictationTarget(element);
    }
  }, [isSelected, bindDictationTarget]);
  const [newItemText, setNewItemText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
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
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => {
      return JSON.stringify(oldContent) === JSON.stringify(newContent);
    },
  });

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

  const handleColorChange = (colorKey: { hex: string }) => {
    const selectedPalette = EXTENDED_PALETTES[colorKey.hex as keyof typeof EXTENDED_PALETTES];
    if (selectedPalette) {
      onUpdate(id, { properties: { ...safeProperties, backgroundColor: selectedPalette.bg } });
    }
  };

  const handleCopyAsText = async () => {
    try {
      let text = `*${title || 'Lista de Tareas'}*\n\n`;

      items.forEach((item: TodoItem) => {
        if (item.completed) {
          text += `✅ ${item.text}\n`;
        } else {
          text += `⬜ ${item.text}\n`;
        }
      });

      await navigator.clipboard.writeText(text);
      toast({
        title: 'Lista copiada',
        description: 'La lista se ha copiado al portapapeles.',
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

  const handleCopyFormat = async () => {
    try {
      // Formato ordenado con estructura clara
      let formattedText = `📋 ${title || 'Lista de Tareas'}\n`;
      formattedText += `═`.repeat(50) + `\n\n`;

      if (items.length === 0) {
        formattedText += `📝 No hay tareas pendientes\n`;
      } else {
        // Separar tareas completadas y pendientes
        const pendingItems = items.filter(item => !item.completed);
        const completedItems = items.filter(item => item.completed);

        if (pendingItems.length > 0) {
          formattedText += `⏳ PENDIENTES:\n`;
          pendingItems.forEach((item, index) => {
            formattedText += `   ${index + 1}. ☐ ${item.text}\n`;
          });
          formattedText += `\n`;
        }

        if (completedItems.length > 0) {
          formattedText += `✅ COMPLETADAS:\n`;
          completedItems.forEach((item, index) => {
            formattedText += `   ${index + 1}. ✓ ${item.text}\n`;
          });
        }
      }

      formattedText += `\n═`.repeat(50);
      formattedText += `\nGenerado por Micerebro APP`;

      await navigator.clipboard.writeText(formattedText);
      toast({
        title: 'Formato copiado',
        description: 'La lista se ha copiado con formato ordenado.',
      });
    } catch (error) {
      console.error('Error al copiar formato:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar el formato.',
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

      // Capturar el elemento usando html2canvas con resolución reducida 30%
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.1, // 30% menos que 3x (solo para lista de tareas)
        backgroundColor: backgroundColor,
        useCORS: true,
        logging: false,
        allowTaint: false,
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
    onUpdate(id, { hidden: true });
  }, [onUpdate, id]);

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
        width: listElement.offsetWidth,
        height: listElement.offsetHeight,
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
        'w-full h-auto flex flex-col relative group overflow-hidden',
        'min-w-[200px] min-h-[150px] max-h-none',
        'rounded-lg shadow-md border-none',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{ backgroundColor: '#ffffff' }} // Fondo blanco para el card, color solo en header
      onClick={() => onEditElement(id)}
    >
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
                  handleInputFocus(el);
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
                <DropdownMenuItem onClick={handleCopyAsText} className="text-sm" title="Copia la lista completa al portapapeles en formato texto">
                  <Copy className="mr-2 h-3 w-3" />
                  <span>Copiar lista como texto</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyFormat} className="text-sm" title="Copia la lista con formato ordenado y estructura clara">
                  <FileText className="mr-2 h-3 w-3" />
                  <span>Copiar formato</span>
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
                            'flex items-center gap-1 p-1 rounded transition-colors group/item',
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
                            value={item.text}
                            onChange={(e) => {
                              handleItemTextChange(index, e.target.value);
                              // Auto-expandir cuando cambie el contenido
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            onInput={(e) => {
                              // Auto-expandir cuando cambie por dictado
                              const target = e.currentTarget as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            className={cn(
                              'flex-grow border-none shadow-none focus:outline-none focus:ring-0 p-1 bg-transparent resize-none leading-snug overflow-hidden',
                              item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                            )}
                            style={{
                              fontSize,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              minHeight: '24px'
                            }}
                            placeholder="Tarea..."
                            rows={1}
                            onClick={(e) => { e.stopPropagation(); onEditElement(id); }}
                            onFocus={(e) => {
                              onEditElement(id);
                              handleInputFocus(e.target as HTMLElement);
                            }}
                          />

                          {/* Botón Borrar Tarea */}
                          {isSelected && (
                            <Button
                              variant="ghost"
                              size="icon"
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
        <div className="flex items-center gap-1 w-full">
          <textarea
            ref={(el) => {
              if (el) {
                newItemRef.current = el;
                handleInputFocus(el);
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
            className="flex-grow border-none shadow-none focus:outline-none focus:ring-0 p-1 bg-transparent resize-none leading-snug overflow-hidden"
            style={{ fontSize, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '28px' }}
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
    </Card>
  );
}
