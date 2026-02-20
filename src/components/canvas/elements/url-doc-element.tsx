'use client';

import React from 'react';
import type { CommonElementProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FileText, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UrlDocElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, onEditElement, deleteElement } = props;

  const url = typeof content === 'object' && content !== null && 'url' in content
    ? (content as { url?: string }).url || ''
    : '';
  const title = typeof content === 'object' && content !== null && 'title' in content
    ? (content as { title?: string }).title || ''
    : '';

  const displayTitle = title || url || 'Documento';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onEditElement(id);
    }
  };

  return (
    <div
      className={cn(
        'relative w-full h-full flex flex-col items-center justify-center gap-2',
        'bg-white rounded-lg border-2 border-gray-200 shadow-md cursor-pointer',
        'hover:border-blue-400 hover:shadow-lg transition-all',
        isSelected && 'ring-2 ring-blue-500 border-blue-500'
      )}
      onClick={handleClick}
      style={{ padding: '12px' }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 z-10 hover:bg-red-50 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          deleteElement(id);
        }}
      >
        <Trash2 className="h-3 w-3 text-red-500" />
      </Button>

      <div className="flex-1 flex flex-col items-center justify-center gap-2 min-w-0">
        <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-gray-100">
          <FileText className="w-8 h-8 text-gray-600" />
        </div>
        <span className="text-sm font-medium text-gray-800 text-center line-clamp-2 break-words px-2">
          {displayTitle.length > 40 ? `${displayTitle.slice(0, 40)}...` : displayTitle}
        </span>
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
