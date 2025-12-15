
// @ts-nocheck
'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
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
import type { ElementType, CanvasElement, WithId, CanvasElementProperties, ContainerContent, StickyCanvasElement, ElementContent } from '@/lib/types';
import { startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function useElementManager(boardId: string, getViewportCenter: () => { x: number, y: number }, getNextZIndex: (baseElementId?: string) => number) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

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
    // Asegurar Firestore y UID: intentar contexto; si falta, usar app actual y esperar a auth
    let db = firestore;
    let uid = user?.uid || null;

    if (!db || !uid) {
      try {
        const { firebaseConfig } = await import('@/lib/firebase');
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        db = db || getFirestore(app);

        if (!uid) {
          const auth = getAuth(app);
          // Si ya hay usuario en auth, úsalo
          if (auth.currentUser?.uid) {
            uid = auth.currentUser.uid;
          } else {
            // Esperar a que auth se sincronice (timeout corto)
            uid = await new Promise<string | null>((resolve, reject) => {
              const timeout = setTimeout(() => {
                unsubscribe();
                resolve(null);
              }, 2000);
              const unsubscribe = onAuthStateChanged(
                auth,
                (u) => {
                  clearTimeout(timeout);
                  unsubscribe();
                  resolve(u?.uid || null);
                },
                (err) => {
                  clearTimeout(timeout);
                  unsubscribe();
                  reject(err);
                }
              );
            });
          }
        }
      } catch (e) {
        // continuar al chequeo final
      }
    }

    const resolvedDb = db || firestore;
    const resolvedUid = uid || user?.uid || null;

    if (!resolvedDb || !resolvedUid || !boardId) {
      const errorMsg = !resolvedDb
        ? 'Firestore no está disponible'
        : !resolvedUid
        ? 'Usuario no autenticado (uid ausente)'
        : 'Board ID no válido';
      return Promise.reject(new Error(errorMsg));
    }

    const elementsRef = collection(resolvedDb, 'users', resolvedUid, 'canvasBoards', boardId, 'canvasElements');
    if (type === 'connector') {
      const docRef = await addDoc(elementsRef, {
        type: 'connector',
        userId: resolvedUid,
        properties: {},
        content: props?.content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    }

    const defaultPosition = getViewportCenterRef.current(); // ✅ Usar ref
    
    // REGLA: Los nuevos elementos deben aparecer en PRIMERA CAPA (zIndex máximo)
    // para que el usuario pueda arrastrarlos y reubicarlos fácilmente
    // EXCEPCIÓN CRÍTICA: Los contenedores SIEMPRE están en la primera capa (zIndex 0)
    // incluso antes que cuadernos, para que puedan recibir elementos arrastrados
    let zIndex;
    if (type === 'container') {
        zIndex = 0; // Contenedores siempre en primera capa (zIndex 0)
    } else {
        // Todos los demás elementos nuevos van a la PRIMERA CAPA (zIndex máximo + 1)
        zIndex = getNextZIndexRef.current(); // ✅ Usar ref
    }

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
        const notepadSize = { width: 794, height: 978 };
        const notepadPos = getCenteredPosition(notepadSize.width, notepadSize.height);
        newElementData = { type, x: notepadPos.x, y: notepadPos.y, width: notepadSize.width, height: notepadSize.height, userId: resolvedUid, properties: { ...baseProperties, position: notepadPos, size: notepadSize, format: 'letter' }, content: { title: 'Nuevo Cuaderno', pages: Array(5).fill('<div><br></div>'), currentPage: 0 }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'notepad-simple':
        const notepadSimpleSize = { width: 302, height: 491 };
        const notepadSimplePos = getCenteredPosition(notepadSimpleSize.width, notepadSimpleSize.height);
        newElementData = { type, x: notepadSimplePos.x, y: notepadSimplePos.y, width: notepadSimpleSize.width, height: notepadSimpleSize.height, userId: resolvedUid, properties: { ...baseProperties, position: notepadSimplePos, size: notepadSimpleSize }, content: { title: 'Nuevo Notepad', text: '<div><br></div>' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
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
          userId: resolvedUid, 
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
        newElementData = { type, x: todoPos.x, y: todoPos.y, width: todoSize.width, height: todoSize.height, userId: resolvedUid, properties: { ...baseProperties, position: todoPos, size: todoSize }, content: props?.content || { title: 'Lista de Tareas', items: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'image':
        const imagePos = getCenteredPosition(sizeWidth, sizeHeight);
        newElementData = { type, x: imagePos.x, y: imagePos.y, width: sizeWidth, height: sizeHeight, userId: resolvedUid, properties: { ...baseProperties, position: imagePos, size: { width: sizeWidth, height: sizeHeight } }, content: props?.content, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'text':
        const textPos = getCenteredPosition(sizeWidth, sizeHeight);
        const textBgColor = (props?.properties as CanvasElementProperties)?.backgroundColor || '#ffffff';
        newElementData = { type, x: textPos.x, y: textPos.y, width: sizeWidth, height: sizeHeight, userId: resolvedUid, properties: { ...baseProperties, position: textPos, size: { width: sizeWidth, height: sizeHeight }, backgroundColor: textBgColor }, content: props?.content || '<div style="font-size: 18px;">Escribe algo...</div>', color: props?.color || 'white', zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'container':
        const contSize = { width: 380, height: 520 };
        const contPos = getCenteredPosition(contSize.width, contSize.height);
        newElementData = {
          type: 'container',
          x: contPos.x,
          y: contPos.y,
          width: contSize.width,
          height: contSize.height,
          userId: resolvedUid,
          properties: {
            ...baseProperties,
            position: contPos,
            size: contSize,
            backgroundColor: (props?.properties as any)?.backgroundColor || '#ffffff',
          },
          content: props?.content || { title: 'Columna', elementIds: [], layout: 'single' },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;
      case 'comment':
        const commentSize = { width: 32, height: 32 };
        const commentPos = getCenteredPosition(commentSize.width, commentSize.height);
        newElementData = { type, x: commentPos.x, y: commentPos.y, width: commentSize.width, height: commentSize.height, userId: resolvedUid, properties: { ...baseProperties, position: commentPos, size: commentSize }, content: props?.content || { title: '', label: '', comment: '' }, parentId: props?.parentId || undefined, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'comment-bubble':
        const bubbleSize = { width: 240, height: 140 };
        const bubblePos = getCenteredPosition(bubbleSize.width, bubbleSize.height);
        newElementData = {
          type: 'comment-bubble',
          x: bubblePos.x,
          y: bubblePos.y,
          width: bubbleSize.width,
          height: bubbleSize.height,
          userId: resolvedUid,
          properties: {
            ...baseProperties,
            position: bubblePos,
            size: bubbleSize,
            backgroundColor: (props?.properties as any)?.backgroundColor || '#fff9c4',
            borderColor: '#f1e69c',
            fontSize: 11,
          },
          content: props?.content || { text: '' },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }; break;
      case 'moodboard':
        const moodboardSize = { width: 600, height: 500 };
        const moodboardPos = getCenteredPosition(moodboardSize.width, moodboardSize.height);
        newElementData = { type, x: moodboardPos.x, y: moodboardPos.y, width: moodboardSize.width, height: moodboardSize.height, userId: resolvedUid, properties: { ...baseProperties, position: moodboardPos, size: moodboardSize, backgroundColor: '#ffffff' }, content: props?.content || { title: 'Nuevo Moodboard', images: [], annotations: [], layout: 'grid' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'locator':
        const locatorSize = { width: 48, height: 48 };
        const locatorPos = getCenteredPosition(locatorSize.width, locatorSize.height);
        newElementData = {
          type: 'locator',
          x: locatorPos.x,
          y: locatorPos.y,
          width: locatorSize.width,
          height: locatorSize.height,
          userId: resolvedUid,
          properties: {
            ...baseProperties,
            position: locatorPos,
            size: locatorSize,
            rotation: 0,
          },
          content: props?.content || { label: 'Localizador' },
          zIndex,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        break;

      // Tipos obsoletos: no crear
      case 'tabbed-notepad':
      case 'accordion':
      case 'stopwatch':
      case 'countdown':
      case 'highlight-text':
      case 'comment':
      case 'super-notebook':
        throw new Error(`Tipo de elemento obsoleto: ${type}`);
      case 'yellow-notepad':
        // Tamaño basado en las imágenes: aproximadamente 400x600px (portrait)
        const yellowNotepadSize = { width: 400, height: 600 };
        const yellowNotepadPos = getCenteredPosition(yellowNotepadSize.width, yellowNotepadSize.height);
        newElementData = { type, x: yellowNotepadPos.x, y: yellowNotepadPos.y, width: yellowNotepadSize.width, height: yellowNotepadSize.height, userId: resolvedUid, properties: { ...baseProperties, position: yellowNotepadPos, size: yellowNotepadSize, backgroundColor: '#FFFFE0' }, content: props?.content || { text: '', searchQuery: '' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'pomodoro-timer':
        const pomodoroSize = { width: 260, height: 200 };
        const pomodoroPos = getCenteredPosition(pomodoroSize.width, pomodoroSize.height);
        newElementData = { type, x: pomodoroPos.x, y: pomodoroPos.y, width: pomodoroSize.width, height: pomodoroSize.height, userId: resolvedUid, properties: { ...baseProperties, position: pomodoroPos, size: pomodoroSize, backgroundColor: '#ffffff' }, content: { durationSeconds: 25 * 60, remainingSeconds: 25 * 60, running: false }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'brainstorm-generator':
        const brainstormSize = { width: 320, height: 260 };
        const brainstormPos = getCenteredPosition(brainstormSize.width, brainstormSize.height);
        newElementData = { type, x: brainstormPos.x, y: brainstormPos.y, width: brainstormSize.width, height: brainstormSize.height, userId: resolvedUid, properties: { ...baseProperties, position: brainstormPos, size: brainstormSize, backgroundColor: '#ffffff' }, content: { ideas: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'color-palette-generator':
        const paletteSize = { width: 320, height: 200 };
        const palettePos = getCenteredPosition(paletteSize.width, paletteSize.height);
        newElementData = { type, x: palettePos.x, y: palettePos.y, width: paletteSize.width, height: paletteSize.height, userId: resolvedUid, properties: { ...baseProperties, position: palettePos, size: paletteSize, backgroundColor: '#ffffff' }, content: { colors: Array.from({ length: 5 }, () => '#fffb8b') }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'datetime-widget':
        const datetimeSize = { width: 240, height: 180 };
        const datetimePos = getCenteredPosition(datetimeSize.width, datetimeSize.height);
        newElementData = { type, x: datetimePos.x, y: datetimePos.y, width: datetimeSize.width, height: datetimeSize.height, userId: resolvedUid, properties: { ...baseProperties, position: datetimePos, size: datetimeSize, backgroundColor: '#ffffff' }, content: props?.content || { mode: 'datetime' }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'habit-tracker':
        const habitSize = { width: 420, height: 420 };
        const habitPos = getCenteredPosition(habitSize.width, habitSize.height);
        newElementData = { type, x: habitPos.x, y: habitPos.y, width: habitSize.width, height: habitSize.height, userId: resolvedUid, properties: { ...baseProperties, position: habitPos, size: habitSize, backgroundColor: '#ffffff' }, content: props?.content || { title: 'Habit Tracker', habits: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'eisenhower-matrix':
        const eisenSize = { width: 520, height: 420 };
        const eisenPos = getCenteredPosition(eisenSize.width, eisenSize.height);
        newElementData = { type, x: eisenPos.x, y: eisenPos.y, width: eisenSize.width, height: eisenSize.height, userId: resolvedUid, properties: { ...baseProperties, position: eisenPos, size: eisenSize, backgroundColor: '#ffffff' }, content: props?.content || { quadrants: {} }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'brain-dump':
        const dumpSize = { width: 460, height: 340 };
        const dumpPos = getCenteredPosition(dumpSize.width, dumpSize.height);
        newElementData = { type, x: dumpPos.x, y: dumpPos.y, width: dumpSize.width, height: dumpSize.height, userId: resolvedUid, properties: { ...baseProperties, position: dumpPos, size: dumpSize, backgroundColor: '#ffffff' }, content: props?.content || { title: 'Brain Dump', notes: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'gratitude-journal':
        const gratitudeSize = { width: 380, height: 420 };
        const gratitudePos = getCenteredPosition(gratitudeSize.width, gratitudeSize.height);
        newElementData = { type, x: gratitudePos.x, y: gratitudePos.y, width: gratitudeSize.width, height: gratitudeSize.height, userId: resolvedUid, properties: { ...baseProperties, position: gratitudePos, size: gratitudeSize, backgroundColor: '#ffffff' }, content: props?.content || { entries: [] }, zIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; break;
      case 'sticker':
        const stickerSize = { width: 200, height: 200 };
        const stickerPos = getCenteredPosition(stickerSize.width, stickerSize.height);
        newElementData = { 
          type, 
          x: stickerPos.x, 
          y: stickerPos.y, 
          width: stickerSize.width, 
          height: stickerSize.height, 
          userId: resolvedUid, 
          properties: { 
            ...baseProperties, 
            position: stickerPos, 
            size: stickerSize, 
            backgroundColor: (props?.properties as any)?.backgroundColor || '#ffffff',
            rotation: (props?.properties as any)?.rotation ?? 0
          }, 
          content: props?.content || { stickerId: 'star', category: 'productivity', color: '#FFD700' }, 
          zIndex, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        }; 
        break;
      default: return Promise.reject(new Error(`Tipo de elemento inválido: ${type}`));
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

    if (elementToDeleteRef.type === 'container') {
        const containerContent = elementToDeleteRef.content as ContainerContent;
        if (containerContent && Array.isArray(containerContent.elementIds)) {
            containerContent.elementIds.forEach((childId: string) => {
                const childDocRef = doc(elementsRef, childId);
                batch.delete(childDocRef);
            });
        }
    }
    
    batch.delete(elementDocRef);

    await batch.commit();
  }, [firestore, user, boardId]);

  const unanchorElement = useCallback(async (elementId: string) => {
    if (!firestore || !user || !boardId) return;

    const elementsRef = collection(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements');
    const elementDocRef = doc(elementsRef, elementId);
    
    const elementSnap = await getDoc(elementDocRef);
    if (!elementSnap.exists()) {
      toast({ 
        variant: 'destructive',
        title: "Error", 
        description: "El elemento no existe." 
      });
      return;
    }
    
    const elementData = elementSnap.data();
    if (!elementData?.parentId) {
      toast({ 
        variant: 'destructive',
        title: "Error", 
        description: "El elemento no está anclado a ningún contenedor." 
      });
      return;
    }

    const element = elementData as CanvasElement;
    const parentId = element.parentId;
    const parentDocRef = doc(elementsRef, parentId);
    const parentSnap = await getDoc(parentDocRef);

    if (!parentSnap.exists()) {
      toast({ 
        variant: 'destructive',
        title: "Error", 
        description: "No se encontró el contenedor padre." 
      });
      return;
    }

    const parentElementData = parentSnap.data();
    if (!parentElementData) {
      toast({ 
        variant: 'destructive',
        title: "Error", 
        description: "No se pudo obtener datos del contenedor padre." 
      });
      return;
    }

    const parentElement = parentElementData as CanvasElement;
    const parentContent = parentElement?.content as ContainerContent | undefined;
    const parentProps = parentElement?.properties as CanvasElementProperties | undefined;

    // Remove elementId from parent's content
    const newElementIds = (parentContent?.elementIds || []).filter(id => id !== elementId);

    // Calcular nueva posición mejorada: a la derecha del panel con un offset
    const parentX = parentProps?.position?.x ?? 0;
    const parentWidth = typeof parentProps?.size?.width === 'number' 
      ? parentProps.size.width 
      : (parentProps?.size?.width ? parseFloat(String(parentProps.size.width)) : 300) || 300;
    const parentY = parentProps?.position?.y ?? 0;
    
    // Obtener posición original del elemento si existe, o calcular nueva
    const elementProps = element.properties as CanvasElementProperties | undefined;
    const originalPosition = elementProps?.position || { x: element.x || 0, y: element.y || 0 };
    
    // Si el elemento tenía una posición original válida, intentar restaurarla
    // Si no, colocar a la derecha del panel
    const newPosition = originalPosition.x > 0 && originalPosition.y > 0
      ? originalPosition // Restaurar posición original
      : {
          x: parentX + parentWidth + 20, // A la derecha del panel con 20px de margen
          y: parentY + 50, // Ligeramente abajo del panel
        };

    const batch = writeBatch(firestore);
    
    // Update parent
    batch.update(parentDocRef, { 
      content: { ...parentContent, elementIds: newElementIds },
      updatedAt: serverTimestamp(),
    });
    
    // Update child - restaurar propiedades completas y asegurar visibilidad
    const safeProperties = elementProps || {};
    const elementSize = typeof element.width === 'number' && typeof element.height === 'number'
      ? { width: element.width, height: element.height }
      : (safeProperties.size || { width: 200, height: 150 });
    
    batch.update(elementDocRef, {
        parentId: null,
        hidden: false,
        x: newPosition.x,
        y: newPosition.y,
        properties: {
          ...safeProperties,
          position: newPosition,
          size: elementSize,
        },
        updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      toast({ 
        title: "Elemento desanclado", 
        description: "El elemento ha sido devuelto al lienzo." 
      });
    } catch (error) {
      console.error('Error al desanclar elemento:', error);
      toast({ 
        variant: 'destructive',
        title: "Error", 
        description: "No se pudo desanclar el elemento." 
      });
    }
  }, [firestore, user, boardId, toast]);

  return { addElement, updateElement, deleteElement, unanchorElement };
}
