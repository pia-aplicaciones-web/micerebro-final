'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PomodoroTimerElement({
  id,
  content,
  isSelected,
  onSelectElement,
}: CommonElementProps) {
  const initialDuration = useMemo(() => {
    const duration = (content as any)?.durationSeconds;
    return typeof duration === 'number' && duration > 0 ? duration : 25 * 60;
  }, [content]);

  const [durationSeconds, setDurationSeconds] = useState(initialDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(initialDuration);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setRemainingSeconds(initialDuration);
    setDurationSeconds(initialDuration);
  }, [initialDuration]);

  useEffect(() => {
    if (!running) return;
    if (remainingSeconds <= 0) {
      setRunning(false);
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
  }, []);

  const handlePause = useCallback(() => {
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setRemainingSeconds(durationSeconds);
  }, [durationSeconds]);

  const handleDurationChange = useCallback((value: number) => {
    const clamped = Math.max(60, Math.min(value, 90 * 60));
    setDurationSeconds(clamped);
    setRemainingSeconds(clamped);
  }, []);

  return (
    <Card
      className={cn(
        'w-full h-full p-3 flex flex-col gap-2 shadow-lg border',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span className="font-semibold">Pomodoro</span>
        <span className="text-xs text-slate-500">{running ? 'En curso' : 'Pausado'}</span>
      </div>

      <div className="text-3xl font-mono text-center tracking-wide">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span>Duración (min)</span>
        <Input
          type="number"
          className="h-8"
          min={1}
          max={90}
          value={Math.round(durationSeconds / 60)}
          onChange={(e) => handleDurationChange(Number(e.target.value) * 60)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleStart} disabled={running} className="flex-1">
          Iniciar
        </Button>
        <Button size="sm" variant="secondary" onClick={handlePause} disabled={!running} className="flex-1">
          Pausa
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1">
          Reset
        </Button>
      </div>
    </Card>
  );
}