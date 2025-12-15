'use client';

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { WithId, CanvasElement } from '@/lib/types';

interface ElementInfoPanelProps {
  element: WithId<CanvasElement> | null;
  isVisible: boolean;
  onClose: () => void;
}

export default function ElementInfoPanel({ element, isVisible, onClose }: ElementInfoPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!isVisible || !element) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(element.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar ID:', err);
    }
  };

  const safeProperties = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
  const position = safeProperties.position || { x: element.x || 0, y: element.y || 0 };
  const size = safeProperties.size || { width: element.width || 0, height: element.height || 0 };

  return (
    <Card className="fixed top-4 right-4 w-80 z-[9999] shadow-xl border-2 border-blue-500 bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            📋 Información del Elemento
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Tipo */}
        <div>
          <span className="font-medium text-gray-600">Tipo:</span>
          <span className="ml-2 text-gray-800 capitalize">{element.type}</span>
        </div>

        {/* ID */}
        <div>
          <span className="font-medium text-gray-600">ID:</span>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
              {element.id}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={handleCopyId}
              title="Copiar ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Posición */}
        <div>
          <span className="font-medium text-gray-600">Posición:</span>
          <div className="ml-2 mt-1 text-gray-800">
            <div>X: {Math.round(position.x)}px</div>
            <div>Y: {Math.round(position.y)}px</div>
          </div>
        </div>

        {/* Tamaño */}
        <div>
          <span className="font-medium text-gray-600">Tamaño:</span>
          <div className="ml-2 mt-1 text-gray-800">
            <div>Ancho: {Math.round(typeof size.width === 'number' ? size.width : 0)}px</div>
            <div>Alto: {Math.round(typeof size.height === 'number' ? size.height : 0)}px</div>
          </div>
        </div>

        {/* Z-Index */}
        {element.zIndex !== undefined && (
          <div>
            <span className="font-medium text-gray-600">Z-Index:</span>
            <span className="ml-2 text-gray-800">{element.zIndex}</span>
          </div>
        )}

        {/* Parent ID si existe */}
        {element.parentId && (
          <div>
            <span className="font-medium text-gray-600">Padre:</span>
            <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
              {element.parentId.substring(0, 8)}...
            </code>
          </div>
        )}

        {/* Propiedades adicionales según tipo */}
        {element.type === 'container' && (
          <div>
            <span className="font-medium text-gray-600">Elementos:</span>
            <span className="ml-2 text-gray-800">
              {typeof element.content === 'object' && element.content !== null && 'elementIds' in element.content
                ? (element.content.elementIds as string[]).length
                : 0}
            </span>
          </div>
        )}

        {element.type === 'sticky' && element.color && (
          <div>
            <span className="font-medium text-gray-600">Color:</span>
            <div className="ml-2 mt-1 flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: element.color }}
              />
              <span className="text-gray-800">{element.color}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

