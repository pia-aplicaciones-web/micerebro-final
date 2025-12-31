'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Trash2 } from 'lucide-react';

interface PomodoroContent {
  durationSeconds?: number;
}

export default function PomodoroTimerElement({
  id,
  content,
  isSelected,
  onSelectElement,
  deleteElement,
}: CommonElementProps) {
  const initialDuration = useMemo(() => {
    const pomodoroContent = content as PomodoroContent | undefined;
    const duration = pomodoroContent?.durationSeconds;
    return typeof duration === 'number' && duration > 0 ? duration : 25 * 60;
  }, [content]);

  const [durationSeconds, setDurationSeconds] = useState(initialDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(initialDuration);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setRemainingSeconds(initialDuration);
    setDurationSeconds(initialDuration);
  }, [initialDuration]);

  useEffect(() => {
    if (!running) return;
    if (remainingSeconds <= 0) {
      setRunning(false);
      setFinished(true);
      return;
    }
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, remainingSeconds]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const handleStart = useCallback(() => {
    setRunning(true);
    setFinished(false);
  }, []);

  const handlePause = useCallback(() => {
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setRemainingSeconds(durationSeconds);
    setFinished(false);
  }, [durationSeconds]);

  const handleDurationChange = useCallback((value: number) => {
    const clamped = Math.max(60, Math.min(value, 90 * 60));
    setDurationSeconds(clamped);
    setRemainingSeconds(clamped);
  }, []);

  return (
    <div
      className={cn(
        'p-1.5 flex flex-col gap-0.5 shadow-lg bg-white border rounded-lg relative',
        isSelected && 'border-2 border-blue-500'
      )}
      style={{
        minHeight: '80px',
        width: '180px',
        maxWidth: '180px'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >

      <div className="drag-handle cursor-grab active:cursor-grabbing absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full opacity-60 hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-700">
        <span className="font-semibold text-[9px]">
          Temporizador
        </span>
        <span className="text-[10px] text-slate-500">{running ? 'En curso' : 'Pausado'}</span>
      </div>

      <div className="relative">
        <div className="text-2xl font-mono text-center tracking-wide">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        {/* Cartel de finalización - solo sobre el timer */}
        {finished && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-95 flex items-center justify-center rounded-lg">
            <span className="text-white font-bold text-xl tracking-wider">
              ¡FINALIZADO!
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-[10px]">
        <span>Duración (min)</span>
        <Input
          type="number"
          className="h-6 flex-1"
          min={1}
          max={90}
          value={Math.round(durationSeconds / 60)}
          onChange={(e) => handleDurationChange(Number(e.target.value) * 60)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center gap-1">
        <Button size="sm" onClick={handleStart} disabled={running} className="flex-1 h-6 px-1.5 text-xs">
          <Play className="h-2.5 w-2.5" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handlePause} disabled={!running} className="flex-1 h-6 px-1.5 text-xs">
          <Pause className="h-2.5 w-2.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1 h-6 px-1.5 text-xs">
          <RotateCcw className="h-2.5 w-2.5" />
        </Button>
      </div>

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
              deleteElement(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}