'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import type { CommonElementProps, TimeListItem, TimeListContent } from '@/lib/types';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GripVertical,
  Plus,
  Paintbrush,
  MoreVertical,
  Download,
  Copy,
  X,
  Camera,
  Clock,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';
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

// Referencias globales para alarma persistente
let alarmIntervalRef: NodeJS.Timeout | null = null;
let alarmOscillatorRef: OscillatorNode | null = null;
let activeAlarmTaskId: string | null = null;

// Función para iniciar alarma persistente
const startPersistentAlarm = (taskId: string) => {
  // Detener cualquier alarma previa
  stopPersistentAlarm();
  
  activeAlarmTaskId = taskId;
  
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 900; // Frecuencia tipo despertador
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      alarmOscillatorRef = oscillator;
    } catch (error) {
      console.error('Error al reproducir beep:', error);
    }
  };
  
  // Reproducir inmediatamente
  playBeep();
  
  // Repetir cada segundo
  alarmIntervalRef = setInterval(() => {
    playBeep();
  }, 1000);
};

// Función para detener alarma persistente
const stopPersistentAlarm = () => {
  if (alarmIntervalRef) {
    clearInterval(alarmIntervalRef);
    alarmIntervalRef = null;
  }
  if (alarmOscillatorRef) {
    try {
      alarmOscillatorRef.stop();
    } catch (e) {
      // Ignorar errores si ya está detenido
    }
    alarmOscillatorRef = null;
  }
  activeAlarmTaskId = null;
};

// Función para alertas de voz
const speakTimeRemaining = (minutes: number) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancelar cualquier voz anterior
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  utterance.lang = 'es-ES';
  
  // Buscar voz femenina, tranquila, acento neutro
  const voices = window.speechSynthesis.getVoices();
  const femaleNeutral = voices.find(v => 
    v.lang.startsWith('es') && 
    (/female|mujer|woman|femenina/i.test(v.name) || v.name.includes('Google') || v.name.includes('Microsoft'))
  );
  
  if (femaleNeutral) {
    utterance.voice = femaleNeutral;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  
  window.speechSynthesis.speak(utterance);
};

// Función para voz final "Terminaste"
const speakFinishedMessage = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancelar cualquier voz anterior
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance('Terminaste. Todas tus tareas con temporizador han sido completadas.');
  utterance.lang = 'es-ES';
  
  // Buscar voz femenina, tranquila, acento neutro
  const voices = window.speechSynthesis.getVoices();
  const femaleNeutral = voices.find(v => 
    v.lang.startsWith('es') && 
    (/female|mujer|woman|femenina/i.test(v.name) || v.name.includes('Google') || v.name.includes('Microsoft'))
  );
  
  if (femaleNeutral) {
    utterance.voice = femaleNeutral;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  
  window.speechSynthesis.speak(utterance);
};

