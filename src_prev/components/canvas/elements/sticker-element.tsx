'use client';

import React, { useMemo, useState } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { GripVertical, RotateCcw, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const STICKER_LIBRARY = {
  productivity: {
    name: 'Productividad',
    stickers: {
      star: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, 
        colors: ['#FFD700', '#FFA500', '#FF6B6B'] 
      },
      check: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path fill="white" d="M9 12l2 2 4-4" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`, 
        colors: ['#4CAF50', '#8BC34A', '#2196F3'] 
      },
      fire: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.71 5.25-9.34.76-.63 1.87-.17 1.97.82.05.53.24 1.03.54 1.46.91 1.3 2.58 2.06 4.24 2.06.74 0 1.46-.15 2.12-.44.52-.23 1.12.08 1.23.64C19.91 14.03 16.41 23 12 23z"/></svg>`, 
        colors: ['#FF6B6B', '#FF9800', '#E91E63'] 
      },
      lightning: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>`, 
        colors: ['#FFEB3B', '#FF9800', '#9C27B0'] 
      },
      trophy: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>`, 
        colors: ['#FFD700', '#FFA726', '#8D6E63'] 
      },
      target: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="white"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`, 
        colors: ['#F44336', '#E91E63', '#3F51B5'] 
      },
    }
  },
  emotions: {
    name: 'Emociones',
    stickers: {
      heart: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`, 
        colors: ['#E91E63', '#F44336', '#9C27B0'] 
      },
      smile: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path fill="white" d="M8 14s1.5 2 4 2 4-2 4-2" stroke="white" stroke-width="1.5" stroke-linecap="round"/><circle fill="white" cx="9" cy="9" r="1.5"/><circle fill="white" cx="15" cy="9" r="1.5"/></svg>`, 
        colors: ['#FFEB3B', '#FFC107', '#FF9800'] 
      },
      sparkles: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/><path d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" opacity="0.7"/><path d="M5 17l.67 2 2 .67-2 .66L5 22l-.67-2-2-.67 2-.66L5 17z" opacity="0.5"/></svg>`, 
        colors: ['#9C27B0', '#E91E63', '#FFD700'] 
      },
      thumbsup: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z"/></svg>`, 
        colors: ['#2196F3', '#4CAF50', '#FF9800'] 
      },
    }
  },
  arrows: {
    name: 'Flechas',
    stickers: {
      arrow_right: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>`, 
        colors: ['#2196F3', '#4CAF50', '#FF5722'] 
      },
      arrow_up: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>`, 
        colors: ['#4CAF50', '#8BC34A', '#00BCD4'] 
      },
      arrow_curved: { 
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`, 
        colors: ['#FF5722', '#E91E63', '#3F51B5'] 
      },
    }
  },
  badges: {
    name: 'Insignias',
    stickers: {
      badge_star: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/><path fill="white" d="M12 7l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 10.5l3.5-.5L12 7z"/></svg>`, 
        colors: ['#3F51B5', '#9C27B0', '#FF9800'] 
      },
      ribbon: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4v2h16V2zM4 22l4-4h8l4 4V6H4v16z"/></svg>`, 
        colors: ['#F44336', '#E91E63', '#2196F3'] 
      },
      burst: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 5 5-1-3 4 4 3-5 1 1 5-4-3-4 3 1-5-5-1 4-3-3-4 5 1 2-5z"/></svg>`, 
        colors: ['#FF6B6B', '#FFD93D', '#6BCB77'] 
      },
    }
  },
  numbers: {
    name: 'Números',
    stickers: {
      num_1: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">1</text></svg>`, 
        colors: ['#F44336', '#E91E63', '#9C27B0'] 
      },
      num_2: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">2</text></svg>`, 
        colors: ['#2196F3', '#03A9F4', '#00BCD4'] 
      },
      num_3: { 
        svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">3</text></svg>`, 
        colors: ['#4CAF50', '#8BC34A', '#CDDC39'] 
      },
    }
  }
};

