'use client';

import React from 'react';
import { Cloud, CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/hooks/use-auto-save';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SaveStatusIndicator({ status, className, size = 'sm' }: SaveStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSize = sizeClasses[size];

  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className={cn(iconSize, 'animate-spin text-blue-500')} />;
      case 'saved':
        return <CheckCircle2 className={cn(iconSize, 'text-green-500')} />;
      case 'error':
        return <CloudOff className={cn(iconSize, 'text-red-500')} />;
      default:
        return <Cloud className={cn(iconSize, 'text-gray-400')} />;
    }
  };

  const getText = () => {
    switch (status) {
      case 'saving':
        return 'Guardando...';
      case 'saved':
        return 'Guardado';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs text-muted-foreground',
        className
      )}
      title={getText()}
    >
      {getIcon()}
      {status !== 'idle' && (
        <span className="text-[10px] leading-none">{getText()}</span>
      )}
    </div>
  );
}

