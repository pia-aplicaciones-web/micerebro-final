// @ts-nocheck
'use client';

import { create } from 'zustand';
import {
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  where,
  getDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { type Firestore } from 'firebase/firestore';
import { firebaseConfig, getFirebaseFirestore } from '@/lib/firebase';
import { WithId, CanvasElement, Board } from '@/lib/types';
import { validateElementsList, validateUpdateProps, validateAndRepairElement, logBugShieldError } from '@/lib/bug-shield';

// MODO DESARROLLO: usar localStorage en lugar de Firebase
const DEV_MODE = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Funciones para modo desarrollo (localStorage)
const getDevElements = (boardId: string): WithId<CanvasElement>[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`dev_board_${boardId}_elements`);
    const elements = stored ? JSON.parse(stored) : [];
    // 🛡️ BugShield: Validar elementos al cargar
    return validateElementsList(elements);
  } catch (error) {
    logBugShieldError('getDevElements', error, { boardId });
    return [];
  }
};

const saveDevElements = (boardId: string, elements: WithId<CanvasElement>[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`dev_board_${boardId}_elements`, JSON.stringify(elements));
};

const getDevBoard = (boardId: string): WithId<Board> | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(`dev_board_${boardId}`);
  if (stored) return JSON.parse(stored);
  // Crear tablero por defecto
  const defaultBoard: WithId<Board> = {
    id: boardId,
    name: 'Tablero de Desarrollo',
    userId: 'dev-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  localStorage.setItem(`dev_board_${boardId}`, JSON.stringify(defaultBoard));
  return defaultBoard;
};

// Obtener db de forma lazy para evitar problemas de SSR
const getDb = (): Firestore => {
  if (typeof window === 'undefined') {
    throw new Error('Firestore solo puede usarse en el cliente');
  }
  
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore no está inicializado');
  }
  
  return db;
};

interface BoardState {
  elements: WithId<CanvasElement>[];
  board: WithId<Board> | null;
  selectedElementIds: string[];
  isLoading: boolean;
  error: string | null;
  unsubscribeElements: (() => void) | null;

  loadBoard: (boardId: string, userId: string) => Promise<string | null>;
  createBoard: (userId: string, boardName?: string) => Promise<string>;
  addElement: (element: Omit<CanvasElement, 'id'>) => Promise<void>;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => Promise<void>;
  deleteElement: (elementId: string) => Promise<void>;
  setSelectedElementIds: (ids: string[]) => void;
  cleanup: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  elements: [],
  board: null,
  selectedElementIds: [],
  isLoading: true,
  error: null,
  unsubscribeElements: null,

