'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CommonElementProps, TimerListaContent, TimerListaItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Play, Pause, Plus, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultSpeechVoice } from '@/lib/speech-voice';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// --- Alarma persistente (módulo) ---
let alarmIntervalRef: ReturnType<typeof setInterval> | null = null;
let alarmOscillatorRef: OscillatorNode | null = null;

function startPersistentAlarm() {
  if (alarmIntervalRef) return;
  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const audioContext = new Ctx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 900;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      alarmOscillatorRef = oscillator;
    } catch {
      // ignore
    }
  };
  playBeep();
  alarmIntervalRef = setInterval(playBeep, 1000);
}

function stopPersistentAlarm() {
  if (alarmIntervalRef) {
    clearInterval(alarmIntervalRef);
    alarmIntervalRef = null;
  }
  if (alarmOscillatorRef) {
    try {
      alarmOscillatorRef.stop();
    } catch {
      // ignore
    }
    alarmOscillatorRef = null;
  }
}

function speakTimeRemaining(minutes: number) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  // Español de Latinoamérica, acento Chile
  utterance.lang = 'es-CL';
  const voices = window.speechSynthesis.getVoices();
  const paulinaVoice = voices.find((v) => v.name.toLowerCase().includes('paulina'));
  const voice = paulinaVoice || getDefaultSpeechVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  window.speechSynthesis.speak(utterance);
}

function speakFinishedMessage() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance('Bien! Terminaste la lista.');
  // Español de Latinoamérica, acento Chile
  utterance.lang = 'es-CL';
  const voices = window.speechSynthesis.getVoices();
  const paulinaVoice = voices.find((v) => v.name.toLowerCase().includes('paulina'));
  const voice = paulinaVoice || getDefaultSpeechVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  window.speechSynthesis.speak(utterance);
}

function speakTaskText(taskText: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const clean = (taskText || '').trim();
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`Tarea: ${clean}`);
  // Español de Latinoamérica, acento Chile
  utterance.lang = 'es-CL';
  const voices = window.speechSynthesis.getVoices();
  const paulinaVoice = voices.find((v) => v.name.toLowerCase().includes('paulina'));
  const voice = paulinaVoice || getDefaultSpeechVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;
  window.speechSynthesis.speak(utterance);
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatHoursMinutes(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const min = Math.round(totalMinutes % 60);
  if (hrs === 0) return `${min} min`;
  if (min === 0) return `${hrs} hr`;
  return `${hrs} hr ${min} min`;
}

function getDefaultContent(content: unknown): TimerListaContent {
  if (typeof content === 'object' && content !== null && 'items' in content) {
    const c = content as Record<string, unknown>;
    const items = Array.isArray(c.items)
      ? (c.items as TimerListaItem[]).filter(
          (it) => it && typeof it === 'object' && 'id' in it && 'text' in it
        )
      : [];
    return {
      title: typeof c.title === 'string' ? c.title : 'Timer Lista',
      items: items.map((it) => ({
        id: typeof it.id === 'string' ? it.id : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: typeof it.text === 'string' ? it.text : '',
        completed: typeof it.completed === 'boolean' ? it.completed : false,
        minutes: typeof it.minutes === 'number' && it.minutes >= 1 && it.minutes <= 120 ? it.minutes : 5,
      })),
    };
  }
  return { title: 'Timer Lista', items: [] };
}

