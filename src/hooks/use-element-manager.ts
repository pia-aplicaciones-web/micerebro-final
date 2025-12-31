
// @ts-nocheck
'use client';

import { useCallback, useRef, useEffect } from 'react';
import { initFirebase, getFirebaseFirestore } from '@/lib/firebase';
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  addDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import type { ElementType, CanvasElement, WithId, CanvasElementProperties, StickyCanvasElement, ElementContent } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/AuthContext';

export function useElementManager(boardId: string, getViewportCenter: () => { x: number, y: number }, getNextZIndex: (baseElementId?: string) => number) {
  const { user } = useAuthContext() as any;
  const { toast } = useToast();
  // Instancia global de Firestore (se inicializa en cliente). Si es null, los handlers harán early-return.
  const firestore = getFirebaseFirestore();

  useEffect(() => {
    initFirebase().catch(() => {});
  }, []);

  // CRÍTICO: Usar refs para funciones que pueden cambiar frecuentemente
  // Esto previene re-creaciones constantes de addElement
  const getViewportCenterRef = useRef(getViewportCenter);
  const getNextZIndexRef = useRef(getNextZIndex);

  // Actualizar refs cuando cambian
  useEffect(() => {
    getViewportCenterRef.current = getViewportCenter;
    getNextZIndexRef.current = getNextZIndex;
  }, [getViewportCenter, getNextZIndex]);

  const addElement = useCallback(async (type: ElementType, props?: { color?: string; content?: ElementContent; properties?: CanvasElementProperties; parentId?: string; tags?: string[] }): Promise<string> => {
    const userId = user?.uid;
    if (!firestore || !userId || !boardId) {
      const errorMsg = !firestore ? 'Firestore no está disponible' : !userId ? 'Usuario no autenticado' : 'Board ID no válido';
      return Promise.reject(new Error(errorMsg));
    }
    const elementsRef = collection(firestore, 'users', userId, 'canvasBoards', boardId, 'canvasElements');
    const defaultPosition = getViewportCenterRef.current(); // ✅ Usar ref
    
    // REGLAS GENERALES: Elementos de cuadernos y contenedores inician con zIndex -1
    // Otros elementos van a la primera capa (zIndex máximo + 1)
    const isNotebookElement = ['notepad', 'yellow-notepad', 'notes', 'mini-notes', 'mini', 'container', 'two-columns'].includes(type);
    const zIndex = getNextZIndexRef.current(); // ✅ REGLA: Todos los elementos nuevos aparecen en primera capa

    // REGLA #1: Los elementos se abren centrados en el viewport del usuario
    // Si no se proporciona una posición específica, usar el centro del viewport
    // IMPORTANTE: Verificar que props existe antes de acceder a properties
    const viewportCenter = (props && props.properties && props.properties.position) 
      ? props.properties.position 
      : defaultPosition;
    const baseSize = (props && props.properties && props.properties.size)
      ? props.properties.size
      : { width: 200, height: 150 };
    const sizeWidth = typeof baseSize.width === 'number' ? baseSize.width : 200;
    const sizeHeight = typeof baseSize.height === 'number' ? baseSize.height : 150;

    // Helper: Calcula la posición para centrar el elemento en el viewport VISIBLE
    // REGLA CRÍTICA: Los elementos deben aparecer en el ESPACIO VISIBLE del usuario
    // El elemento debe estar centrado en el área visible del tablero
    const getCenteredPosition = (width: number, height: number) => {
      // Obtener el centro del viewport visible (ya calculado con scroll y scale)
      const centerX = viewportCenter.x;
      const centerY = viewportCenter.y;
      
      // Calcular posición centrada ideal (centro del elemento = centro del viewport visible)
      let x = centerX - (width / 2);
      let y = centerY - (height / 2);
      
      // CRÍTICO: Asegurar que el elemento aparezca SIEMPRE en el área visible
      // Si el cálculo da negativo, ajustar para que al menos parte del elemento sea visible
      // Mínimo: asegurar que la esquina superior izquierda esté dentro del viewport visible
      const minOffset = 20; // Margen mínimo desde el borde visible
      
      // Obtener dimensiones del viewport en coordenadas del canvas
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
      
      // Asegurar que el elemento quede dentro del área visible del viewport
      // Si el elemento es más pequeño que el viewport, centrarlo
      // Si es más grande, asegurar que al menos parte sea visible
      if (width <= viewportWidth) {
        // Elemento cabe en el viewport: centrarlo
        x = Math.max(minOffset, Math.min(x, centerX + viewportWidth / 2 - width));
      } else {
        // Elemento más grande que el viewport: alinear para que sea visible desde el inicio
        x = Math.max(minOffset, centerX - viewportWidth / 4);
      }
      
      if (height <= viewportHeight) {
        // Elemento cabe en el viewport: centrarlo
        y = Math.max(minOffset, Math.min(y, centerY + viewportHeight / 2 - height));
      } else {
        // Elemento más grande que el viewport: alinear para que sea visible desde el inicio
        y = Math.max(minOffset, centerY - viewportHeight / 4);
      }
      
      // Verificación final: NUNCA permitir coordenadas negativas
      return { 
        x: Math.max(0, x), 
        y: Math.max(0, y)
      };
    };

    // Construir baseProperties de forma segura
    const baseProperties: Partial<CanvasElementProperties> = {
      size: baseSize,
      zIndex: zIndex,
      rotation: 0,
    };
    
    // Agregar propiedades adicionales de props si existen
    if (props && props.properties && typeof props.properties === 'object') {
      Object.assign(baseProperties, props.properties);
    }

    let newElementData: Omit<WithId<CanvasElement>, 'id'> & { type: ElementType };

    switch (type) {
      case 'notepad':
        // Dimensiones dependen del formato, por defecto 20x15 (20cm x 15cm)
        const notepadFormat = (props?.properties as any)?.format || 'letter';
        let notepadSize;
        if (notepadFormat === '10x15') {
          notepadSize = { width: 378, height: 567 }; // 10cm x 15cm
        } else if (notepadFormat === '20x15') {
          notepadSize = { width: 756, height: 567 }; // 20cm x 15cm
        } else {
          notepadSize = { width: 794, height: 978 }; // letter (8.5" x 11")
        }
        const notepadPos = getCenteredPosition(notepadSize.width, notepadSize.height);
        newElementData = {
          type,
          x: notepadPos.x,
          y: notepadPos.y,
          width: notepadSize.width,
          height: notepadSize.height,
          userId,
          properties: { ...baseProperties, position: notepadPos, size: notepadSize, format: notepadFormat, zIndex: -1 },
          content: { title: 'Nuevo Cuaderno', pages: Array(2).fill('<div><br></div>'), currentPage: 0 },
          zIndex: -1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }; break;
      case 'sticky':
        const stickyColor = props?.color || 'yellow';
        const stickySize = { width: 224, height: 224 };
        const stickyPos = getCenteredPosition(stickySize.width, stickySize.height);
        const stickyElement: Omit<StickyCanvasElement, 'id'> = { 
          type: 'sticky', 
          x: stickyPos.x, 
          y: stickyPos.y, 
          width: stickySize.width, 
          height: stickySize.height, 
          userId, 
          properties: { ...baseProperties, position: stickyPos, size: stickySize, color: stickyColor } as CanvasElementProperties, 
          content: (typeof props?.content === 'string' ? props.content : 'Escribe algo...'), 
          zIndex, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp(),
          ...(props?.tags && { tags: props.tags }),
        };
        newElementData = stickyElement; break;
      case 'todo':
        const todoSize = { width: 300, height: 150 };
        const todoPos = getCenteredPosition(todoSize.width, todoSize.height);
        newElementData = { type, x: todoPos.x, y: todoPos.y, width: todoSize.width, height: todoSize.height, userId, properties: { ...baseProperties, position: todoPos, size: todoSize }, content: props?.content || { title: 'Lista de Tareas', items: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'image':
        const imagePos = getCenteredPosition(sizeWidth, sizeHeight);
        newElementData = { type, x: imagePos.x, y: imagePos.y, width: sizeWidth, height: sizeHeight, userId, properties: { ...baseProperties, position: imagePos, size: { width: sizeWidth, height: sizeHeight } }, content: props?.content || { url: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'text':
        const textPos = getCenteredPosition(sizeWidth, sizeHeight);
        const textBgColor = (props?.properties as CanvasElementProperties)?.backgroundColor || '#ffffff';
        newElementData = { type, x: textPos.x, y: textPos.y, width: sizeWidth, height: sizeHeight, userId, properties: { ...baseProperties, position: textPos, size: { width: sizeWidth, height: sizeHeight }, backgroundColor: textBgColor }, content: props?.content || '<div style="font-size: 15px;">Escribe algo...</div>', color: props?.color || 'white', zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'comment':
        const commentSize = { width: 32, height: 32 };
        const commentPos = getCenteredPosition(commentSize.width, commentSize.height);
        newElementData = { type, x: commentPos.x, y: commentPos.y, width: commentSize.width, height: commentSize.height, userId, properties: { ...baseProperties, position: commentPos, size: commentSize }, content: props?.content || { title: '', label: '', comment: '' }, parentId: props?.parentId || undefined, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'comment-r':
        const commentRSize = { width: 240, height: 140 };
        const commentRPos = getCenteredPosition(commentRSize.width, commentRSize.height);
        newElementData = { type, x: commentRPos.x, y: commentRPos.y, width: commentRSize.width, height: commentRSize.height, userId, properties: { ...baseProperties, position: commentRPos, size: commentRSize }, content: props?.content || { text: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'moodboard':
        const moodboardSize = { width: 600, height: 500 };
        const moodboardPos = getCenteredPosition(moodboardSize.width, moodboardSize.height);
        newElementData = { type, x: moodboardPos.x, y: moodboardPos.y, width: moodboardSize.width, height: moodboardSize.height, userId, properties: { ...baseProperties, position: moodboardPos, size: moodboardSize, backgroundColor: '#ffffff' }, content: props?.content || { title: 'Nuevo Moodboard', images: [], annotations: [], layout: 'grid' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'stopwatch':
        const stopwatchSize = { width: 200, height: 120 };
        const stopwatchPos = getCenteredPosition(stopwatchSize.width, stopwatchSize.height);
        newElementData = { type: 'stopwatch' as ElementType, x: stopwatchPos.x, y: stopwatchPos.y, width: stopwatchSize.width, height: stopwatchSize.height, userId, properties: { ...baseProperties, position: stopwatchPos, size: stopwatchSize, backgroundColor: '#000000' }, content: { time: 0, isRunning: false }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<WithId<CanvasElement>, 'id'> & { type: ElementType }; break;
      case 'countdown':
        const countdownSize = { width: 200, height: 180 };
        const countdownPos = getCenteredPosition(countdownSize.width, countdownSize.height);
        newElementData = { type: 'countdown' as ElementType, x: countdownPos.x, y: countdownPos.y, width: countdownSize.width, height: countdownSize.height, userId, properties: { ...baseProperties, position: countdownPos, size: countdownSize, backgroundColor: '#000000' }, content: { timeLeft: 0, selectedMinutes: 5, isRunning: false }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<WithId<CanvasElement>, 'id'> & { type: ElementType }; break;
      case 'highlight-text':
        const highlightSize = { width: 300, height: 150 };
        const highlightPos = getCenteredPosition(highlightSize.width, highlightSize.height);
        const highlightColor = (props?.properties?.backgroundColor) ? props.properties.backgroundColor : '#fffb8b';
        newElementData = { type: 'highlight-text' as ElementType, x: highlightPos.x, y: highlightPos.y, width: highlightSize.width, height: highlightSize.height, userId, properties: { ...baseProperties, position: highlightPos, size: highlightSize, backgroundColor: highlightColor }, content: { text: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<WithId<CanvasElement>, 'id'> & { type: ElementType }; break;
      case 'yellow-notepad':
        // Tamaño basado en las imágenes: aproximadamente 400x600px (portrait)
        const yellowNotepadSize = { width: 400, height: 600 };
        const yellowNotepadPos = getCenteredPosition(yellowNotepadSize.width, yellowNotepadSize.height);
        newElementData = { type, x: yellowNotepadPos.x, y: yellowNotepadPos.y, width: yellowNotepadSize.width, height: yellowNotepadSize.height, userId, properties: { ...baseProperties, position: yellowNotepadPos, size: yellowNotepadSize, backgroundColor: '#FFFFE0' }, content: props?.content || { pages: Array(2).fill(''), currentPage: 0, searchQuery: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'notes':
        const notesSize = { width: 794, height: 567 }; // 21cm x 15cm (horizontal)
        const notesPos = getCenteredPosition(notesSize.width, notesSize.height);
        newElementData = { type, x: notesPos.x, y: notesPos.y, width: notesSize.width, height: notesSize.height, userId, properties: { ...baseProperties, position: notesPos, size: notesSize, backgroundColor: '#dcefe1' }, content: props?.content || { pages: Array(2).fill('<div><br></div>'), currentPage: 0, searchQuery: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'mini-notes':
        const miniNotesSize = { width: 227, height: 378 }; // 6cm x 10cm
        const miniNotesPos = getCenteredPosition(miniNotesSize.width, miniNotesSize.height);
        newElementData = { type, x: miniNotesPos.x, y: miniNotesPos.y, width: miniNotesSize.width, height: miniNotesSize.height, userId, properties: { ...baseProperties, position: miniNotesPos, size: miniNotesSize, backgroundColor: '#f9fb6a' }, content: props?.content || { text: '', searchQuery: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'weekly-planner':
      case 'vertical-weekly-planner':
        const plannerSize = { width: 794, height: 567 };
        const plannerPos = getCenteredPosition(plannerSize.width, plannerSize.height);
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
        newElementData = {
          type,
          x: plannerPos.x,
          y: plannerPos.y,
          width: plannerSize.width,
          height: plannerSize.height,
          userId,
          properties: {
            ...baseProperties,
            position: plannerPos,
            size: plannerSize,
            weekStart,
          },
          content: props?.content || { days: {} },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'container':
      case 'two-columns':
        const containerSize = { width: 378, height: 567 };
        const containerPos = getCenteredPosition(containerSize.width, containerSize.height);
        newElementData = {
          type,
          x: containerPos.x,
          y: containerPos.y,
          width: containerSize.width,
          height: containerSize.height,
          userId,
          properties: {
            ...baseProperties,
            position: containerPos,
            size: containerSize,
            backgroundColor: '#ffffff',
            zIndex: -1,
          },
          content: {
            title: 'Nuevo Contenedor',
            elementIds: [],
            layout: type === 'two-columns' ? 'two-columns' : 'single',
          },
          zIndex: -1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'locator':
        const locSize = { width: 120, height: 120 };
        const locPos = getCenteredPosition(locSize.width, locSize.height);
        newElementData = {
          type,
          x: locPos.x,
          y: locPos.y,
          width: locSize.width,
          height: locSize.height,
          userId,
          properties: { ...baseProperties, position: locPos, size: locSize },
          content: { label: 'Localizador' },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'image-frame':
        const frameSize = { width: 300, height: 300 };
        const framePos = getCenteredPosition(frameSize.width, frameSize.height);
        newElementData = {
          type,
          x: framePos.x,
          y: framePos.y,
          width: frameSize.width,
          height: frameSize.height,
          userId,
          properties: { ...baseProperties, position: framePos, size: frameSize },
          content: { url: '', zoom: 1, panX: 0, panY: 0, rotation: 0 },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'comment-small':
        const smallCommentSize = { width: 150, height: 60 };
        const smallCommentPos = getCenteredPosition(smallCommentSize.width, smallCommentSize.height);
        newElementData = {
          type: 'comment-small',
          x: smallCommentPos.x,
          y: smallCommentPos.y,
          width: smallCommentSize.width,
          height: smallCommentSize.height,
          userId,
          properties: {
            ...baseProperties,
            position: smallCommentPos,
            size: smallCommentSize,
            backgroundColor: '#ffffff',
            fontSize: 10,
          },
          content: { text: '' },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'weekly-menu':
        const menuSize = { width: 1200, height: 900 };
        const menuPos = getCenteredPosition(menuSize.width, menuSize.height);
        const menuWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
        newElementData = {
          type,
          x: menuPos.x,
          y: menuPos.y,
          width: menuSize.width,
          height: menuSize.height,
          userId,
          properties: {
            ...baseProperties,
            position: menuPos,
            size: menuSize,
            weekStart: menuWeekStart,
            backgroundColor: '#008080', // Teal
          },
          content: props?.content || { days: {} },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'photo-grid':
        const gridSize = { width: 400, height: 400 };
        const gridPos = getCenteredPosition(gridSize.width, gridSize.height);
        newElementData = {
          type,
          x: gridPos.x,
          y: gridPos.y,
          width: gridSize.width,
          height: gridSize.height,
          userId,
          properties: { ...baseProperties, position: gridPos, size: gridSize },
          content: {
            title: 'guia',
            rows: 2,
            columns: 2,
            cells: [],
            layoutMode: 'default',
          },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'photo-grid-horizontal':
        const gridHSize = { width: 560, height: 360 };
        const gridHPos = getCenteredPosition(gridHSize.width, gridHSize.height);
        newElementData = {
          type,
          x: gridHPos.x,
          y: gridHPos.y,
          width: gridHSize.width,
          height: gridHSize.height,
          userId,
          properties: { ...baseProperties, position: gridHPos, size: gridHSize },
          content: {
            title: 'guia',
            rows: 2,
            columns: 3,
            cells: [],
            layoutMode: 'horizontal',
          },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'photo-grid-adaptive':
        const gridASize = { width: 480, height: 420 };
        const gridAPos = getCenteredPosition(gridASize.width, gridASize.height);
        newElementData = {
          type,
          x: gridAPos.x,
          y: gridAPos.y,
          width: gridASize.width,
          height: gridASize.height,
          userId,
          properties: { ...baseProperties, position: gridAPos, size: gridASize },
          content: {
            title: 'guia',
            rows: 2,
            columns: 2,
            cells: [],
            layoutMode: 'adaptive',
          },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'photo-grid-free':
        const freeSize = { width: 600, height: 500 };
        const freePos = getCenteredPosition(freeSize.width, freeSize.height);
        newElementData = {
          type,
          x: freePos.x,
          y: freePos.y,
          width: freeSize.width,
          height: freeSize.height,
          userId,
          properties: { ...baseProperties, position: freePos, size: freeSize },
          content: { title: 'guia', imageIds: [] },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'libreta':
        const libretaSize = { width: 378, height: 567 }; // 10x15 cm
        const libretaPos = getCenteredPosition(libretaSize.width, libretaSize.height);
        newElementData = {
          type,
          x: libretaPos.x,
          y: libretaPos.y,
          width: libretaSize.width,
          height: libretaSize.height,
          userId,
          properties: { ...baseProperties, position: libretaPos, size: libretaSize },
          content: { title: 'Libreta', pages: Array(2).fill('<div><br></div>'), currentPage: 0 },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'mini':
        const miniSize = { width: 302, height: 529 }; // 8cm x 14cm
        const miniPos = getCenteredPosition(miniSize.width, miniSize.height);
        newElementData = {
          type,
          x: miniPos.x,
          y: miniPos.y,
          width: miniSize.width,
          height: miniSize.height,
          userId,
          properties: { ...baseProperties, position: miniPos, size: miniSize },
          content: { text: '', searchQuery: '' },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'pomodoro-timer':
        const pomodoroSize = { width: 260, height: 200 };
        const pomodoroPos = getCenteredPosition(pomodoroSize.width, pomodoroSize.height);
        newElementData = { type, x: pomodoroPos.x, y: pomodoroPos.y, width: pomodoroSize.width, height: pomodoroSize.height, userId, properties: { ...baseProperties, position: pomodoroPos, size: pomodoroSize, backgroundColor: '#ffffff' }, content: { durationSeconds: 25 * 60, remainingSeconds: 25 * 60, running: false }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'gallery':
        const gallerySize = { width: 378, height: 800 };
        const galleryPos = getCenteredPosition(gallerySize.width, gallerySize.height);
        newElementData = { type, x: galleryPos.x, y: galleryPos.y, width: gallerySize.width, height: gallerySize.height, userId, properties: { ...baseProperties, position: galleryPos, size: gallerySize, backgroundColor: '#ffffff' }, content: (props === null || props === void 0 ? void 0 : props.content) || { title: 'Galería', images: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      default: return Promise.reject(new Error(`Tipo de elemento inválido: ${type}`));
    }

    // Validación final: asegurar que content nunca sea undefined
    if (newElementData.content === undefined) {
      console.error(`Elemento ${type} creado sin content válido. Asignando valor por defecto.`);
      newElementData.content = { title: 'Elemento sin contenido' };
    }

    const docRef = await addDoc(elementsRef, newElementData);
    return docRef.id;
  }, [firestore, user, boardId]); // ✅ Removido getNextZIndex y getViewportCenter - usar directamente sin dependencias

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    if (!firestore || !user || !boardId) return;
    const elementDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements', id);
    
    // Limpiar valores undefined (Firestore no los acepta)
    const cleanUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      } else if (key === 'parentId') {
        // Si parentId es undefined, usar null para eliminarlo (Firestore acepta null)
        cleanUpdates[key] = null;
      }
    });
    
    // Actualizar el elemento
    updateDoc(elementDocRef, cleanUpdates);
    
    // AUTOGUARDADO DEL TABLERO: Actualizar también el tablero con updatedAt
    // Esto asegura que el tablero refleje siempre la última modificación
    const boardDocRef = doc(firestore, 'users', user.uid, 'canvasBoards', boardId);
    updateDoc(boardDocRef, { updatedAt: serverTimestamp() }).catch(err => {
      console.error('Error actualizando tablero:', err);
    });
  }, [firestore, user, boardId]);

  const deleteElement = useCallback(async (id: string, allElements: WithId<CanvasElement>[]) => {
    if (!firestore || !user || !boardId) return;
    
    const elementToDeleteRef = allElements.find(el => el.id === id);
    if (!elementToDeleteRef) return;

    const elementsRef = collection(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements');
    const batch = writeBatch(firestore);
    const elementDocRef = doc(elementsRef, id);
    
    batch.delete(elementDocRef);

    await batch.commit();
  }, [firestore, user, boardId]);

  const unanchorElement = useCallback(async (elementId: string) => {
    // Contenedores eliminados: función sin efecto
      return;
  }, [firestore, user, boardId, toast]);

  return { addElement, updateElement, deleteElement, unanchorElement };
}
