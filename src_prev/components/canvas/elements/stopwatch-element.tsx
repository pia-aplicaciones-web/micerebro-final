'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, GripVertical } from 'lucide-react';
import type { CommonElementProps } from '@/lib/types';

/**
 * Cronómetro - Diseño moderno y compacto
 * - Arrastrable por el grip
 * - Botones pequeños e intuitivos
 * - Diseño limpio con gradiente sutil
 */
export default function StopwatchElement({ id, onUpdate, onSelectElement, isSelected, deleteElement }: CommonElementProps) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 10);
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return { minutes, seconds, centiseconds };
  };

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(prev => !prev);
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(false);
    setTime(0);
  }, []);

  const { minutes, seconds, centiseconds } = formatTime(time);

  return (
    <div
      className="w-full h-full flex flex-col rounded-xl overflow-hidden shadow-lg"
      style={{ 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        minWidth: '140px',
        minHeight: '80px'
      }}
      onClick={() => onSelectElement(id, false)}
    >
      {/* Header con grip para arrastrar */}
      <div className="drag-handle flex items-center justify-center py-1 cursor-grab active:cursor-grabbing bg-black/20">
        <GripVertical className="w-4 h-4 text-white/40" />
      </div>
      
      {/* Display del tiempo */}
      <div className="flex-1 flex items-center justify-center px-3 py-2">
        <div className="flex items-baseline gap-0.5 font-mono">
          <span className="text-2xl font-bold text-white">
            {minutes.toString().padStart(2, '0')}
          </span>
          <span className="text-lg text-white/60">:</span>
          <span className="text-2xl font-bold text-white">
            {seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-white/40 ml-0.5">
            .{centiseconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      
      {/* Controles */}
      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-black/20">
        <button
          onClick={handleToggle}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${isRunning 
              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }
          `}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        
        <button
          onClick={handleReset}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
    </div>
  );
}
