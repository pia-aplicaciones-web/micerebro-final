'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Trash2 } from 'lucide-react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Cronómetro - Diseño moderno y compacto
 * - Arrastrable por el grip
 * - Botones pequeños e intuitivos
 * - Diseño limpio con gradiente sutil
 */
export default function StopwatchElement({ id, onUpdate, onSelectElement, isSelected, deleteElement }: CommonElementProps) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showThirtyMinNotification, setShowThirtyMinNotification] = useState(false);
  const [showOneHourNotification, setShowOneHourNotification] = useState(false);
  const [showNinetyMinNotification, setShowNinetyMinNotification] = useState(false);
  const [showTwoHourNotification, setShowTwoHourNotification] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          const newTime = prev + 10;
          const totalMinutes = Math.floor(newTime / 60000);

          // Verificar notificaciones
          const totalSeconds = Math.floor(newTime / 1000);

          if (totalSeconds === 30 && !showThirtyMinNotification) {
            setShowThirtyMinNotification(true);
            // Auto-hide después de 2 minutos (modo producción)
            setTimeout(() => setShowThirtyMinNotification(false), 120000);
          } else if (totalSeconds === 60 && !showOneHourNotification) {
            setShowOneHourNotification(true);
            // Auto-hide después de 2 minutos (modo producción)
            setTimeout(() => setShowOneHourNotification(false), 120000);
          } else if (totalSeconds === 90 && !showNinetyMinNotification) {
            setShowNinetyMinNotification(true);
            // Auto-hide después de 2 minutos (modo producción)
            setTimeout(() => setShowNinetyMinNotification(false), 120000);
          } else if (totalSeconds === 120 && !showTwoHourNotification) {
            setShowTwoHourNotification(true);
            // Auto-hide después de 4 minutos
            setTimeout(() => setShowTwoHourNotification(false), 240000);
          }

          return newTime;
        });
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
  }, [isRunning, showThirtyMinNotification, showOneHourNotification, showNinetyMinNotification, showTwoHourNotification]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return { hours, minutes, seconds, centiseconds };
  };

  const handleStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTime(0);
    setShowThirtyMinNotification(false);
    setShowOneHourNotification(false);
    setShowNinetyMinNotification(false);
    setShowTwoHourNotification(false);
  }, []);

  const { hours, minutes, seconds, centiseconds } = formatTime(time);

  return (
    <Card
      className={cn(
        'w-full h-full p-4 flex flex-col gap-3 shadow-lg border relative'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0.5 right-0.5 h-6 w-6 z-10 hover:bg-red-50"
        onClick={(e) => {
          e.stopPropagation();
          deleteElement(id);
        }}
      >
        <Trash2 className="h-3 w-3 text-red-500" />
      </Button>

      <div className="drag-handle cursor-grab active:cursor-grabbing absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full opacity-60 hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-700 px-2">
        <span className="font-semibold text-[11px]">
          Cronómetro
        </span>
        <span className="text-xs text-slate-500">{isRunning ? 'En curso' : 'Pausado'}</span>
      </div>
      
      <div className="relative">
        <div className="text-3xl font-mono text-center tracking-wide text-black">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        {/* Notificación de 30 minutos */}
        {showThirtyMinNotification && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 bg-opacity-95 py-2 text-center rounded-lg">
            <span className="text-white font-bold text-[16px]">
              30 MINUTOS!!
            </span>
          </div>
        )}

        {/* Notificación de 1 hora */}
        {showOneHourNotification && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 bg-opacity-95 py-2 text-center rounded-lg flex flex-col justify-center items-center">
            <span className="text-white font-bold text-[16px] block">
              1 HORA!!
            </span>
            <span className="text-white font-bold text-[16px] block mt-1">
              ---Descansa---
            </span>
          </div>
        )}

        {/* Notificación de 1 hora y 30 minutos */}
        {showNinetyMinNotification && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 bg-opacity-95 py-3 text-center rounded-lg flex flex-col justify-center items-center">
            <span className="text-white font-bold text-[16px] block">
              1 HR. 30 MIN.!
            </span>
            <span className="text-white font-bold text-[14px] block mt-1">
              Prepara para terminar!
            </span>
          </div>
        )}

        {/* Notificación de 2 horas */}
        {showTwoHourNotification && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 bg-opacity-95 py-4 text-center rounded-lg flex flex-col justify-center items-center">
            <span className="text-white font-bold text-[16px] block">
              2 HORAS!
            </span>
            <span className="text-white font-bold text-[16px] block mt-1">
              0 TIEMPO!!-
            </span>
            <span className="text-white font-bold text-[18px] block mt-1">
              APAGA
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleStart} disabled={isRunning} className="flex-1 h-7 px-2 text-xs">
          <Play className="h-2.5 w-2.5" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handlePause} disabled={!isRunning} className="flex-1 h-7 px-2 text-xs">
          <Pause className="h-2.5 w-2.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1 h-7 px-2 text-xs">
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
    </Card>
  );
}
