'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Trash2 } from 'lucide-react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PRESET_TIMES = [1, 5, 10, 15, 20, 25, 30, 45, 60]; // minutos

/**
 * Temporizador - Diseño moderno y compacto
 * - Arrastrable por el grip
 * - Selector de tiempo elegante
 * - Alerta visual cuando termina
 */
export default function CountdownElement({ id, onUpdate, onSelectElement, isSelected, deleteElement }: CommonElementProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1000) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  };

  const handleStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeLeft === 0) {
      setTimeLeft(selectedMinutes * 60 * 1000);
    }
    setIsRunning(true);
  }, [timeLeft, selectedMinutes]);

  const handlePause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(false);
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(false);
    setTimeLeft(0);
  }, []);

  const handleSelectTime = useCallback((minutes: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMinutes(minutes);
    if (!isRunning) {
      setTimeLeft(0);
    }
  }, [isRunning]);

  const { minutes, seconds } = formatTime(timeLeft);
  const showSelector = timeLeft === 0 && !isRunning;

  return (
    <Card
      className={cn(
        'w-full h-full p-3 flex flex-col gap-2 shadow-lg border relative'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span className="font-semibold text-[11px]">
          Cronómetro
        </span>
        <span className="text-xs text-slate-500">{isRunning ? 'En curso' : 'Pausado'}</span>
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
          value={selectedMinutes}
          onChange={(e) => setSelectedMinutes(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleStart} disabled={isRunning} className="flex-1">
          <Play className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handlePause} disabled={!isRunning} className="flex-1">
          <Pause className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1">
          <RotateCcw className="h-3 w-3" />
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
    </Card>
  );
}
