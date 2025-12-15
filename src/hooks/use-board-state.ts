// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, writeBatch, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { WithId, CanvasBoard, CanvasElement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function useBoardState(boardId: string) {
  const firestore = getFirebaseFirestore();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const router = useRouter();
  
  // CRÍTICO: Usar refs para router y toast para evitar re-suscripciones infinitas
  // Estos objetos cambian frecuentemente y NO deben estar en dependencias de useEffect
  const routerRef = useRef(router);
  const toastRef = useRef(toast);
  
  // Actualizar refs cuando cambian
  useEffect(() => {
    routerRef.current = router;
    toastRef.current = toast;
  }, [router, toast]);

  const [board, setBoard] = useState<WithId<CanvasBoard> | null>(null);
  const [boards, setBoards] = useState<WithId<CanvasBoard>[]>([]);
  const [elements, setElements] = useState<WithId<CanvasElement>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all boards for the user
  useEffect(() => {
    if (!firestore || !user) return;
    const boardsQuery = query(
      collection(firestore, 'users', user.uid, 'canvasBoards'),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(boardsQuery, (snapshot) => {
      const boardsData = snapshot.docs.map((doc) => ({
        ...(doc.data() as CanvasBoard),
        id: doc.id,
      }));
      setBoards(boardsData);
    }, (error) => {
      console.error('Error fetching boards list:', error);
    });
    return () => unsubscribe();
  }, [firestore, user]);

  // Subscribe to current board details
  // CRÍTICO: NO crear listener de elements aquí - useBoardStore ya lo maneja
  // Solo crear listener de board para obtener datos del tablero (nombre, etc.)
  useEffect(() => {
    if (!firestore || !user || !boardId) return;

    setIsLoading(true);
    const boardDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId);

    const unsubBoard = onSnapshot(boardDocRef, (doc) => {
      if (doc.exists()) {
        setBoard({ ...(doc.data() as CanvasBoard), id: doc.id });
      } else {
        // Si el tablero no existe para este usuario, crear uno nuevo y redirigir
        (async () => {
          try {
            const db = firestore as any;
            const boardsCollection = collection(db, 'users', user.uid, 'canvasBoards');
            const newBoardRef = doc(boardsCollection);
            const batch = writeBatch(db);
            batch.set(newBoardRef, {
              name: 'Mi Tablero',
              userId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            await batch.commit();
            toastRef.current({
              title: 'Tablero creado',
              description: 'Se generó un nuevo tablero porque el anterior no existe o no tienes permiso.',
            });
            routerRef.current.push(`/board/${newBoardRef.id}/`);
          } catch (err) {
            console.error('Error creando tablero fallback:', err);
            toastRef.current({
              variant: 'destructive',
              title: 'Error',
              description: 'No se pudo crear un tablero nuevo.',
            });
            routerRef.current.push('/');
          }
        })();
      }
      setIsLoading(false);
    }, (error) => {
        console.error('Error fetching board:', error);
        setIsLoading(false);
        // Usar refs en lugar de valores directos
        toastRef.current({
            variant: 'destructive',
            title: 'Error de Carga',
            description: 'No se pudo cargar el tablero.',
        });
        routerRef.current.push('/');
    });

    // CRÍTICO: NO crear listener de elements aquí
    // useBoardStore.loadBoard() ya crea un listener de elements
    // Crear listener duplicado causa:
    // - Múltiples actualizaciones de estado
    // - Re-renders duplicados
    // - Memory leaks
    // - Saturación del servidor
    // setElements([]); // Mantener vacío - useBoardStore maneja elements

    return () => {
      unsubBoard();
      // NO limpiar unsubElements porque no se crea
    };
  }, [firestore, user, boardId]); // CRÍTICO: Removido router y toast de dependencias

  const handleRenameBoard = useCallback(async (newName: string) => {
    if (!firestore || !user || !boardId || !board || !newName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se puede renombrar el tablero. Verifica que estés autenticado.',
      });
      return;
    }
    if (newName.trim() === board.name) return;

    try {
      const boardDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId);
      await updateDoc(boardDocRef, { 
        name: newName.trim(),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Tablero renombrado", description: `El tablero ahora se llama "${newName.trim()}".` });
    } catch (error: any) {
      console.error('Error renombrando tablero:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo renombrar el tablero. Verifica tus permisos.',
      });
    }
  }, [firestore, user, board, boardId, toast]);
  
  const handleDeleteBoard = useCallback(async () => {
    if (!firestore || !user || !boardId) return;

    toast({ title: 'Eliminando tablero...' });

    try {
        const boardDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId);
        await deleteDoc(boardDocRef);
        toast({ title: 'Tablero eliminado', description: 'El tablero y todo su contenido han sido eliminados.' });
        router.push('/');
    } catch (error) {
        console.error("Error deleting board:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el tablero.' });
    }
  }, [firestore, user, boardId, router, toast]);

  const clearCanvas = useCallback(async (elementsToClear: WithId<CanvasElement>[]) => {
    if (!firestore || !user || !boardId || !elementsToClear) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se puede limpiar el tablero. Verifica que estés autenticado.',
      });
      return;
    }
    
    if (elementsToClear.length === 0) {
      toast({
        title: 'Tablero vacío',
        description: 'El tablero ya está vacío.',
      });
      return;
    }

    try {
      const elementsRef = collection(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements');
      const batch = writeBatch(firestore);
      elementsToClear.forEach(element => batch.delete(doc(elementsRef, element.id)));
      
      // Actualizar updatedAt del tablero
      const boardDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId);
      batch.update(boardDocRef, { updatedAt: serverTimestamp() });
      
      await batch.commit();
      toast({ 
        title: "Tablero Limpio", 
        description: `Se eliminaron ${elementsToClear.length} elemento(s) del tablero.` 
      });
    } catch (error: any) {
      console.error('Error limpiando tablero:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'No se pudo limpiar el tablero. Verifica tus permisos.' 
      });
    }
  }, [firestore, user, boardId, toast]);


  return { board, boards, elements, isLoading, handleRenameBoard, handleDeleteBoard, clearCanvas };
}
