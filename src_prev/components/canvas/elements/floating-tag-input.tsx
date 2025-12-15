
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface FloatingTagInputProps {
  tag: string;
  isEditing: boolean;
  onSave: (newTag: string) => void;
  onCancel: () => void;
}

export default function FloatingTagInput({ tag, isEditing, onSave, onCancel }: FloatingTagInputProps) {
  const [currentTag, setCurrentTag] = useState(tag);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTag(tag);
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [tag, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave(currentTag);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave(currentTag);
  };

  if (isEditing) {
    return (
      <div 
        className="absolute -top-10 left-0 z-30"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          id="floating-tag-input"
          name="floating-tag-input"
          type="text"
          value={currentTag}
          onChange={(e) => setCurrentTag(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="h-8 w-48 bg-black text-white border-primary placeholder:text-gray-400"
          placeholder="Añadir etiqueta..."
        />
      </div>
    );
  }

  if (!tag) {
    return null;
  }

  return (
    <div className="absolute -top-8 left-0 z-20 bg-black text-white text-xs rounded-md px-2 py-1 cursor-default pointer-events-none">
      <p className="break-words leading-tight">
        {tag}
      </p>
    </div>
  );
}
