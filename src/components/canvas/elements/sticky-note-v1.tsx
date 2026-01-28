'use client';

/**
 * PROPUESTA 1: Minimalista Ultra Limpia
 * Sin header visible, solo aparece al hover. Diseño ultra minimalista tipo post-it real.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';
import { X, GripVertical } from 'lucide-react';

// 14 Colores pastel elegantes
const PASTEL_COLORS = {
  rose: { bg: '#FFE5E5', name: 'Rosa' },
  lavender: { bg: '#E5E1FF', name: 'Lavanda' },
  mint: { bg: '#E5FFE5', name: 'Menta' },
  peach: { bg: '#FFE5D9', name: 'Durazno' },
  sky: { bg: '#E5F5FF', name: 'Cielo' },
  butter: { bg: '#FFF9E5', name: 'Mantequilla' },
  lilac: { bg: '#F0E5FF', name: 'Lila' },
  sage: { bg: '#E5F0E5', name: 'Salvia' },
  coral: { bg: '#FFE5D0', name: 'Coral' },
  aqua: { bg: '#E5FFF5', name: 'Aqua' },
  cream: { bg: '#FFF5E5', name: 'Crema' },
  periwinkle: { bg: '#E5EBFF', name: 'Periwinkle' },
  blush: { bg: '#FFE5F0', name: 'Rubor' },
  honey: { bg: '#FFF0E5', name: 'Miel' },
} as const;

const TEXT_COLOR = '#1A1A1B'; // Gris muy oscuro elegante (no negro puro)

export default function StickyNoteV1(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    isSelected,
    onUpdate,
    onEditElement,
    onSelectElement,
    deleteElement,
    isPreview,
    minimized,
  } = props;

  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const { handlePaste } = usePastePlainText();
  const [isHovered, setIsHovered] = useState(false);

  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const colorKey = (safeProperties.color as keyof typeof PASTEL_COLORS) || 'rose';
  const currentColor = PASTEL_COLORS[colorKey] || PASTEL_COLORS.rose;

  const typedContent = (content || {}) as { text: string };
  const textContent = typedContent.text || '';

  // Auto-save
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = editorRef.current?.innerHTML || '';
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newContent) => {
      const normalizedTextContent = (textContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      if (newContent !== normalizedTextContent) {
        await onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 2000,
  });

  useEffect(() => {
    if (editorRef.current && !minimized) {
      const isFocused = document.activeElement === editorRef.current;
      if (!isFocused && editorRef.current.innerHTML !== textContent) {
        editorRef.current.innerHTML = textContent || '';
      }
    }
  }, [textContent, minimized]);

  const handleContentChange = () => handleChange();
  const handleBlurWithSave = async () => await handleAutoSaveBlur();

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteElement) deleteElement(id);
  };

  return (
    <div
      data-element-id={id}
      className="relative w-full h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle, .close-btn')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onDoubleClick={() => onEditElement(id)}
      style={{
        transform: `rotate(${safeProperties.rotation || 0}deg)`,
        transformOrigin: 'center',
      }}
    >
      {/* Post-it Style Container */}
      <div
        className={cn(
          "relative w-full h-full rounded-sm transition-all duration-200",
          "border border-gray-300/30",
          minimized && "h-12"
        )}
        style={{
          backgroundColor: currentColor.bg,
          boxShadow: isHovered || isSelected 
            ? '0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)' 
            : '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {/* Controles invisibles - solo aparecen al hover */}
        {(isHovered || isSelected) && (
          <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
            <div className="drag-handle cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5">
              <GripVertical className="h-3 w-3 text-gray-600 opacity-60" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="close-btn h-6 w-6 p-0 hover:bg-red-100 rounded"
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="h-3 w-3 text-gray-600" />
            </Button>
          </div>
        )}

        {/* Content Area - Ultra limpio */}
        {!minimized && (
          <div className="relative w-full h-full p-4 pt-6">
            <div
              ref={editorRef}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={handleContentChange}
              onBlur={handleBlurWithSave}
              onFocus={() => onEditElement(id)}
              onPaste={handlePaste}
              className="w-full h-full outline-none cursor-text overflow-auto"
              style={{
                fontFamily: '"Raleway", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: '16px',
                color: TEXT_COLOR,
                lineHeight: '1.6',
                letterSpacing: '0.01em',
                touchAction: 'manipulation',
                WebkitUserSelect: 'text',
                userSelect: 'text',
              }}
            />
            <div className="absolute bottom-2 right-2">
              <SaveStatusIndicator status={saveStatus} size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