// Función para formatear timer analógico
const formatTimerDisplay = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function TimeListElement(props: CommonElementProps) {
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
    finalTranscript,
    isListening,
  } = props;

  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTranscriptRef = useRef<string>('');

  // Dictation binding
  const { bindDictationTarget } = useDictationBinding({
    isListening: isListening || false,
    finalTranscript: finalTranscript || '',
    interimTranscript: '',
    isSelected: isSelected || false,
  });

  // Hook para pegar texto plano
  const { handlePaste } = usePastePlainText();

  // Conectar dictation a los inputs cuando están enfocados
  const handleInputFocus = useCallback((element: HTMLElement) => {
    if (isSelected) {
      bindDictationTarget(element);
    }
  }, [isSelected, bindDictationTarget]);

  const [newItemText, setNewItemText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [timerPopoverOpen, setTimerPopoverOpen] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const newItemRef = useRef<HTMLTextAreaElement>(null);
  const itemTextareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const backgroundColor = safeProperties.backgroundColor || '#ffffff';
  const fontSize = safeProperties.fontSize || '14px';
  
  // Type guard para TimeListContent
  const timeListContent: TimeListContent = (typeof content === 'object' && content !== null && 'items' in content)
    ? content as TimeListContent
    : { title: 'Time List', items: [] };
  const { title, items } = timeListContent;

  // Hook de autoguardado (debe estar antes de updateItem que lo usa)
  const { saveStatus, handleChange: handleAutoSaveChange } = useAutoSave({
    getContent: () => timeListContent,
    onSave: async (newContent) => {
      const currentSerialized = JSON.stringify(timeListContent);
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

  const COPIED_KEY = 'micerebro-copied-element';

  // Función para actualizar un item específico
  const updateItem = useCallback((index: number, updates: Partial<TimeListItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
  }, [items, timeListContent, onUpdate, id, handleAutoSaveChange]);

  // Ref con la versión más reciente de items y updateItem (para usar dentro de setInterval sin closures obsoletos)
  const itemsRef = useRef<TimeListItem[]>(items);
  const updateItemRef = useRef<(index: number, updates: Partial<TimeListItem>) => void>(() => {});
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    updateItemRef.current = updateItem;
  }, [updateItem]);

  // Función para iniciar timer de un item (escritura directa al store)
  const startTimer = useCallback((index: number) => {
    const currentItems = (itemsRef.current?.length ? itemsRef.current : items) as TimeListItem[];
    const item = currentItems[index];
    if (!item) return;
    const mins = item.timerMinutes && item.timerMinutes > 0 ? item.timerMinutes : 5;
    const seconds = item.timerSeconds && item.timerSeconds > 0 ? item.timerSeconds : mins * 60;

    const newItems = [...currentItems];
    newItems[index] = {
      ...newItems[index],
      timerMinutes: mins,
      timerSeconds: seconds,
      timerRunning: true,
      timerFinished: false,
      waitingForReadyWord: false,
      lastAnnouncedMinutes: undefined,
    };
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
  }, [items, timeListContent, onUpdate, id, handleAutoSaveChange]);

  // Iniciar timers desde la primera tarea (botón Play del header)
  const handleStartFirstTimer = useCallback(() => {
    if (!items.length) {
      toast({ title: 'Agrega tareas a la lista primero', variant: 'destructive' });
      return;
    }

    const newItems = [...items];
    let idx = newItems.findIndex(
      (item) =>
        (item.timerMinutes != null && item.timerMinutes > 0) &&
        !item.timerRunning &&
        !item.timerFinished &&
        !item.completed
    );
    if (idx === -1) {
      idx = newItems.findIndex((item) => !item.completed);
    }
    if (idx === -1) {
      toast({ title: 'Todas las tareas están completadas', variant: 'destructive' });
      return;
    }

    const mins = (newItems[idx].timerMinutes && newItems[idx].timerMinutes! > 0)
      ? newItems[idx].timerMinutes!
      : 5;
    const secs = newItems[idx].timerSeconds && newItems[idx].timerSeconds! > 0
      ? newItems[idx].timerSeconds!
      : mins * 60;

    newItems[idx] = {
      ...newItems[idx],
      timerMinutes: mins,
      timerSeconds: secs,
      timerRunning: true,
      timerFinished: false,
      waitingForReadyWord: false,
      lastAnnouncedMinutes: undefined,
    };
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
    itemsRef.current = newItems;
    toast({ title: `Timer iniciado: ${mins} min` });
  }, [items, timeListContent, onUpdate, id, handleAutoSaveChange, toast]);

  // Función para pausar timer de un item
  const pauseTimer = useCallback((index: number) => {
    updateItem(index, { timerRunning: false });
  }, [updateItem]);

  // Función para resetear timer de un item
  const resetTimer = useCallback((index: number) => {
    const item = items[index];
    if (!item.timerMinutes) return;

    updateItem(index, {
      timerSeconds: item.timerMinutes * 60,
      timerRunning: false,
      timerFinished: false,
      waitingForReadyWord: false,
      lastAnnouncedMinutes: undefined,
    });
  }, [items, updateItem]);

  // Función para configurar timer de un item
  const setTimerMinutes = useCallback((index: number, minutes: number) => {
    updateItem(index, {
      timerMinutes: minutes,
      timerSeconds: minutes * 60,
      timerRunning: false,
      timerFinished: false,
      waitingForReadyWord: false,
      lastAnnouncedMinutes: undefined,
    });
  }, [updateItem]);

  // Lógica de countdown para todos los timers activos
  useEffect(() => {
    const activeTimers = items.filter((item) => item.timerRunning && item.timerSeconds !== undefined && item.timerSeconds > 0);
    
    if (activeTimers.length === 0) {
      // Limpiar todos los intervalos si no hay timers activos
      timerIntervalsRef.current.forEach(interval => clearInterval(interval));
      timerIntervalsRef.current.clear();
      return;
    }

    // Crear/actualizar intervalos para cada timer activo
    activeTimers.forEach((item) => {
      const itemIndex = items.findIndex(i => i.id === item.id);
      if (itemIndex === -1) return;

      // Si ya existe un intervalo para este item, no crear otro
      if (timerIntervalsRef.current.has(item.id)) return;

      const interval = setInterval(() => {
        // Usar itemsRef para obtener el estado más reciente
        const currentItems = itemsRef.current;
        const currentItem = currentItems.find(i => i.id === item.id);
        const currentItemIndex = currentItems.findIndex(i => i.id === item.id);
        
        if (!currentItem || !currentItem.timerRunning || currentItem.timerSeconds === undefined || currentItemIndex === -1) {
          clearInterval(interval);
          timerIntervalsRef.current.delete(item.id);
          return;
        }

        const newSeconds = currentItem.timerSeconds - 1;
        const newMinutes = Math.floor(newSeconds / 60);
        const doUpdate = updateItemRef.current;

        // Verificar alertas de voz
        const lastAnnounced = currentItem.lastAnnouncedMinutes;
        if (newMinutes !== lastAnnounced) {
          if (newMinutes === 30 || newMinutes === 10 || newMinutes === 3 || newMinutes === 1) {
            speakTimeRemaining(newMinutes);
            doUpdate(currentItemIndex, { lastAnnouncedMinutes: newMinutes });
          }
        }

        if (newSeconds <= 0) {
          // Timer terminó
          clearInterval(interval);
          timerIntervalsRef.current.delete(item.id);
          doUpdate(currentItemIndex, {
            timerSeconds: 0,
            timerRunning: false,
            timerFinished: true,
            waitingForReadyWord: true,
          });
          // Iniciar alarma persistente
          startPersistentAlarm(item.id);
        } else {
          doUpdate(currentItemIndex, { timerSeconds: newSeconds });
        }
      }, 1000);

      timerIntervalsRef.current.set(item.id, interval);
    });

    // Limpiar intervalos de items que ya no están activos
    timerIntervalsRef.current.forEach((interval, itemId) => {
      const item = items.find(i => i.id === itemId);
      if (!item || !item.timerRunning) {
        clearInterval(interval);
        timerIntervalsRef.current.delete(itemId);
      }
    });

    return () => {
      // Cleanup: limpiar todos los intervalos al desmontar
      timerIntervalsRef.current.forEach(interval => clearInterval(interval));
      timerIntervalsRef.current.clear();
    };
  }, [items, updateItem]);

  // Detección de comando "listo" y "timer X minutos"
  useEffect(() => {
    if (!finalTranscript || !isSelected) {
      lastTranscriptRef.current = finalTranscript || '';
      return;
    }

    // Buscar comando "listo" en todo el transcript (no solo en el nuevo texto)
    // para asegurar que se detecte incluso si el usuario dice "listo" varias veces
    const readyMatch = finalTranscript.toLowerCase().match(/\blisto\b/);
    if (readyMatch && readyMatch.index !== undefined) {
      // Solo procesar si no hemos procesado este "listo" antes
      const processedReadyIndex = finalTranscript.toLowerCase().lastIndexOf('listo');
      const lastProcessedIndex = (lastTranscriptRef.current || '').toLowerCase().lastIndexOf('listo');
      
      if (processedReadyIndex > lastProcessedIndex) {
        // Buscar tarea con waitingForReadyWord === true
        const waitingIndex = items.findIndex(item => item.waitingForReadyWord === true);
        if (waitingIndex !== -1) {
          // Detener alarma
          stopPersistentAlarm();

          // Marcar tarea como completada
          updateItem(waitingIndex, {
            completed: true,
            waitingForReadyWord: false,
            timerFinished: false,
          });

          // Buscar siguiente tarea con timer pendiente
          const nextTimerIndex = items.findIndex((item, idx) => 
            idx > waitingIndex && 
            item.timerMinutes !== undefined && 
            !item.completed
          );

          if (nextTimerIndex !== -1) {
            // Iniciar timer de siguiente tarea
            startTimer(nextTimerIndex);
            toast({ title: `Timer iniciado para: ${items[nextTimerIndex].text.substring(0, 30)}...` });
          } else {
            // No hay más tareas con timer, marcar todas como completadas y reproducir voz final
            const allWithTimers = items.filter(item => item.timerMinutes !== undefined && !item.completed);
            if (allWithTimers.length > 0) {
              const newItems = items.map(item => 
                item.timerMinutes !== undefined && !item.completed ? { ...item, completed: true } : item
              );
              const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
              onUpdate(id, { content: updatedContent });
              handleAutoSaveChange();
              speakFinishedMessage();
            }
          }
        }
      }
    }

    // Detectar comando "timer X minutos" en el textarea activo
    // Buscar en todo el transcript final y en el valor del textarea
    const activeElement = document.activeElement;
    if (activeElement && (activeElement instanceof HTMLTextAreaElement) && finalTranscript) {
      let targetIndex = -1;
      itemTextareaRefs.current.forEach((textarea, idx) => {
        if (textarea === activeElement) targetIndex = idx;
      });
      const isNewTaskInput = newItemRef.current === activeElement;
      const isComponentTextarea = targetIndex !== -1 || isNewTaskInput;

      if (isComponentTextarea) {
        const timerMatch = finalTranscript.match(/(?:^|\s)(?:timer|Timer)\s+(\d+)\s+minutos?/i);
        const newText = finalTranscript.slice(lastTranscriptRef.current.length);
        const hasNewCommand = newText && newText.match(/(?:^|\s)(?:timer|Timer)\s+(\d+)\s+minutos?/i);
        const textareaValue = activeElement.value || '';
        const valueMatch = textareaValue.match(/(?:^|\s)(?:timer|Timer)\s+(\d+)\s+minutos?/i);

        if ((timerMatch || valueMatch) && hasNewCommand) {
          const minutes = parseInt((timerMatch || valueMatch)?.[1] || '0', 10);
          if (minutes > 0 && minutes <= 120) {
            if (isNewTaskInput) {
              (activeElement as any).pendingTimerMinutes = minutes;
              toast({ title: `Timer de ${minutes} minutos configurado. Agrega la tarea para activarlo.` });
            } else if (targetIndex !== -1) {
              setTimerMinutes(targetIndex, minutes);
              toast({ title: `Timer de ${minutes} minutos configurado` });
            }
          }
        }
      }
    }

    lastTranscriptRef.current = finalTranscript;
  }, [finalTranscript, isSelected, items, updateItem, setTimerMinutes, startTimer, onUpdate, id, timeListContent, handleAutoSaveChange, toast]);

  const handleToggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], completed: !newItems[index].completed };
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
  };

  const handleItemTextChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
  };

  const handleAddItem = () => {
    // Tomar el valor actual del textarea (incluyendo texto dictado)
    const currentText = newItemRef.current?.value || newItemText || '';
    const pendingTimerMinutes = (newItemRef.current as any)?.pendingTimerMinutes;

    if (currentText.trim() !== '' || pendingTimerMinutes) {
      // Al agregar (Enter o botón), quitar "timer X minutos" del texto guardado
      const rawText = currentText.trim();
      const cleanedText = rawText.replace(/(?:^|\s)(?:timer|Timer)\s+\d+\s+minutos?/gi, '').trim();

      const newItem: TimeListItem = {
        id: `item-${Date.now()}`,
        text: cleanedText,
        completed: false,
      };

      if (pendingTimerMinutes) {
        newItem.timerMinutes = pendingTimerMinutes;
        newItem.timerSeconds = pendingTimerMinutes * 60;
        delete (newItemRef.current as any)?.pendingTimerMinutes;
      }

      const newItems = [...items, newItem];
      const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
      onUpdate(id, { content: updatedContent });
      setNewItemText('');
      if (newItemRef.current) {
        newItemRef.current.value = '';
      }
      handleAutoSaveChange();
    }
  };

  const handleDeleteItem = (index: number) => {
    const item = items[index];
    // Detener timer si está corriendo
    if (item.timerRunning && timerIntervalsRef.current.has(item.id)) {
      const interval = timerIntervalsRef.current.get(item.id);
      if (interval) {
        clearInterval(interval);
        timerIntervalsRef.current.delete(item.id);
      }
    }
    // Detener alarma si esta tarea la tiene activa
    if (activeAlarmTaskId === item.id) {
      stopPersistentAlarm();
    }

    const newItems = items.filter((_: TimeListItem, i: number) => i !== index);
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedContent: TimeListContent = { ...timeListContent, title: e.target.value };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
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
            : parseFloat(String(sizeProp.width)) || 320;

      const resolvedHeight =
        typeof sizeProp.height === 'number'
          ? sizeProp.height
          : typeof height === 'number'
            ? height
            : parseFloat(String(sizeProp.height)) || 200;

      const size = {
        width: resolvedWidth,
        height: resolvedHeight,
      };

      const payload = {
        type: 'time-list' as const,
        content: JSON.parse(JSON.stringify(timeListContent)),
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
        title: 'Time List copiada',
        description: 'Time List copiada. Ve a otro tablero y usa Pegar en Cuadernos.',
      });
    } catch (error) {
      console.error('Error al copiar Time List como elemento:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar la Time List como elemento.',
      });
    }
  };

  // Pegado de nueva tarea como texto plano
  const handlePasteNewTask = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    const plain = e.clipboardData.getData('text/plain') || '';

    const sanitized = plain
      .replace(/[\u2022\u2023\u25E6\u2043\u2219\-•▪◦]/g, ' ')
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) return;

    const target = e.currentTarget;
    const { selectionStart, selectionEnd, value } = target;

    const nextValue =
      value.slice(0, selectionStart) + sanitized + value.slice(selectionEnd);

    target.value = nextValue;
    setNewItemText(nextValue);

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
          : 200);

    if (Math.abs(contentHeight - currentHeight) < 4) return;

    const newSize = {
      width:
        (propsSize && typeof propsSize.width === 'number'
          ? propsSize.width
          : typeof width === 'number'
            ? width
            : 320),
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
      const lines = items.map((item: TimeListItem) => `• ${item.text}`);
      const text = lines.join('\n');

      await navigator.clipboard.writeText(text);
      toast({
        title: 'Time List copiada',
        description: 'La Time List se ha copiado al portapapeles como texto plano.',
      });
    } catch (error) {
      console.error('Error al copiar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar la Time List.',
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

      toast({
        title: 'Exportando...',
        description: 'Generando imagen PNG de la Time List.',
      });

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
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

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo generar la imagen.',
          });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'time-list'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportado',
          description: 'La Time List se ha exportado como PNG.',
        });
      }, 'image/png');
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo exportar la Time List.',
      });
    }
  };

  const handleClose = useCallback(() => {
    // Detener todas las alarmas y timers
    stopPersistentAlarm();
    timerIntervalsRef.current.forEach(interval => clearInterval(interval));
    timerIntervalsRef.current.clear();
    deleteElement?.(id);
  }, [deleteElement, id]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    const updatedContent: TimeListContent = { ...timeListContent, items: newItems };
    onUpdate(id, { content: updatedContent });
    handleAutoSaveChange();
  };

  const handleExportCapture = useCallback(async () => {
    try {
      const listElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!listElement) {
        console.error('No se pudo encontrar el elemento de la Time List');
        return;
      }

      setIsCapturing(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(listElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: backgroundColor,
        includeQueryParams: false,
        skipFonts: true,
        width: listElement.scrollWidth,
        height: listElement.scrollHeight,
      });

      setIsCapturing(false);

      const link = document.createElement('a');
      const listTitle = title || 'time-list';
      link.download = `${listTitle}_captura.png`;
      link.href = dataUrl;
      link.click();
    } catch (error: any) {
      setIsCapturing(false);
      console.error('Error en captura de la Time List:', error);
    }
  }, [id, title, backgroundColor]);

  // Cargar voces de speechSynthesis al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Forzar carga de voces (algunos navegadores las cargan lazy)
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      // Algunos navegadores cargan voces de forma asíncrona
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopPersistentAlarm();
      timerIntervalsRef.current.forEach(interval => clearInterval(interval));
      timerIntervalsRef.current.clear();
    };
  }, []);

  return (
    <Card
      ref={cardRef}
      className={cn(
        'flex flex-col relative group overflow-visible',
        'rounded-lg shadow-md border border-gray-300',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{
        backgroundColor: '#ffffff',
        width: width || '100%',
        height: 'auto',
        minWidth: '200px',
        minHeight: '150px',
        maxHeight: 'none',
      }}
      onClick={() => onEditElement(id)}
    >
      <div className="w-full flex flex-col" style={{ minHeight: 'inherit' }}>
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        <SaveStatusIndicator status={saveStatus} size="sm" />
      </div>
      {/* HEADER */}
      <CardHeader
        className="p-3 pb-2 border-b border-gray-200/50"
        style={{ backgroundColor }}
      >
        <div className="flex items-center justify-between gap-1">
          {/* Izquierda: Drag Handle + Título */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div className="drag-handle cursor-grab active:cursor-grabbing flex-shrink-0 opacity-30">
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
              placeholder="Time List..."
              onClick={(e) => { e.stopPropagation(); onEditElement(id); }}
              onFocusCapture={() => onEditElement(id)}
            />
          </div>

          {/* Derecha: Botones de Acción */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Botón Play - Iniciar timers desde la primera tarea */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); handleStartFirstTimer(); }}
              title="Iniciar timers (desde la primera tarea)"
            >
              <Play className="h-3 w-3" />
            </Button>
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
                  title="Más opciones"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="text-sm">
                <DropdownMenuItem
                  onClick={handleCopyAsElement}
                  className="text-sm"
                >
                  <Copy className="mr-2 h-3 w-3" />
                  <span>Copiar Time List (entre tableros)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyAsText} className="text-sm">
                  <Copy className="mr-2 h-3 w-3" />
                  <span>Copiar como texto</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing} className="text-sm">
                  <Camera className="mr-2 h-3 w-3" />
                  <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPNG} className="text-sm">
                  <Download className="mr-2 h-3 w-3" />
                  <span>Exportar a PNG</span>
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
              title="Cerrar Time List"
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
                  items.map((item: TimeListItem, index: number) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            'flex items-start gap-1 p-1 rounded transition-colors group/item min-h-[32px]',
                            snapshot.isDragging ? 'bg-blue-100 shadow-md border border-blue-300' : 'hover:bg-gray-50/50',
                            isSelected && 'hover:bg-gray-50',
                            item.waitingForReadyWord && 'bg-red-50 border border-red-200 animate-pulse'
                          )}
                        >
                          {/* Handler + Checkbox a la izquierda */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-0.5 opacity-50 hover:opacity-100 flex-shrink-0 flex flex-col items-center justify-end"
                          >
                            <GripVertical className="h-3 w-3 text-gray-400" />
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleToggleItem(index)}
                              className="flex-shrink-0 h-3 w-3 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Textarea de Texto - ocupa el espacio central */}
                          <textarea
                            ref={(el) => {
                              if (el) {
                                itemTextareaRefs.current.set(index, el);
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                            value={item.text}
                            onChange={(e) => {
                              handleItemTextChange(index, e.target.value);
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            onPaste={handlePaste}
                            onInput={(e) => {
                              const target = e.currentTarget as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            className={cn(
                              'flex-1 min-w-0 border-none shadow-none focus:outline-none focus:ring-0 p-1 bg-transparent resize-none leading-snug overflow-hidden',
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
                              handleInputFocus(e.target as HTMLElement);
                            }}
                          />

                          {/* Timer y controles */}
                          <div className="flex flex-col items-center justify-end flex-shrink-0">
                            <Popover open={timerPopoverOpen === index} onOpenChange={(open) => setTimerPopoverOpen(open ? index : null)}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-8 w-16 p-0 flex items-center justify-center rounded-md",
                                        item.timerRunning && !item.timerFinished && 'text-teal-600 bg-teal-50',
                                        item.timerFinished && 'text-red-500 bg-red-50 animate-pulse',
                                        !item.timerRunning && !item.timerFinished && item.timerMinutes != null && 'text-teal-500 bg-teal-50/50 opacity-70',
                                      )}
                                      style={{
                                        fontFamily: "'Courier New', 'SF Mono', monospace",
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTimerPopoverOpen(timerPopoverOpen === index ? null : index);
                                      }}
                                    >
                                      {item.timerRunning || item.timerFinished ? (
                                        <span
                                          className="text-lg font-bold leading-none"
                                          style={{ color: item.timerFinished ? '#ef4444' : '#14b8a6' }}
                                        >
                                          {formatTimerDisplay(item.timerSeconds || item.timerMinutes * 60)}
                                        </span>
                                      ) : (
                                        <Clock className="h-4 w-4 text-teal-600" />
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {item.timerMinutes != null
                                    ? item.timerRunning
                                      ? `Timer: ${formatTimerDisplay(item.timerSeconds ?? item.timerMinutes * 60)}`
                                      : item.timerFinished
                                        ? 'Timer terminado. Clic para resetear o configurar.'
                                        : `${item.timerMinutes} ${item.timerMinutes === 1 ? 'minuto' : 'minutos'} - Usa el botón Play del header`
                                    : 'Configurar timer'}
                                </TooltipContent>
                              </Tooltip>
                              <PopoverContent
                                onClick={(e) => e.stopPropagation()}
                                className="w-64 p-3 border border-gray-200 bg-white shadow-lg rounded-md"
                                align="start"
                              >
                                <div className="space-y-3">
                                  <div className="text-sm font-semibold">Configurar Timer</div>
                                  
                                  {item.timerMinutes ? (
                                    <>
                                      <div className="text-xs text-gray-600">
                                        Tiempo restante: {formatTimerDisplay(item.timerSeconds || item.timerMinutes * 60)}
                                      </div>
                                      <div className="flex gap-2">
                                        {item.timerRunning ? (
                                          <Button size="sm" onClick={() => pauseTimer(index)} className="flex-1">
                                            <Pause className="h-3 w-3 mr-1" />
                                            Pausar
                                          </Button>
                                        ) : null}
                                        <Button size="sm" variant="outline" onClick={() => resetTimer(index)}>
                                          <RotateCcw className="h-3 w-3" />
                                          Resetear
                                        </Button>
                                      </div>
                                    </>
                                  ) : null}

                                  <div className="space-y-2">
                                    <div className="text-xs font-medium">Presets rápidos:</div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[5, 10, 15, 25, 30, 60].map((mins) => (
                                        <Button
                                          key={mins}
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setTimerMinutes(index, mins);
                                            setTimerPopoverOpen(null);
                                          }}
                                          className="text-xs"
                                        >
                                          {mins}m
                                        </Button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="text-xs font-medium">Minutos personalizados:</div>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={120}
                                      placeholder="Minutos (1-120)"
                                      defaultValue={item.timerMinutes || ''}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const value = parseInt(e.currentTarget.value, 10);
                                          if (value > 0 && value <= 120) {
                                            setTimerMinutes(index, value);
                                            setTimerPopoverOpen(null);
                                          }
                                        }
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            {isSelected && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(index);
                                }}
                                className="h-4 w-4 mt-0.5 opacity-0 group-hover/item:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <X className="h-2.5 w-2.5 text-gray-400" />
                              </Button>
                            )}
                          </div>

                          {/* Indicador cuando timer terminó */}
                          {item.waitingForReadyWord && (
                            <div className="text-xs text-red-600 font-semibold flex items-center gap-1 flex-shrink-0">
                              listo
                            </div>
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
            ref={(el) => {
              if (el) {
                newItemRef.current = el;
                handleInputFocus(el);
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            rows={1}
            defaultValue={newItemText}
            onChange={(e) => {
              setNewItemText(e.target.value);
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            onPaste={handlePasteNewTask}
            onInput={(e) => {
              const currentValue = e.currentTarget.value;
              setNewItemText(currentValue);
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
            placeholder="Agregar tarea... (di 'Timer X minutos' para configurar timer)"
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
