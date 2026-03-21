'use client';

import React, { useMemo } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, Presentation, FileImage, FileVideo, FileAudio, FileCode, FileArchive, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DocKind = {
  label: string;
  accent: string;
  bg: string;
  icon: React.ReactNode;
};

const getExtension = (value: string): string => {
  const clean = value.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
};

const inferDocKind = (url: string, title: string): DocKind => {
  const lowerUrl = url.toLowerCase();
  const ext = getExtension(url) || getExtension(title);

  if (lowerUrl.includes('docs.google.com/document') || ['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return { label: 'DOC', accent: '#2563eb', bg: '#eff6ff', icon: <FileText className="h-5 w-5" /> };
  }
  if (lowerUrl.includes('docs.google.com/spreadsheets') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return { label: 'SHEET', accent: '#16a34a', bg: '#ecfdf3', icon: <FileSpreadsheet className="h-5 w-5" /> };
  }
  if (lowerUrl.includes('docs.google.com/presentation') || ['ppt', 'pptx', 'key'].includes(ext)) {
    return { label: 'SLIDES', accent: '#ea580c', bg: '#fff7ed', icon: <Presentation className="h-5 w-5" /> };
  }
  if (ext === 'pdf') {
    return { label: 'PDF', accent: '#dc2626', bg: '#fef2f2', icon: <FileText className="h-5 w-5" /> };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return { label: 'IMAGE', accent: '#7c3aed', bg: '#f5f3ff', icon: <FileImage className="h-5 w-5" /> };
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
    return { label: 'VIDEO', accent: '#db2777', bg: '#fdf2f8', icon: <FileVideo className="h-5 w-5" /> };
  }
  if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext)) {
    return { label: 'AUDIO', accent: '#4f46e5', bg: '#eef2ff', icon: <FileAudio className="h-5 w-5" /> };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { label: 'ARCHIVE', accent: '#b45309', bg: '#fffbeb', icon: <FileArchive className="h-5 w-5" /> };
  }
  if (['js', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'md'].includes(ext)) {
    return { label: 'CODE', accent: '#0f766e', bg: '#f0fdfa', icon: <FileCode className="h-5 w-5" /> };
  }
  return { label: 'DOC', accent: '#334155', bg: '#f8fafc', icon: <FileText className="h-5 w-5" /> };
};

export default function UrlDocElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, onEditElement, deleteElement } = props;

  const url = typeof content === 'object' && content !== null && 'url' in content
    ? (content as { url?: string }).url || ''
    : '';
  const title = typeof content === 'object' && content !== null && 'title' in content
    ? (content as { title?: string }).title || ''
    : '';

  const displayTitle = title || url || 'Documento';
  const docKind = useMemo(() => inferDocKind(url, displayTitle), [url, displayTitle]);

  const handleOpen = (e: React.MouseEvent) => {
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
        'relative w-full h-full flex flex-col drag-handle',
        'bg-white rounded-lg border-2 border-gray-200 shadow-md cursor-pointer overflow-hidden',
        'hover:border-blue-400 hover:shadow-lg transition-all',
        isSelected && 'ring-2 ring-blue-500 border-blue-500'
      )}
      onClick={handleOpen}
    >
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-blue-50 rounded-full"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleOpen}
          title="Abrir documento"
        >
          <ExternalLink className="h-3 w-3 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-red-50 rounded-full"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            deleteElement(id);
          }}
          title="Eliminar"
        >
          <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
      </div>

      <div className="relative flex-1 w-full drag-handle" style={{ backgroundColor: docKind.bg }}>
        <div className="absolute inset-3 rounded-md bg-white/80 border border-black/5 shadow-sm">
          <div className="h-2 w-full bg-black/5 rounded-t-md" />
          <div className="p-3 flex flex-col gap-2">
            <div className="h-2 w-4/5 rounded bg-black/10" />
            <div className="h-2 w-3/5 rounded bg-black/10" />
            <div className="h-2 w-2/5 rounded bg-black/10" />
          </div>
        </div>
        <div
          className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm"
          style={{ backgroundColor: 'white', color: docKind.accent, border: `1px solid ${docKind.accent}20` }}
        >
          <span className="inline-flex items-center" style={{ color: docKind.accent }}>
            {docKind.icon}
          </span>
          <span>{docKind.label}</span>
        </div>
        <div className="absolute bottom-3 right-3">
          <ExternalLink className="w-4 h-4 text-black/40" />
        </div>
      </div>

      <div
        className="w-full text-[11px] font-semibold tracking-wide py-1.5 px-2 text-center uppercase truncate drag-handle"
        style={{ backgroundColor: docKind.accent, color: '#ffffff' }}
      >
        {displayTitle}
      </div>
    </div>
  );
}