interface StickerContent {
  stickerId: string;
  category: string;
  color: string;
}

export default function StickerElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement, properties } = props;

  const safeContent: StickerContent = 
    typeof content === 'object' && content !== null && 'stickerId' in content
      ? (content as StickerContent)
      : { stickerId: 'star', category: 'productivity', color: '#FFD700' };

  const [isEditing, setIsEditing] = useState(false);

  const currentRotation = useMemo(() => {
    if (properties && typeof properties === 'object' && typeof (properties as any).rotation === 'number') {
      return (properties as any).rotation as number;
    }
    return 0;
  }, [properties]);

  const getStickerData = () => {
    const category = STICKER_LIBRARY[safeContent.category as keyof typeof STICKER_LIBRARY];
    if (category && category.stickers[safeContent.stickerId as keyof typeof category.stickers]) {
      return category.stickers[safeContent.stickerId as keyof typeof category.stickers];
    }
    const fallbackCategory = STICKER_LIBRARY.productivity;
    return fallbackCategory.stickers.star;
  };

  const stickerData = getStickerData();

  const setRotation = (rotation: number) => {
    const normalized = ((rotation % 360) + 360) % 360;
    onUpdate(id, { properties: { ...(properties as any || {}), rotation: normalized } as any });
  };

  const handleColorChange = (color: string) => {
    onUpdate(id, { content: { ...safeContent, color } });
  };

  const handleStickerChange = (category: string, stickerId: string, color: string) => {
    onUpdate(id, { content: { stickerId, category, color } });
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'w-full h-full flex items-center justify-center relative group cursor-pointer',
        isSelected && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
      onClick={() => onEditElement(id)}
    >
      <div className="absolute top-1 left-1 flex items-center gap-1 z-20">
        <div className="drag-handle cursor-grab active:cursor-grabbing bg-white/80 text-gray-800 rounded-full px-2 py-1 shadow-sm text-[10px] flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          Arrastra
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-1 right-1 flex items-center gap-1 z-20">
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 rounded-full shadow-sm"
            onClick={(e) => { e.stopPropagation(); setRotation(currentRotation - 15); }}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 rounded-full shadow-sm"
            onClick={(e) => { e.stopPropagation(); setRotation(currentRotation + 15); }}
          >
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      )}

      {stickerData && (
        <div
          className="w-full h-full flex items-center justify-center p-2 transition-transform hover:scale-105"
          style={{ color: safeContent.color, transform: `rotate(${currentRotation}deg)` }}
          dangerouslySetInnerHTML={{ __html: stickerData.svg }}
        />
      )}

      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-lg"
              onClick={(e) => e.stopPropagation()}>
              <span className="text-xs">🎨</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-96 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Elegir Sticker</h4>
              {Object.entries(STICKER_LIBRARY).map(([catKey, category]) => (
                <div key={catKey}>
                  <div className="text-xs text-gray-500 mb-2 font-medium">{category.name}</div>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(category.stickers).map(([stickerKey, sticker]) => (
                      <button
                        key={stickerKey}
                        onClick={() => handleStickerChange(catKey, stickerKey, sticker.colors[0])}
                        className={cn(
                          'w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center p-1 transition-all hover:scale-110',
                          safeContent.stickerId === stickerKey && safeContent.category === catKey && 'bg-gray-200 ring-2 ring-primary'
                        )}
                        style={{ color: sticker.colors[0] }}
                        dangerouslySetInnerHTML={{ __html: sticker.svg }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {stickerData && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Color</div>
                  <div className="flex gap-2">
                    {stickerData.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                          safeContent.color === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t space-y-2">
                <div className="text-xs text-gray-500 font-medium">Rotación</div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={currentRotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-xs text-gray-600 text-right">{Math.round(currentRotation)}°</div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button size="icon" variant="destructive" className="h-6 w-6 rounded-full shadow-lg"
          onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
