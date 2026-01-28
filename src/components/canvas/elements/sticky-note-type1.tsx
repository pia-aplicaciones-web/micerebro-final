'use client';

/**
 * TIPO 1: Nota con Header Elegante
 * Header visible con etiquetas, handlers externos para redimensionar desde 4 esquinas
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';
import { X, Plus, Tag } from 'lucide-react';

// 14 Colores pastel
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

const TEXT_COLOR = '#1A1A1B';

export default function StickyNoteType1(props: CommonElementProps) {
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
    tags,
  } = props;

  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const { handlePaste } = usePastePlainText();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const currentTags = (tags || []) as string[];

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

  const handleAddTag = () => {
    setIsAddingTag(true);
    setNewTagName('');
  };

  const handleConfirmTag = () => {
    if (newTagName.trim()) {
      const updatedTags = [...currentTags, newTagName.trim()];
      onUpdate(id, { tags: updatedTags });
      setIsAddingTag(false);
      setNewTagName('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    onUpdate(id, { tags: updatedTags });
  };

  return (
    <div
      data-element-id={id}
      className="relative w-full h-full flex flex-col"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle, .close-btn, .tag-input')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onDoubleClick={() => onEditElement(id)}
      style={{
        transform: `rotate(${safeProperties.rotation || 0}deg)`,
        transformOrigin: 'center',
      }}
    >
      {/* Header con Etiquetas */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-gray-300/30"
        style={{ backgroundColor: `${currentColor.bg}DD` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {currentTags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded-full bg-white/60 text-gray-700 border border-gray-300/50 flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  className="hover:text-red-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {!isAddingTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTag();
                }}
                className="px-2 py-0.5 text-xs rounded-full bg-white/40 text-gray-600 border border-gray-300/50 hover:bg-white/60 flex items-center gap-1"
              >
                <Plus className="h-2.5 w-2.5" />
                Etiqueta
              </button>
            )}
            {isAddingTag && (
              <div className="tag-input flex items-center gap-1">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmTag();
                    } else if (e.key === 'Escape') {
                      setIsAddingTag(false);
                      setNewTagName('');
                    }
                  }}
                  className="h-6 text-xs w-24"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmTag();
                  }}
                >
                  ✓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingTag(false);
                    setNewTagName('');
                  }}
                >
                  ✕
                </Button>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="close-btn h-6 w-6 p-0 hover:bg-red-100"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="h-3.5 w-3.5 text-gray-600" />
        </Button>
      </div>

      {/* Content Area */}
      {!minimized && (
        <div className="relative flex-1 p-4 overflow-auto" style={{ backgroundColor: currentColor.bg }}>
          <div
            ref={editorRef}
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onInput={handleContentChange}
            onBlur={handleBlurWithSave}
            onFocus={() => onEditElement(id)}
            onPaste={handlePaste}
            className="w-full h-full outline-none cursor-text"
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
  );
}
