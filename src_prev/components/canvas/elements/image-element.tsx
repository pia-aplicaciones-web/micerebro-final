'use client';

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { CommonElementProps, ImageContent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tag, ArrowDownLeft } from "lucide-react";
import FloatingTagInput from "./floating-tag-input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SaveStatusIndicator } from "@/components/canvas/save-status-indicator";

// Type guard para ImageContent
function isImageContent(content: unknown): content is ImageContent {
  return typeof content === 'object' && content !== null && 'url' in content && typeof (content as { url: unknown }).url === 'string';
}

export default function ImageElement(props: CommonElementProps) {
  const { isSelected, properties, id, onUpdate, onEditElement, onSelectElement, content, isListening, liveTranscript } = props;
  
  const imageContent: ImageContent = isImageContent(content) ? content : { url: '' };
  const imageUrl = imageContent.url; 
  
  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const rotation = safeProperties?.rotation || 0;
  const showFloatingTag = safeProperties?.showFloatingTag || false;
  const floatingTag = safeProperties?.floatingTag || '';
  const label = safeProperties?.label || '';

  const labelRef = useRef<HTMLDivElement>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  
  useEffect(() => {
    if (labelRef.current && labelRef.current.innerText !== label) {
        labelRef.current.innerText = label || '';
    }
  }, [label]);

  useEffect(() => {
    if (isEditingLabel && labelRef.current) {
        labelRef.current.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(labelRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
    }
  }, [isEditingLabel]);

  const handleToggleFloatingTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditElement(id);
    onUpdate(id, { properties: { ...safeProperties, showFloatingTag: !showFloatingTag } });
  };
  
  const handleUpdateFloatingTag = (newTag: string) => {
    onUpdate(id, { properties: { ...safeProperties, floatingTag: newTag, showFloatingTag: false } });
  };

  const handleCancelFloatingTag = () => {
    onUpdate(id, { properties: { ...safeProperties, showFloatingTag: false } });
  };

  // AUTOGUARDADO: Label de la imagen
  const { saveStatus: labelSaveStatus, handleBlur: handleLabelBlurAutoSave, handleChange: handleLabelChange } = useAutoSave({
    getContent: () => labelRef.current?.innerText || label,
    onSave: async (newLabel) => {
      if (newLabel !== label && labelRef.current) {
        onUpdate(id, { properties: { ...safeProperties, label: newLabel } });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => oldContent === newContent,
  });

  const handleLabelBlur = () => {
    handleLabelBlurAutoSave();
    setIsEditingLabel(false);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(isSelected) {
      onEditElement(id);
      setIsEditingLabel(true);
    }
  };

  // Soporte para dictado: insertar texto cuando está escuchando y el label está en modo edición
  useEffect(() => {
    if (isListening && isSelected && isEditingLabel && labelRef.current && document.activeElement === labelRef.current) {
      document.execCommand('insertText', false, liveTranscript || '');
      handleLabelChange();
    }
  }, [isListening, liveTranscript, isSelected, isEditingLabel, handleLabelChange]);

  const handleOpenOriginalImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="group/image flex flex-col w-full h-full"
      onDoubleClick={handleDoubleClick}
      onMouseDown={(e) => onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey)} 
    >
      <div className="relative w-full flex-grow flex flex-col">
          
        {(isSelected || showFloatingTag || floatingTag) && (
          <FloatingTagInput 
            tag={floatingTag || ''}
            isEditing={!!showFloatingTag}
            onSave={handleUpdateFloatingTag}
            onCancel={handleCancelFloatingTag}
          />
        )}
        
        <div onMouseDown={(e) => e.stopPropagation()} className={cn("absolute top-1 left-1 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity", isSelected && "opacity-100")}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleFloatingTag} >
              <Tag className="h-4 w-4" />
            </Button>
        </div>

        <div onMouseDown={(e) => e.stopPropagation()} className="absolute bottom-1 left-1 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity">
            <Button 
                variant="default" 
                size="icon" 
                className="h-6 w-6 rounded-full shadow-lg" 
                onClick={handleOpenOriginalImage} 
                title="Abrir imagen original"
            >
              <ArrowDownLeft className="h-3 w-3" />
            </Button>
        </div>
        
        <div className={cn(
            "relative flex-grow rounded-lg overflow-hidden drag-handle", 
            `cursor-grab active:cursor-grabbing`
            )}
            style={{ transform: `rotate(${rotation || 0}deg)` }}
        >
          <div className="relative w-full h-full bg-card">
            <Image
              src={`${imageUrl}`}
              alt={label || "Canvas Image"}
              fill
              className="object-cover pointer-events-none"
            />
          </div>
        </div>
      </div>
       
      {(isEditingLabel || (label && label.trim() !== '')) && (
        <div 
          className="w-full pt-2 flex justify-center items-center"
          onMouseDown={(e) => e.stopPropagation()} 
        >
          <div className="relative inline-flex items-center gap-2">
            <div
              ref={labelRef}
              contentEditable={isEditingLabel}
              suppressContentEditableWarning
              onBlur={handleLabelBlur}
              onInput={handleLabelChange}
              onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
              className={cn(
                "text-white text-xs rounded-md px-3 py-1 whitespace-nowrap outline-none max-w-full",
                isEditingLabel ? "ring-1 ring-primary cursor-text" : "cursor-pointer",
            )}
            style={{ backgroundColor: '#2eb1ca' }}
          />
            {isEditingLabel && (
              <div className="flex-shrink-0">
                <SaveStatusIndicator status={labelSaveStatus} size="sm" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