export default function TimerListaElement(props: CommonElementProps) {
  const { id, content, onUpdate, deleteElement, isSelected, onSelectElement, width, height, finalTranscript, liveTranscript, interimTranscript, isListening, onRequestStartDictation, onStopDictation } = props;
  const { toast } = useToast();

  const timerListContent = getDefaultContent(content);
  const { title, items } = timerListContent;

  const [runningTaskIndex, setRunningTaskIndex] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [waitingForListoIndex, setWaitingForListoIndex] = useState<number | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [pendingTimerMinutes, setPendingTimerMinutes] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsLeftRef = useRef(0);
  const runningTaskIndexRef = useRef<number | null>(null);
  const lastAnnouncedMinutesRef = useRef<number | null>(null);
  const contentRef = useRef(timerListContent);
  const onUpdateRef = useRef(onUpdate);
  const idRef = useRef(id);
  const lastTranscriptRef = useRef('');
  const lastAppliedTimerRef = useRef<{ target: string; minutes: number } | null>(null);
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
  const taskInputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const lastAnnouncedTaskIdRef = useRef<string | null>(null);

  contentRef.current = timerListContent;
  onUpdateRef.current = onUpdate;
  idRef.current = id;
  secondsLeftRef.current = secondsLeft;
  runningTaskIndexRef.current = runningTaskIndex;

  // Cargar voces al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const load = () => window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = load;
      }
      return () => {
        stopPersistentAlarm();
      };
    }
  }, []);

  useEffect(() => {
    if (runningTaskIndex === null || runningTaskIndex < 0) return;
    const itemsList = contentRef.current.items;
    if (runningTaskIndex >= itemsList.length) {
      setRunningTaskIndex(null);
      return;
    }
    const totalSeconds = itemsList[runningTaskIndex].minutes * 60;
    secondsLeftRef.current = totalSeconds;
    setSecondsLeft(totalSeconds);
    lastAnnouncedMinutesRef.current = Math.floor(totalSeconds / 60);

    intervalRef.current = setInterval(() => {
      const sec = secondsLeftRef.current - 1;
      secondsLeftRef.current = sec;
      setSecondsLeft(sec);

      if ([1800, 600, 180, 60].includes(sec)) {
        const m = sec / 60;
        if (lastAnnouncedMinutesRef.current !== m) {
          lastAnnouncedMinutesRef.current = m;
          speakTimeRemaining(m);
        }
      }

      if (sec <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        const idx = runningTaskIndexRef.current;
        if (idx === null || idx < 0) return;
        setRunningTaskIndex(null);
        setWaitingForListoIndex(idx);
        startPersistentAlarm();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Solo dependencia de runningTaskIndex; toast no se usa en el interval (evita re-ejecuciones si toast cambia)
  }, [runningTaskIndex]);

  // Voz automática: cuando inicia una tarea (play o siguiente), leer su texto.
  useEffect(() => {
    if (runningTaskIndex === null || runningTaskIndex < 0) return;
    const current = items[runningTaskIndex];
    if (!current) return;
    if (lastAnnouncedTaskIdRef.current === current.id) return;
    lastAnnouncedTaskIdRef.current = current.id;
    speakTaskText(current.text || '');
  }, [runningTaskIndex, items]);

  // Activar micrófono automáticamente cuando está esperando "listo"
  useEffect(() => {
    if (waitingForListoIndex !== null && onRequestStartDictation) {
      onRequestStartDictation();
    }
  }, [waitingForListoIndex, onRequestStartDictation]);

  // Comando "listo" por voz: cuando está seleccionado O cuando estamos esperando "listo" (alarma sonando)
  useEffect(() => {
    if (!finalTranscript) {
      lastTranscriptRef.current = finalTranscript || '';
      return;
    }
    const canReactToListo = isSelected || waitingForListoIndex !== null;
    if (canReactToListo) {
      const transcriptLower = finalTranscript.toLowerCase().trim();
      const readyMatch = transcriptLower.match(/\blisto\b/);
      if (readyMatch) {
        const lastIdx = transcriptLower.lastIndexOf('listo');
        const prevIdx = (lastTranscriptRef.current || '').toLowerCase().trim().lastIndexOf('listo');
        if (lastIdx > prevIdx && waitingForListoIndex !== null) {
        stopPersistentAlarm();
        const list = contentRef.current;
        const newItems = list.items.map((it, i) => (i === waitingForListoIndex ? { ...it, completed: true } : it));
        onUpdateRef.current(idRef.current, { content: { ...list, items: newItems } });
        const next = newItems.findIndex((it) => !it.completed);
        setWaitingForListoIndex(null);
        onStopDictation?.(); // Apagar micrófono tras decir "listo"
        if (next >= 0) {
          const nextTotal = newItems[next].minutes * 60;
          secondsLeftRef.current = nextTotal;
          setSecondsLeft(nextTotal);
          setRunningTaskIndex(next);
          toast({ title: 'Siguiente', description: `${newItems[next].text?.slice(0, 30) || 'Tarea'}...` });
        } else {
          setSecondsLeft(0);
          speakFinishedMessage();
          toast({ title: 'Listo', description: 'Todas las tareas han terminado.' });
        }
        }
      }
    }

    // Dictado "timer X minutos": funciona con foco en el input o con elemento seleccionado
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const isNewTask = newTaskInputRef.current === active;
    const taskIndex = taskInputRefs.current.findIndex((el) => el === active);
    const timerMatch = finalTranscript.match(/(?:^|\s)(?:timer|timer)\s+(\d+)\s+minutos?/i);
    if (timerMatch) {
      const minutes = Math.max(1, Math.min(120, parseInt(timerMatch[1] || '5', 10)));
      const targetKey = taskIndex >= 0 ? `task-${taskIndex}` : 'new';
      const alreadyApplied = lastAppliedTimerRef.current?.target === targetKey && lastAppliedTimerRef.current?.minutes === minutes;
      if (!alreadyApplied && (isNewTask || taskIndex >= 0 || isSelected)) {
        lastAppliedTimerRef.current = { target: targetKey, minutes };
        if (taskIndex >= 0) {
          const newItems = [...contentRef.current.items];
          newItems[taskIndex] = { ...newItems[taskIndex], minutes };
          onUpdateRef.current(idRef.current, { content: { ...contentRef.current, items: newItems } });
          toast({ title: `Timer ${minutes} min` });
        } else {
          setPendingTimerMinutes(minutes);
          toast({ title: `Timer ${minutes} min. Añade la tarea.` });
        }
      }
    }

    lastTranscriptRef.current = finalTranscript;
  }, [finalTranscript, isSelected, waitingForListoIndex, toast, onStopDictation]);

  const handlePlay = useCallback(() => {
    if (intervalRef.current) return;
    const first = items.findIndex((it) => !it.completed);
    if (first < 0) {
      toast({ title: 'Sin tareas', description: 'Añade tareas o desmarca completadas.' });
      return;
    }
    const total = items[first].minutes * 60;
    secondsLeftRef.current = total;
    setSecondsLeft(total);
    setRunningTaskIndex(first);
  }, [items, toast]);

  const handlePause = useCallback(() => {
    stopPersistentAlarm();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunningTaskIndex(null);
    setWaitingForListoIndex(null);
    lastAnnouncedTaskIdRef.current = null;
  }, []);

  const handleToggleComplete = useCallback(
    (index: number) => {
      const newItems = items.map((it, i) => (i === index ? { ...it, completed: !it.completed } : it));
      onUpdate(id, { content: { title, items: newItems } });
      if (runningTaskIndex === index) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setRunningTaskIndex(null);
        setSecondsLeft(0);
      }
    },
    [items, title, onUpdate, id, runningTaskIndex]
  );

  const handleItemTextChange = useCallback(
    (index: number, text: string) => {
      const newItems = items.map((it, i) => (i === index ? { ...it, text } : it));
      onUpdate(id, { content: { title, items: newItems } });
    },
    [items, title, onUpdate, id]
  );

  const handleMinutesChange = useCallback(
    (index: number, minutes: number) => {
      const clamped = Math.max(1, Math.min(120, minutes));
      const newItems = items.map((it, i) => (i === index ? { ...it, minutes: clamped } : it));
      onUpdate(id, { content: { title, items: newItems } });
    },
    [items, title, onUpdate, id]
  );

  // Reordenar tareas arrastrando el punto izquierdo
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const sourceIndex = result.source.index;
      const destIndex = result.destination.index;
      if (sourceIndex === destIndex) return;

      const currentItems = [...items];

      // Recordar qué tareas están en ejecución / esperando "listo"
      const runningId =
        runningTaskIndex !== null && runningTaskIndex >= 0 && runningTaskIndex < currentItems.length
          ? currentItems[runningTaskIndex].id
          : null;
      const waitingId =
        waitingForListoIndex !== null && waitingForListoIndex >= 0 && waitingForListoIndex < currentItems.length
          ? currentItems[waitingForListoIndex].id
          : null;

      const [moved] = currentItems.splice(sourceIndex, 1);
      currentItems.splice(destIndex, 0, moved);

      // Recalcular índices en base a los ids
      const nextRunningIndex = runningId ? currentItems.findIndex((it) => it.id === runningId) : null;
      const nextWaitingIndex = waitingId ? currentItems.findIndex((it) => it.id === waitingId) : null;

      onUpdate(id, { content: { title, items: currentItems } });
      setRunningTaskIndex(nextRunningIndex !== -1 ? nextRunningIndex : null);
      setWaitingForListoIndex(nextWaitingIndex !== -1 ? nextWaitingIndex : null);
    },
    [items, title, id, onUpdate, runningTaskIndex, waitingForListoIndex]
  );

  const handleAddTask = useCallback(() => {
    const raw = (newTaskInputRef.current?.value ?? newTaskText).trim();
    const pending = pendingTimerMinutes ?? (newTaskInputRef.current as unknown as { pendingTimerMinutes?: number })?.pendingTimerMinutes;
    const cleaned = raw.replace(/(?:^|\s)(?:timer|Timer)\s+\d+\s+minutos?/gi, '').trim();
    const newItem: TimerListaItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: cleaned,
      completed: false,
      minutes: pending && pending >= 1 && pending <= 120 ? pending : 5,
    };
    onUpdate(id, { content: { title, items: [...items, newItem] } });
    setNewTaskText('');
    setPendingTimerMinutes(null);
    if (newTaskInputRef.current) {
      newTaskInputRef.current.value = '';
      delete (newTaskInputRef.current as unknown as { pendingTimerMinutes?: number }).pendingTimerMinutes;
    }
    lastAppliedTimerRef.current = null;
  }, [title, items, onUpdate, id, newTaskText, pendingTimerMinutes]);

  const handleDeleteTask = useCallback(
    (index: number) => {
      if (waitingForListoIndex === index) {
        stopPersistentAlarm();
        setWaitingForListoIndex(null);
      }
      const newItems = items.filter((_, i) => i !== index);
      onUpdate(id, { content: { title, items: newItems } });
      if (runningTaskIndex === index) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunningTaskIndex(null);
        setSecondsLeft(0);
      } else if (runningTaskIndex !== null && runningTaskIndex > index) {
        setRunningTaskIndex(runningTaskIndex - 1);
      }
      if (waitingForListoIndex !== null && waitingForListoIndex > index) {
        setWaitingForListoIndex(waitingForListoIndex - 1);
      }
      taskInputRefs.current = taskInputRefs.current.filter((_, i) => i !== index);
    },
    [items, title, onUpdate, id, runningTaskIndex, waitingForListoIndex]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(id, { content: { title: e.target.value, items } });
    },
    [items, onUpdate, id]
  );

  const isRunning = runningTaskIndex !== null;

  const { totalEstimatedMinutes, remainingMinutes } = useMemo(() => {
    const total = items.reduce((acc, it) => acc + it.minutes, 0);
    const remaining = items.filter((it) => !it.completed).reduce((acc, it) => acc + it.minutes, 0);
    return { totalEstimatedMinutes: total, remainingMinutes: remaining };
  }, [items]);

  // Sin overlay ni fullscreen: el timer no bloquea la pantalla en móvil; el usuario puede seguir desplazando e interactuando
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl overflow-visible shadow-lg border touch-manipulation',
        isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'
      )}
      style={{ width: width ?? 320, height: '100%', minHeight: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement?.(id, false);
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 border border-slate-300 shadow"
        onClick={(e) => {
          e.stopPropagation();
          deleteElement?.(id);
        }}
        title="Eliminar lista"
      >
        <X className="h-4 w-4" />
      </Button>
      {/* Header: diseño nuevo, oscuro — arrastrable desde la barra */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2.5 flex items-center gap-2">
        <div className="drag-handle cursor-grab active:cursor-grabbing shrink-0 w-4 h-4 grid grid-cols-3 grid-rows-3 gap-px place-items-center self-center" title="Arrastrar">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="w-0.5 h-0.5 rounded-full bg-white/80" />
          ))}
        </div>
        <div className="flex-1 flex justify-center min-w-0">
          {!isRunning ? (
            <Button
              size="sm"
              className="h-8 w-8 p-0 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                handlePlay();
              }}
              title="Iniciar primera tarea"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 w-8 p-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                handlePause();
              }}
              title="Pausar"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input
          value={title}
          onChange={handleTitleChange}
          className="bg-transparent text-white font-semibold text-sm flex-1 min-w-0 border-none outline-none placeholder:text-slate-400 text-right"
          placeholder="Timer Lista"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Countdown grande */}
      <div className="bg-slate-50 px-3 py-4 flex flex-col items-center justify-center border-b border-slate-200">
        <div className="text-3xl font-mono font-bold text-slate-800 tabular-nums">
          {formatTime(secondsLeft)}
        </div>
        {isRunning && items[runningTaskIndex] && (
          <p className="text-xs text-slate-500 mt-1 max-w-full text-center whitespace-pre-wrap break-words line-clamp-3">
            {items[runningTaskIndex].text || 'Tarea sin nombre'}
          </p>
        )}
        {waitingForListoIndex !== null && items[waitingForListoIndex] && (
          <>
            <p className="text-xs text-slate-500 mt-1 max-w-full text-center whitespace-pre-wrap break-words line-clamp-3">
              {items[waitingForListoIndex].text || 'Tarea sin nombre'}
            </p>
            <p className="text-xs text-amber-600 font-medium mt-1 animate-pulse">
              Di &quot;listo&quot; para continuar
            </p>
          </>
        )}
      </div>

      {/* Lista de tareas */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 bg-white min-h-[100px]">
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm py-2">Añade tareas (di &quot;timer X minutos&quot;).</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`timer-list-${id}`}>
              {(dropProvided) => (
                <ul
                  className="space-y-1.5"
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                >
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(dragProvided) => (
                        <li
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            'relative flex items-stretch gap-2 rounded-lg border p-1.5 pl-4 transition-colors',
                            item.completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200',
                            runningTaskIndex === index && 'ring-1 ring-emerald-400 bg-emerald-50/50'
                          )}
                        >
                          <div
                            {...dragProvided.dragHandleProps}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-400 shrink-0 cursor-grab active:cursor-grabbing border border-slate-300 blur-0"
                            title="Arrastrar para reordenar"
                          />
                          <div className="flex flex-col items-center shrink-0 gap-0.5">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleToggleComplete(index)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 shrink-0 mt-1"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(index);
                              }}
                              className="w-4 h-1 rounded-full bg-slate-300/60 hover:bg-red-400/80 transition-colors flex-shrink-0"
                              title="Borrar tarea"
                              aria-label="Borrar tarea"
                            />
                          </div>
                          <textarea
                            ref={(el) => {
                              taskInputRefs.current[index] = el;
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                            data-dictation-target="true"
                            value={item.text}
                            onChange={(e) => handleItemTextChange(index, e.target.value)}
                            placeholder="Tarea"
                            rows={1}
                            className="flex-1 min-w-0 min-h-[1.75rem] py-1 px-2 text-sm border-0 border-b border-slate-200 rounded-none bg-transparent resize-none overflow-hidden focus:ring-0 focus-visible:ring-0"
                            style={{ minHeight: '1.75rem', fontSize: '14px' }}
                            onClick={(e) => e.stopPropagation()}
                            onInput={(e) => {
                              const t = e.currentTarget;
                              t.style.height = 'auto';
                              t.style.height = Math.max(28, t.scrollHeight) + 'px';
                            }}
                          />
                          <div className="flex flex-col shrink-0 border border-slate-200 rounded overflow-hidden">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 min-w-6 p-0 rounded-none border-b border-slate-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMinutesChange(index, Math.min(120, item.minutes + 1));
                              }}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={120}
                              value={item.minutes}
                              onChange={(e) => handleMinutesChange(index, Number(e.target.value))}
                              className="w-10 h-6 text-center text-xs border-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 min-w-6 p-0 rounded-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMinutesChange(index, Math.max(1, item.minutes - 1));
                              }}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
        {items.length > 0 && (
          <div className="mt-2 mb-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700">
            Tiempo estimado: {formatHoursMinutes(totalEstimatedMinutes)}
            {remainingMinutes !== totalEstimatedMinutes && (
              <> · Quedan: {formatHoursMinutes(remainingMinutes)}</>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-1.5">
          <Input
            ref={(el) => {
              newTaskInputRef.current = el;
            }}
            data-dictation-target="true"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTask();
              }
            }}
            placeholder="Nueva tarea..."
            className="flex-1 h-8 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-8 px-2.5"
            onClick={(e) => {
              e.stopPropagation();
              handleAddTask();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
