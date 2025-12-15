'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CommonElementProps, ContainerContent, CanvasElementProperties, WithId, CanvasElement } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GripVertical, X, Palette, Columns2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { TwitterPicker } from 'react-color';

const COLOR_PALETTE = [
  { name: 'white', label: 'Blanco', value: '#ffffff' },
  { name: 'yellow', label: 'Amarillo', value: '#fffb8b' },
  { name: 'pink', label: 'Rosa', value: '#ffc2d4' },
  { name: 'blue', label: 'Azul', value: '#bce8f1' },
  { name: 'green', label: 'Verde', value: '#d4edda' },
  { name: 'orange', label: 'Naranja', value: '#ffeeba' },
  { name: 'purple', label: 'Morado', value: '#e9d5ff' },
];

function isContainerContent(content: unknown): content is ContainerContent {
  return typeof content === 'object' && content !== null && 'elementIds' in content;
}

interface ElementCard {
  elementId: string;
  element: WithId<CanvasElement>;
}

export default function ContainerElement(props: CommonElementProps & { unanchorElement?: (id: string) => void }) {
  const {
    id,
    properties,
    isSelected,
    onSelectElement,
    onEditElement,
    content,
    onUpdate,
    deleteElement,
    allElements = [],
    onLocateElement,
    unanchorElement
  } = props;

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const containerContent: ContainerContent = isContainerContent(content)
    ? content
    : { title: 'Nuevo Contenedor', elementIds: [], layout: 'single' };

  const backgroundColor = safeProperties?.backgroundColor || '#ffffff';
  const layout = containerContent.layout || 'single';
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const containedElements: ElementCard[] = containerContent.elementIds
    .map(elementId => {
      const element = allElements.find(el => el.id === elementId);
      return element ? { elementId, element } : null;
    })
    .filter((card): card is ElementCard => card !== null);

  const { saveStatus: titleSaveStatus, handleBlur: handleTitleBlur, handleChange: handleTitleChange } = useAutoSave({
    getContent: () => titleInputRef.current?.value || containerContent.title || '',
    onSave: async (newTitle) => {
      if (newTitle !== containerContent.title) {
        onUpdate(id, { content: { ...containerContent, title: newTitle } });
      }
    },
    debounceMs: 1000,
  });

  const handleColorChange = useCallback((color: { hex: string }) => {
    onUpdate(id, {
      properties: {
        ...safeProperties,
        backgroundColor: color.hex
      }
    });
    setColorPopoverOpen(false);
  }, [id, safeProperties, onUpdate]);

  const handleLayoutToggle = useCallback(() => {
    const newLayout = layout === 'single' ? 'two-columns' : 'single';
    onUpdate(id, { content: { ...containerContent, layout: newLayout } });
  }, [id, containerContent, layout, onUpdate]);

  const handleClose = useCallback(() => {
    onUpdate(id, { hidden: true });
  }, [id, onUpdate]);

  const handleReleaseElement = useCallback((elementId: string) => {
    const newElementIds = containerContent.elementIds.filter(id => id !== elementId);
    onUpdate(id, { content: { ...containerContent, elementIds: newElementIds } });

    const containerElement = allElements.find(el => el.id === id);
    if (containerElement && unanchorElement) {
      const containerProps = typeof containerElement.properties === 'object' && containerElement.properties !== null
        ? containerElement.properties
        : {};
      const containerPosition = containerProps.position || { x: 0, y: 0 };
      const containerSize = containerProps.size || { width: 378, height: 567 };

      const releasedElement = allElements.find(el => el.id === elementId);
      if (releasedElement) {
        const releasePosition = {
          x: containerPosition.x + (typeof containerSize.width === 'number' ? containerSize.width : 378) + 20,
          y: containerPosition.y
        };

        onUpdate(elementId, {
          parentId: null,
          hidden: false,
          properties: {
            ...(typeof releasedElement.properties === 'object' && releasedElement.properties !== null ? releasedElement.properties : {}),
            position: releasePosition
          }
        });
      }
    }
  }, [id, containerContent, allElements, onUpdate, unanchorElement]);

  const getElementName = (element: WithId<CanvasElement>): string => {
    if (element.type === 'text') {
      return typeof element.content === 'string' ? element.content.substring(0, 30) : 'Texto';
    }
    if (element.type === 'sticky') {
      return typeof element.content === 'string' ? element.content.substring(0, 30) : 'Nota';
    }
    if (element.type === 'notepad' || element.type === 'notepad-simple') {
      const notepadContent = element.content as any;
      return notepadContent?.title || 'Cuaderno';
    }
    if (element.type === 'todo') {
      const todoContent = element.content as any;
      return todoContent?.title || 'Lista de Tareas';
    }
    if (element.type === 'image') {
      return 'Imagen';
    }
    return element.type.charAt(0).toUpperCase() + element.type.slice(1);
  };

  const getElementPreview = (element: WithId<CanvasElement>): React.ReactNode => {
    const size = typeof element.properties === 'object' && element.properties !== null && element.properties.size
      ? element.properties.size
      : { width: element.width || 100, height: element.height || 100 };

    const elementWidth = typeof size.width === 'number' ? size.width : parseInt(String(size.width));
    const elementHeight = typeof size.height === 'number' ? size.height : parseInt(String(size.height));

    const maxThumbnailSize = 80;
    const aspectRatio = elementWidth / elementHeight;
    let thumbWidth = maxThumbnailSize;
    let thumbHeight = maxThumbnailSize;

    if (aspectRatio > 1) {
      thumbHeight = maxThumbnailSize / aspectRatio;
    } else {
      thumbWidth = maxThumbnailSize * aspectRatio;
    }

    if (element.type === 'image') {
      const imageContent = element.content as any;
      return (
        <div className="relative rounded overflow-hidden bg-gray-100" style={{ width: thumbWidth, height: thumbHeight }}>
          <img
            src={imageContent?.url || ''}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (element.type === 'sticky') {
      const stickyColor = (element.properties as any)?.color || element.color || 'yellow';
      const colorMap: { [key: string]: string } = {
        yellow: '#fffb8b',
        pink: '#ffc2d4',
        blue: '#bce8f1',
        green: '#d4edda',
        orange: '#ffeeba',
        purple: '#e9d5ff',
      };
      const colorHex = colorMap[stickyColor] || (stickyColor.startsWith('#') ? stickyColor : '#fffb8b');
      const stickyText = typeof element.content === 'string' ? element.content.substring(0, 30) : 'Nota';
      return (
        <div
          className="rounded p-1 text-xs overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: colorHex, minHeight: thumbHeight }}
        >
          <p className="text-center text-xs">{stickyText}</p>
        </div>
      );
    }

    if (element.type === 'notepad' || element.type === 'notepad-simple') {
      const notepadContent = element.content as any;
      const title = notepadContent?.title || 'Cuaderno';
      return (
        <div className="rounded p-1 bg-white border border-gray-200 flex flex-col" style={{ minHeight: thumbHeight }}>
          <div className="font-semibold text-xs truncate">{title}</div>
        </div>
      );
    }

    if (element.type === 'todo') {
      const todoContent = element.content as any;
      const items = todoContent?.items || [];
      const completedCount = items.filter((item: any) => item.completed).length;
      return (
        <div className="rounded p-1 bg-white border border-gray-200 flex flex-col" style={{ minHeight: thumbHeight }}>
          <div className="font-semibold text-xs truncate">{todoContent?.title || 'Lista'}</div>
          <div className="text-xs text-gray-500">
            {completedCount}/{items.length} completadas
          </div>
        </div>
      );
    }

    return (
      <div className="rounded p-1 bg-gray-200 flex items-center justify-center text-xs" style={{ minHeight: thumbHeight }}>
        {getElementName(element)}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden border shadow-lg',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      ref={containerRef}
    >
      <CardHeader className="flex items-center justify-between space-y-0 py-2">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-gray-600" />
          </div>
          <input
            ref={titleInputRef}
            type="text"
            value={containerContent.title || 'Nuevo Contenedor'}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            className="text-sm font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1"
            placeholder="Título del contenedor"
          />
          <SaveStatusIndicator status={titleSaveStatus} />
        </div>

        <div className="flex items-center gap-1">
          <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
              <TwitterPicker
                color={backgroundColor}
                onChange={handleColorChange}
                colors={COLOR_PALETTE.map(c => c.value)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); handleLayoutToggle(); }}
          >
            <Columns2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <div className="flex flex-col h-full gap-2">
          <div className="text-xs text-gray-600 text-center">
            {layout === 'single' ? 'Vista única' : 'Vista de 2 columnas'}
          </div>

          <div className={cn(
            'flex-1 overflow-y-auto gap-2',
            layout === 'single' ? 'flex flex-col' : 'grid grid-cols-2 gap-2'
          )}>
            {containedElements.length === 0 ? (
              <div className="flex items-center justify-center text-gray-400 text-sm p-4">
                Arrastra elementos aquí
              </div>
            ) : (
              containedElements.map(({ elementId, element }) => (
                <div
                  key={elementId}
                  className="relative border border-gray-200 rounded p-2 bg-white shadow-sm"
                  onClick={() => onEditElement(elementId)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium truncate flex-1">
                      {getElementName(element)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReleaseElement(elementId);
                      }}
                    >
                      <LinkIcon className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    {getElementPreview(element)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}