  loadBoard: async (boardId: string, userId: string) => {
    console.log('🔍 [boardStore] Iniciando carga de tablero:', { boardId, userId, DEV_MODE });

    // Guard: Verificar si ya se está cargando este mismo tablero
    const currentState = get();
    if (currentState.isLoading && currentState.board?.id === boardId) {
      console.log('⏸️ Tablero ya se está cargando:', boardId);
      return boardId;
    }

    // CRÍTICO: Limpiar listener anterior ANTES de crear uno nuevo
    const { unsubscribeElements } = get();
    if (unsubscribeElements) {
      console.log('🧹 Limpiando listener anterior');
      unsubscribeElements();
      set({ unsubscribeElements: null });
    }

    set({ isLoading: true, error: null });

    // MODO DESARROLLO: usar localStorage
    if (DEV_MODE) {
      console.log('🔧 MODO DESARROLLO: usando localStorage');
      const board = getDevBoard(boardId);
      const elements = getDevElements(boardId);
      set({
        board,
        elements,
        isLoading: false,
        error: null
      });
      return boardId;
    }

    try {
      console.log('🔍 [boardStore] Obteniendo instancia de Firestore...');
      const db = getDb();
      console.log('✅ [boardStore] Firestore obtenido correctamente');

      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}
      const boardRef = doc(db, 'users', userId, 'canvasBoards', boardId);
      console.log('🔍 [boardStore] Buscando tablero en Firestore:', boardRef.path);

      const boardSnap = await getDoc(boardRef);
      console.log('🔍 [boardStore] Respuesta de Firestore:', { exists: boardSnap.exists(), id: boardSnap.id });

      if (!boardSnap.exists()) {
          console.error('❌ [boardStore] Tablero no existe en Firestore:', boardRef.path);
          throw new Error("El tablero no existe o no tienes permiso para verlo.");
      }

      const boardDataRaw = boardSnap.data();
      const boardData: WithId<Board> = { 
        id: boardSnap.id, 
        ...boardDataRaw,
        // Asegurar que userId esté presente
        userId: (boardDataRaw.userId || (boardDataRaw as { ownerId?: string }).ownerId || userId) as string,
      } as WithId<Board>;

      console.log('🔍 [boardStore] Buscando elementos del tablero...');

      // FIX: Usar onSnapshot en lugar de getDocs para tiempo real
      // Usar la nueva estructura para elementos: users/{userId}/canvasBoards/{boardId}/canvasElements
      const elementsCollection = collection(db, 'users', userId, 'canvasBoards', boardId, 'canvasElements');
      console.log('🔍 [boardStore] Ruta de colección de elementos:', elementsCollection.path);

      // Helpers para sanitizar y comparar sin disparar loops
      const pruneUndefined = (obj: any) => {
        if (!obj || typeof obj !== 'object') return {};
        return Object.entries(obj).reduce((acc, [k, v]) => {
          if (v !== undefined) acc[k] = v;
          return acc;
        }, {} as Record<string, unknown>);
      };

      const normalizeElement = (el: any): WithId<CanvasElement> => {
        const safeProps = pruneUndefined(el.properties || {});
        const safeContent = el.content ?? {};
        const num = (v: any, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
        const size = (el.size || el.properties?.size) as any;
        const width = num(el.width ?? size?.width, 200);
        const height = num(el.height ?? size?.height, 200);
        const x = num(el.x ?? el.properties?.position?.x, 0);
        const y = num(el.y ?? el.properties?.position?.y, 0);
        const zIndex = num(el.zIndex, 0);

        return {
          ...el,
          x,
          y,
          width,
          height,
          zIndex,
          properties: safeProps,
          content: safeContent,
          createdAt: undefined,
          updatedAt: undefined,
        } as WithId<CanvasElement>;
      };

      const elementSignature = (el: WithId<CanvasElement>) =>
        JSON.stringify({
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          zIndex: el.zIndex ?? 0,
          parentId: el.parentId ?? null,
          hidden: el.hidden ?? false,
          minimized: (el as any).minimized ?? false,
          properties: el.properties ?? {},
          content: el.content ?? {},
        });

      const handleSnapshot = (raw: WithId<CanvasElement>[]) => {
        const validated = raw
          .map(normalizeElement)
          .map((el) => validateAndRepairElement(el))
          .filter(Boolean) as WithId<CanvasElement>[];

        validated.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        const currentElements = get().elements || [];
        const currentIds = new Set(currentElements.map((el) => el.id));
        const newIds = new Set(validated.map((el) => el.id));
        const idsChanged =
          currentIds.size !== newIds.size ||
          Array.from(currentIds).some((id) => !newIds.has(id)) ||
          Array.from(newIds).some((id) => !currentIds.has(id));

        if (idsChanged || currentElements.length === 0) {
          console.log('✅ [boardStore] Actualizando elementos (IDs cambiaron o primera carga)');
          set({ elements: validated, isLoading: false });
          return;
        }

        const sigMap = new Map(validated.map((el) => [el.id, elementSignature(el)]));
        const contentChanged = currentElements.some((el) => sigMap.get(el.id) !== elementSignature(el));

        if (contentChanged) {
          console.log('✅ [boardStore] Actualizando elementos (contenido cambió)');
          set({ elements: validated, isLoading: false });
        } else {
          console.log('⏸️ [boardStore] No hay cambios en elementos, manteniendo estado actual');
        }
      };

      // Intentar con orderBy, si falla usar sin orden
      let unsubscribe: (() => void);
      try {
        console.log('🔍 [boardStore] Intentando query con orderBy...');
        const elementsQuery = query(elementsCollection, orderBy('zIndex', 'asc'));
        unsubscribe = onSnapshot(
          elementsQuery,
          (snapshot) => {
            console.log('📡 [boardStore] Recibidos elementos del tablero:', snapshot.docs.length);
            const newElements = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as WithId<CanvasElement>));

            console.log('📊 [boardStore] Elementos procesados:', newElements.map(el => ({ id: el.id, type: el.type })));
            handleSnapshot(newElements);
          },
          (error) => {
            console.error("Error en listener de elementos:", error);
            // CRÍTICO: Limpiar el listener anterior antes de crear uno nuevo
            // Si no se limpia, tendremos múltiples listeners activos simultáneamente
            if (unsubscribe) {
              unsubscribe();
            }
            // Si falla con orderBy, intentar sin orden
            const fallbackUnsubscribe = onSnapshot(
              elementsCollection,
              (snapshot) => {
                const newElements = snapshot.docs.map(doc => ({ 
                  id: doc.id, 
                  ...doc.data() 
                } as WithId<CanvasElement>));
                // Ordenar manualmente por zIndex
                newElements.sort((a, b) => {
                  const aZ = a.zIndex || 0;
                  const bZ = b.zIndex || 0;
                  return aZ - bZ;
                });
                handleSnapshot(newElements);
              },
              (fallbackError) => {
                console.error("Error en listener de elementos (fallback):", fallbackError);
                set({ isLoading: false, error: fallbackError.message });
              }
            );
            set({ unsubscribeElements: fallbackUnsubscribe });
          }
        );
      } catch (orderByError) {
        // Si orderBy falla inmediatamente, usar sin orden
        console.warn("orderBy falló, usando sin orden:", orderByError);
        unsubscribe = onSnapshot(
          elementsCollection,
          (snapshot) => {
            const newElements = snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            } as WithId<CanvasElement>));
            // Ordenar manualmente por zIndex
            newElements.sort((a, b) => {
              const aZ = a.zIndex || 0;
              const bZ = b.zIndex || 0;
              return aZ - bZ;
            });
            handleSnapshot(newElements);
          },
          (error) => {
            console.error("Error en listener de elementos:", error);
            set({ isLoading: false, error: error.message });
          }
        );
      }

      console.log('🎯 [boardStore] Configurando estado final del tablero');
      set({ board: boardData, unsubscribeElements: unsubscribe, selectedElementIds: [], isLoading: false });
      console.log('✅ [boardStore] Tablero cargado exitosamente:', { boardId, userId, boardName: boardData.name });
      return boardId;
    } catch (error) {
      console.error("❌ [boardStore] Error al cargar el tablero:", error);
      const errorMessage = (error as Error).message;
      console.error("❌ [boardStore] Detalles del error:", { message: errorMessage, stack: (error as Error).stack });
      set({ isLoading: false, error: errorMessage, board: null, elements: [] });
      return null;
    }
  },

  cleanup: () => {
    const { unsubscribeElements } = get();
    if (unsubscribeElements) {
      unsubscribeElements();
      set({ unsubscribeElements: null });
    }
  },

  createBoard: async (userId: string, boardName: string = "Mi Primer Tablero") => {
    // Guard: Verificar si ya está cargando
    const currentState = get();
    if (currentState.isLoading) {
      console.log('⏸️ Ya hay una operación en progreso, esperando...');
      // Esperar a que termine la operación actual
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!get().isLoading) {
            clearInterval(checkInterval);
            // Intentar de nuevo después de que termine
            resolve(get().createBoard(userId, boardName));
          }
        }, 100);
      });
    }
    
    set({ isLoading: true, error: null });
    
    try {
        const db = getDb();
        // Usar la nueva estructura: users/{userId}/canvasBoards
        const { serverTimestamp } = await import('firebase/firestore');
        const newBoard = {
            name: boardName,
            userId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'users', userId, 'canvasBoards'), newBoard);
        console.log("✅ Nuevo tablero creado con ID:", docRef.id);
        set({ isLoading: false });
        return docRef.id;
    } catch (error) {
        console.error("❌ Error al crear el tablero:", error);
        const errorMessage = (error as Error).message;
        set({ error: errorMessage, isLoading: false });
        return "";
    }
  },

  addElement: async (element: Omit<CanvasElement, 'id'>) => {
    const { board, elements } = get();
    if (!board) return;

    // MODO DESARROLLO: usar localStorage
    if (DEV_MODE) {
      const newElement: WithId<CanvasElement> = {
        ...element,
        id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      } as WithId<CanvasElement>;
      const newElements = [...elements, newElement];
      set({ elements: newElements });
      saveDevElements(board.id, newElements);
      console.log('🔧 DEV: Elemento añadido', newElement.id);
      return;
    }

    // Necesitamos el userId para la nueva estructura
    const userId = board.userId || (board as { ownerId?: string }).ownerId;
    if (!userId) {
      console.error("No se pudo obtener userId para añadir elemento");
      return;
    }

    try {
      const db = getDb();
      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}/canvasElements
      const elementsCollection = collection(db, 'users', userId, 'canvasBoards', board.id, 'canvasElements');
      const docRef = await addDoc(elementsCollection, element);
      // CRÍTICO: NO actualizar estado local aquí - el listener onSnapshot lo hará automáticamente
      // Actualizar el estado local causa condición de carrera con el listener:
      // - El listener puede actualizar después, causando duplicados
      // - Estados inconsistentes entre local y Firestore
      // - Re-renders innecesarios
      // El listener onSnapshot ya maneja todas las actualizaciones de elementos
    } catch (error) {
      console.error("Error al añadir el elemento:", error);
    }
  },

  updateElement: async (elementId: string, updates: Partial<CanvasElement>) => {
    const { board, elements } = get();
    if (!board) return;

    // MODO DESARROLLO: usar localStorage
    if (DEV_MODE) {
      const newElements = elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      );
      set({ elements: newElements });
      saveDevElements(board.id, newElements);
      return;
    }

    const userId = board.userId || (board as { ownerId?: string }).ownerId;
    if (!userId) {
      console.error("No se pudo obtener userId para actualizar elemento");
      return;
    }

    try {
      const db = getDb();
      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}/canvasElements/{elementId}
      const elementRef = doc(db, 'users', userId, 'canvasBoards', board.id, 'canvasElements', elementId);
      // Sanitizar updates para evitar undefined/NaN que rompen updateDoc
      const safeUpdates = validateUpdateProps(updates as Record<string, unknown>);
      // Si no hay nada válido, salir
      if (Object.keys(safeUpdates).length === 0) return;

      await updateDoc(elementRef, safeUpdates);
      // No hacemos set local: el onSnapshot aplicará el estado definitivo y evitamos loops
    } catch (error) {
      console.error("Error al actualizar el elemento:", error);
    }
  },

  deleteElement: async (elementId: string) => {
    const { board, elements } = get();
    if (!board) return;

    // MODO DESARROLLO: usar localStorage
    if (DEV_MODE) {
      const newElements = elements.filter(el => el.id !== elementId);
      set({ elements: newElements });
      saveDevElements(board.id, newElements);
      console.log('🔧 DEV: Elemento eliminado', elementId);
      return;
    }

    const userId = board.userId || (board as { ownerId?: string }).ownerId;
    if (!userId) {
      console.error("No se pudo obtener userId para eliminar elemento");
      return;
    }

    try {
      const db = getDb();
      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}/canvasElements/{elementId}
      const elementRef = doc(db, 'users', userId, 'canvasBoards', board.id, 'canvasElements', elementId);
      await deleteDoc(elementRef);
      // CRÍTICO: NO actualizar estado local aquí - el listener onSnapshot lo hará automáticamente
      // Actualizar el estado local causa condición de carrera con el listener:
      // - El listener puede actualizar después, causando estados inconsistentes
      // - Re-renders innecesarios
      // - Conflictos entre estado local y Firestore
      // El listener onSnapshot ya maneja todas las actualizaciones de elementos
    } catch (error) {
      console.error("Error al eliminar el elemento:", error);
    }
  },

  setSelectedElementIds: (ids: string[]) => {
    set({ selectedElementIds: ids });
  },
}));
