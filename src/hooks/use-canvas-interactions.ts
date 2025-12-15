
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { WithId, CanvasElement, ElementType } from '@/lib/types';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

type CanvasInteractionsProps = {
  boardId: string;
  canvasRef: React.RefObject<any>;
  elements: WithId<CanvasElement>[];
  addElement: (type: ElementType, props?: any) => Promise<string>;
  getNextZIndex: (baseElementId?: string) => number;
};

export function useCanvasInteractions({
  boardId,
  canvasRef,
  elements,
  addElement,
  getNextZIndex,
}: CanvasInteractionsProps) {
  const firestore = getFirebaseFirestore();
  const { user } = useAuthContext();

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activatedElementId, setActivatedElementId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<WithId<CanvasElement> | null>(null);
  const [isConnectorsMenuOpen, setIsConnectorsMenuOpen] = useState(false);
  const fileInputref = useRef<HTMLInputElement>(null);

  const selectedElement = useMemo(() => {
    if (selectedElementIds.length !== 1) return null;
    const elementId = selectedElementIds[0];
    return elements.find(el => el.id === elementId) || null;
  }, [selectedElementIds, elements]);
  
  const duplicateElement = useCallback(async (elementId: string) => {
    const elementToDuplicate = elements.find(el => el.id === elementId);
    if (!elementToDuplicate || !elementToDuplicate.properties || !elementToDuplicate.properties.position) return;

    const newPosition = {
        x: elementToDuplicate.properties.position.x + 20,
        y: elementToDuplicate.properties.position.y + 20,
    };
    
    const newElementProps = {
        ...elementToDuplicate,
        properties: {
            ...elementToDuplicate.properties,
            position: newPosition,
            zIndex: getNextZIndex(),
        },
        content: JSON.parse(JSON.stringify(elementToDuplicate.content)),
    };
    
    delete (newElementProps as any).id;

    const newId = await addElement(elementToDuplicate.type, newElementProps);
    setSelectedElementIds([newId]);

  }, [elements, addElement, getNextZIndex]);


  const saveLastView = useCallback(() => {
    if (!canvasRef.current || !firestore || !user || !boardId) return;

      const { scale, x, y } = canvasRef.current.getTransform();
      const boardDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId);
      updateDoc(boardDocRef, {
        lastView: { scale, scrollX: x, scrollY: y },
        updatedAt: serverTimestamp()
      }).catch(err => console.error("Could not save last view:", err));
  }, [firestore, user, boardId, canvasRef]);


  useEffect(() => {
    const handleBeforeUnload = () => saveLastView();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveLastView]);

  
  const handleTriggerUpload = () => fileInputref.current?.click();

  return {
    selectedElementIds,
    setSelectedElementIds,
    activatedElementId,
    setActivatedElementId,
    editingComment,
    setEditingComment,
    isConnectorsMenuOpen,
    setIsConnectorsMenuOpen,
    fileInputref,
    selectedElement,
    saveLastView,
    handleTriggerUpload,
    duplicateElement,
  };
}
