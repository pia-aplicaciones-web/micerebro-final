'use client';

import React, { useRef, useState } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, X } from 'lucide-react';
import { useAutoSave } from '@/hooks/use-auto-save';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  children: string[];
}

export default function MindMapElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onUpdate } = props;
  
  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  
  const mindMapContent = typeof content === 'object' && content !== null && 'nodes' in content
    ? (content as { nodes: { [key: string]: MindMapNode }, rootId: string })
    : { nodes: {}, rootId: '' };

  const [editingNode, setEditingNode] = useState<string | null>(null);

  const addNode = (parentId: string) => {
    const newNodeId = `node-${Date.now()}`;
    const newNodes = { ...mindMapContent.nodes };
    newNodes[newNodeId] = {
      id: newNodeId,
      text: 'Nueva idea',
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      children: [],
    };
    if (parentId && newNodes[parentId]) {
      newNodes[parentId].children.push(newNodeId);
    } else {
      mindMapContent.rootId = newNodeId;
    }
    onUpdate(id, { content: { ...mindMapContent, nodes: newNodes } });
  };

  const updateNodeText = (nodeId: string, text: string) => {
    const newNodes = { ...mindMapContent.nodes };
    if (newNodes[nodeId]) {
      newNodes[nodeId].text = text;
      onUpdate(id, { content: { ...mindMapContent, nodes: newNodes } });
    }
  };

  const deleteNode = (nodeId: string) => {
    const newNodes = { ...mindMapContent.nodes };
    delete newNodes[nodeId];
    Object.values(newNodes).forEach(node => {
      node.children = node.children.filter(id => id !== nodeId);
    });
    onUpdate(id, { content: { ...mindMapContent, nodes: newNodes } });
  };

  const rootNode = mindMapContent.rootId ? mindMapContent.nodes[mindMapContent.rootId] : null;

  if (!rootNode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white rounded-lg shadow-md border border-gray-200">
        <button
          onClick={() => addNode('')}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Crear idea central
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="drag-handle p-2 bg-gray-50 border-b cursor-grab active:cursor-grabbing flex items-center justify-between">
        <span className="text-sm font-semibold">Mapa Conceptual</span>
      </div>
      <div className="flex-1 p-4 overflow-auto relative" style={{ minHeight: '400px' }}>
        <svg className="absolute inset-0 w-full h-full">
          {Object.values(mindMapContent.nodes).map(node =>
            node.children.map(childId => {
              const child = mindMapContent.nodes[childId];
              if (!child) return null;
              return (
                <line
                  key={`${node.id}-${childId}`}
                  x1={node.x + 100}
                  y1={node.y + 20}
                  x2={child.x + 100}
                  y2={child.y + 20}
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
              );
            })
          )}
        </svg>
        {Object.values(mindMapContent.nodes).map(node => (
          <div
            key={node.id}
            className="absolute"
            style={{ left: node.x, top: node.y }}
          >
            <div className="bg-teal-100 border-2 border-teal-400 rounded-lg p-2 min-w-[120px] relative group">
              {editingNode === node.id ? (
                <input
                  type="text"
                  value={node.text}
                  onChange={(e) => updateNodeText(node.id, e.target.value)}
                  onBlur={() => setEditingNode(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
                  className="outline-none bg-transparent w-full"
                  autoFocus
                />
              ) : (
                <div
                  className="cursor-text"
                  onClick={() => setEditingNode(node.id)}
                >
                  {node.text || 'Click para editar'}
                </div>
              )}
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => addNode(node.id)}
                  className="p-1 hover:bg-teal-200 rounded text-xs"
                  title="Agregar hijo"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {node.id !== rootNode.id && (
                  <button
                    onClick={() => deleteNode(node.id)}
                    className="p-1 hover:bg-red-200 rounded text-xs"
                    title="Eliminar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
