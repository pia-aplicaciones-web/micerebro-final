// src/components/canvas/elements/frame-element.tsx
import React from 'react';
import type { CommonElementProps, FrameContent } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function FrameElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onSelectElement, x, y, width, height, scale, offset, zIndex } = props;
  const rotation = properties?.rotation || 0;
  const title = (content as FrameContent)?.title || 'Frame';

  const positionStyle = {
    left: x * scale + (offset?.x || 0),
    top: y * scale + (offset?.y || 0),
    width: width * scale,
    height: height * scale,
    transform: `rotate(${rotation}deg)`,
    zIndex: zIndex || 1,
  };

  return (
    <div
      id={id}
      className={cn(
        'absolute border-2 border-dashed bg-transparent pointer-events-auto',
        isSelected ? 'border-blue-700' : 'border-gray-500'
      )}
      style={positionStyle}
      onMouseDown={(e) => {
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
    >
      <div className={cn(
        'absolute -top-7 left-0 px-2 py-1 text-xs rounded-t-md cursor-grab active:cursor-grabbing drag-handle',
        isSelected ? 'bg-blue-700 text-white' : 'bg-gray-500 text-white'
        )}
      >
        {title}
      </div>
      {/* Children are rendered by the main canvas component based on parentId */}
    </div>
  );
};
