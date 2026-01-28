'use client';

/**
 * TIPO 3: Nota con Header Minimalista y Etiquetas en Badge
 * Header minimalista, etiquetas tipo badge, diseño limpio
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
import { X, Plus, Circle } from 'lucide-react';

// Paleta de colores para notas adhesivas
const PASTEL_COLORS = {
  'morado-claro': { bg: '#e0cee0', name: 'Morado Claro' },
  'morado': { bg: '#aa72bf', name: 'Morado' },
  'menta': { bg: '#bae0e2', name: 'Menta' },
  'calipso': { bg: '#28c4d8', name: 'Calipso' },
  'amarillo-dark': { bg: '#ede211', name: 'Amarillo Dark' },
  'amarillo': { bg: '#f2ed6d', name: 'Amarillo' },
  'tierra': { bg: '#dbcea5', name: 'Tierra' },
  'coral': { bg: '#f26877', name: 'Coral' },
  'naranja': { bg: '#ffbc21', name: 'Naranja' },
  'verde-teal': { bg: '#00a087', name: 'Verde Teal' },
  'verde': { bg: '#a8e6cf', name: 'Verde' },
  'azul': { bg: '#b3d9ff', name: 'Azul' },
} as const;

const TEXT_COLOR = '#1A1A1B';

export default function StickyNoteType3(props: CommonElementProps) {
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
  const colorKey = (safeProperties.color as keyof typeof PASTEL_COLORS) || 'morado-claro';
  const currentColor = PASTEL_COLORS[colorKey] || PASTEL_COLORS['morado-claro'];

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
      className="relative w-full h-full flex flex-col rounded-md overflow-hidden"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle, .close-btn, .tag-input')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onDoubleClick={() => onEditElement(id)}
      style={{
        transform: `rotate(${safeProperties.rotation || 0}deg)`,
        transformOrigin: 'center',
        backgroundColor: currentColor.bg,
        boxShadow: isSelected ? '0 6px 16px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      {/* Header Minimalista con Badges */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/30 backdrop-blur-sm border-b border-gray-200/40">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentTags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs rounded-full bg-white/80 text-gray-700 border border-gray-300/60 shadow-sm flex items-center gap-1"
                >
                  <Circle className="h-1.5 w-1.5 fill-current" />
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="hover:text-red-600 ml-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {!isAddingTag && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddTag();
              }}
              className="px-2 py-0.5 text-xs rounded-full bg-white/60 text-gray-600 border border-gray-300/50 hover:bg-white/80 flex items-center gap-1"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>Etiqueta</span>
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
                className="h-6 px-1 text-xs"
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
                className="h-6 px-1 text-xs"
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
        <Button
          variant="ghost"
          size="icon"
          className="close-btn h-6 w-6 p-0 hover:bg-red-50"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="h-3.5 w-3.5 text-gray-600" />
        </Button>
      </div>

      {/* Content Area */}
      {!minimized && (
        <div className="relative flex-1 p-4 overflow-auto">
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
