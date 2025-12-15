'use client';

import React, { useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, X, Zap, Calendar, Users, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const QUADRANTS = {
  do: { 
    label: 'HACER YA', 
    subtitle: 'Urgente e Importante',
    bg: '#FFCDD2', 
    border: '#E53935',
    icon: Zap,
  },
  schedule: { 
    label: 'PROGRAMAR', 
    subtitle: 'Importante, No Urgente',
    bg: '#C8E6C9', 
    border: '#43A047',
    icon: Calendar,
  },
  delegate: { 
    label: 'DELEGAR', 
    subtitle: 'Urgente, No Importante',
    bg: '#BBDEFB', 
    border: '#1E88E5',
    icon: Users,
  },
  eliminate: { 
    label: 'ELIMINAR', 
    subtitle: 'Ni Urgente Ni Importante',
    bg: '#F5F5F5', 
    border: '#9E9E9E',
    icon: Trash2,
  },
};

type QuadrantKey = keyof typeof QUADRANTS;

interface Task {
  id: string;
  text: string;
}

interface EisenhowerContent {
  quadrants: Record<QuadrantKey, Task[]>;
}

export default function EisenhowerMatrixElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement } = props;

  const defaultQuadrants: Record<QuadrantKey, Task[]> = {
    do: [], schedule: [], delegate: [], eliminate: []
  };

  const safeContent: EisenhowerContent = 
    typeof content === 'object' && content !== null && 'quadrants' in content
      ? (content as EisenhowerContent)
      : { quadrants: defaultQuadrants };

  const [newTaskText, setNewTaskText] = useState<Record<QuadrantKey, string>>({
    do: '', schedule: '', delegate: '', eliminate: ''
  });

  const addTask = useCallback((quadrant: QuadrantKey) => {
    const text = newTaskText[quadrant].trim();
    if (!text) return;
    
    const newTask: Task = { id: `task-${Date.now()}`, text };
    const updatedQuadrants = {
      ...safeContent.quadrants,
      [quadrant]: [...(safeContent.quadrants[quadrant] || []), newTask]
    };
    onUpdate(id, { content: { quadrants: updatedQuadrants } });
    setNewTaskText(prev => ({ ...prev, [quadrant]: '' }));
  }, [id, safeContent, newTaskText, onUpdate]);

  const deleteTask = useCallback((quadrant: QuadrantKey, taskId: string) => {
    const updatedQuadrants = {
      ...safeContent.quadrants,
      [quadrant]: safeContent.quadrants[quadrant].filter(t => t.id !== taskId)
    };
    onUpdate(id, { content: { quadrants: updatedQuadrants } });
  }, [id, safeContent, onUpdate]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const sourceQuadrant = result.source.droppableId as QuadrantKey;
    const destQuadrant = result.destination.droppableId as QuadrantKey;
    
    const newQuadrants = { ...safeContent.quadrants };
    const sourceItems = [...(newQuadrants[sourceQuadrant] || [])];
    const [movedTask] = sourceItems.splice(result.source.index, 1);
    newQuadrants[sourceQuadrant] = sourceItems;
    
    const destItems = [...(newQuadrants[destQuadrant] || [])];
    destItems.splice(result.destination.index, 0, movedTask);
    newQuadrants[destQuadrant] = destItems;
    
    onUpdate(id, { content: { quadrants: newQuadrants } });
  }, [id, safeContent, onUpdate]);

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[600px] min-h-[500px]',
        'rounded-xl shadow-lg border-2 border-gray-200',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{ backgroundColor: '#FFFFFF' }}
      onClick={() => onEditElement(id)}
    >
      <div className="p-3 border-b bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-grab">
            <GripVertical className="h-4 w-4 text-white/70" />
          </div>
          <h3 className="text-white font-bold text-lg">📊 Matriz de Eisenhower</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white"
          onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-2">
          {(Object.entries(QUADRANTS) as [QuadrantKey, typeof QUADRANTS.do][]).map(([key, quadrant]) => {
            const Icon = quadrant.icon;
            return (
              <Droppable key={key} droppableId={key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'rounded-lg p-3 flex flex-col transition-all',
                      snapshot.isDraggingOver && 'ring-2 ring-offset-1'
                    )}
                    style={{ 
                      backgroundColor: quadrant.bg,
                      borderLeft: `4px solid ${quadrant.border}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4" style={{ color: quadrant.border }} />
                      <div>
                        <div className="font-bold text-sm" style={{ color: quadrant.border }}>
                          {quadrant.label}
                        </div>
                        <div className="text-[10px] text-gray-500">{quadrant.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto space-y-1 mb-2">
                      {(safeContent.quadrants[key] || []).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'bg-white rounded px-2 py-1 text-xs flex items-center justify-between group shadow-sm',
                                snapshot.isDragging && 'shadow-lg'
                              )}
                            >
                              <span>{task.text}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTask(key, task.id); }}
                                className="opacity-0 group-hover:opacity-100 ml-1"
                              >
                                <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>

                    <div className="flex gap-1">
                      <Input
                        placeholder="Nueva tarea..."
                        value={newTaskText[key]}
                        onChange={(e) => setNewTaskText(prev => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addTask(key)}
                        className="h-7 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button size="sm" className="h-7 px-2" 
                        style={{ backgroundColor: quadrant.border }}
                        onClick={(e) => { e.stopPropagation(); addTask(key); }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </Card>
  );
}
