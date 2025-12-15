'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, GripVertical, Bell } from 'lucide-react';
import type { CommonElementProps } from '@/lib/types';

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
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1000) {
            setIsRunning(false);
            setIsFinished(true);
            // Auto-reset después de 5 segundos
            setTimeout(() => setIsFinished(false), 5000);
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
    setIsFinished(false);
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
    setIsFinished(false);
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
    <div
      className={`
        w-full h-full flex flex-col rounded-xl overflow-hidden shadow-lg transition-all
        ${isFinished ? 'animate-pulse ring-2 ring-red-500' : ''}
      `}
      style={{ 
        background: isFinished 
          ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        minWidth: '160px',
        minHeight: showSelector ? '120px' : '80px'
      }}
      onClick={() => onSelectElement(id, false)}
    >
      {/* Header con grip para arrastrar */}
      <div className="drag-handle flex items-center justify-center py-1 cursor-grab active:cursor-grabbing bg-black/20">
        <GripVertical className="w-4 h-4 text-white/40" />
        {isFinished && <Bell className="w-3.5 h-3.5 text-red-300 ml-1 animate-bounce" />}
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-2">
        {showSelector ? (
          /* Selector de tiempo */
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-xs text-white/50 uppercase tracking-wide">Seleccionar</span>
            <div className="flex flex-wrap justify-center gap-1">
              {PRESET_TIMES.map(min => (
                <button
                  key={min}
                  onClick={(e) => handleSelectTime(min, e)}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-all
                    ${selectedMinutes === min 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }
                  `}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Display del tiempo */
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-3xl font-bold ${isFinished ? 'text-red-200' : 'text-white'}`}>
              {minutes.toString().padStart(2, '0')}
            </span>
            <span className={`text-xl ${isFinished ? 'text-red-300/60' : 'text-white/60'}`}>:</span>
            <span className={`text-3xl font-bold ${isFinished ? 'text-red-200' : 'text-white'}`}>
              {seconds.toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
      
      {/* Controles */}
      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-black/20">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center transition-all"
          >
            <Play className="w-4 h-4 text-white ml-0.5" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-all"
          >
            <Pause className="w-4 h-4 text-white" />
          </button>
        )}
        
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
