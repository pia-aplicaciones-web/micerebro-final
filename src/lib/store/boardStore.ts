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
const DEV_MODE = false; // Cambiado a false para siempre usar Firebase

// Funciones para modo desarrollo (localStorage)
const getDevElements = (boardId: string): WithId<CanvasElement>[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`dev_board_${boardId}_elements`);
    const elements = (stored && stored.trim()) ? JSON.parse(stored) : [];
    // 🛡️ BugShield: Validar elementos al cargar
    return validateElementsList(elements);
  } catch (error) {
    logBugShieldError('getDevElements', error, { boardId });
    // Limpiar datos corruptos de localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`dev_board_${boardId}_elements`);
    }
    return [];
  }
};

const saveDevElements = (boardId: string, elements: WithId<CanvasElement>[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`dev_board_${boardId}_elements`, JSON.stringify(elements));
};

const getDevBoard = (boardId: string): WithId<Board> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`dev_board_${boardId}`);
    if (stored && stored.trim()) return JSON.parse(stored);
  } catch (error) {
    console.warn('Error parsing dev board from localStorage:', error);
    // Limpiar datos corruptos
    localStorage.removeItem(`dev_board_${boardId}`);
  }
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

// Función para validar integridad de elementos
const validateElementIntegrity = (element: WithId<CanvasElement>): boolean => {
  if (!element.id || typeof element.id !== 'string') {
    console.warn('⚠️ Elemento con ID inválido:', element);
    return false;
  }

  if (!element.type || typeof element.type !== 'string') {
    console.warn('⚠️ Elemento sin tipo válido:', element);
    return false;
  }

  if (typeof element.x !== 'number' || typeof element.y !== 'number') {
    console.warn('⚠️ Elemento con posición inválida:', element);
    return false;
  }

  if (typeof element.width !== 'number' || typeof element.height !== 'number') {
    console.warn('⚠️ Elemento con dimensiones inválidas:', element);
    return false;
  }

  return true;
};

// Función segura para comparar contenido que maneja casos edge
const safeContentCompare = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== typeof obj2) return false;

  // Para strings (HTML content), normalizar antes de comparar
  if (typeof obj1 === 'string' && typeof obj2 === 'string') {
    const normalize = (str: string) => str.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    return normalize(obj1) === normalize(obj2);
  }

  // Para objetos, intentar comparación profunda segura
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    try {
      // Comparación superficial de propiedades principales
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (!(key in obj2)) return false;

        // Para propiedades simples, comparar directamente
        if (typeof obj1[key] !== 'object' && typeof obj2[key] !== 'object') {
          if (obj1[key] !== obj2[key]) return false;
        }
        // Para objetos anidados, comparación recursiva limitada
        else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          if (!safeContentCompare(obj1[key], obj2[key])) return false;
        }
      }

      return true;
    } catch (error) {
      // Si falla la comparación profunda, usar stringify como fallback pero con try-catch
      try {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
      } catch {
        // Si stringify falla, asumir que son diferentes
        return false;
      }
    }
  }

  return false;
};

interface BoardState {
  elements: WithId<CanvasElement>[];
  board: WithId<Board> | null;
  selectedElementIds: string[];
  isLoading: boolean;
  error: string | null;
  unsubscribeElements: (() => void) | null;

  loadBoard: (boardId: string, userId: string) => Promise<string | null>;
  createBoard: (userId: string, boardName?: string, password?: string) => Promise<string>;
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

  // Función auxiliar para limpiar elementos huérfanos
  cleanupOrphanedElements: async (boardId: string, userId: string, currentElements: WithId<CanvasElement>[]) => {
    if (currentElements.length === 0) return;

    const db = getDb();
    const orphanedIds: string[] = [];

    // Verificar cada elemento en paralelo
    const checkPromises = currentElements.map(async (element) => {
      try {
        const elementRef = doc(db, 'users', userId, 'canvasBoards', boardId, 'canvasElements', element.id);
        const elementDoc = await getDoc(elementRef);
        if (!elementDoc.exists()) {
          orphanedIds.push(element.id);
        }
      } catch (error) {
        console.warn(`Error al verificar elemento ${element.id}:`, error);
      }
    });

    await Promise.all(checkPromises);

    if (orphanedIds.length > 0) {
      console.warn(`🗑️ Eliminando ${orphanedIds.length} elementos huérfanos:`, orphanedIds);
      const filteredElements = currentElements.filter(el => !orphanedIds.includes(el.id));
      set({ elements: filteredElements });
    }
  },

  loadBoard: async (boardId: string, userId: string) => {
    // Guard: Verificar si ya se está cargando este mismo tablero
    const currentState = get();
    if (currentState.isLoading && currentState.board?.id === boardId) {
      console.log('⏸️ Tablero ya se está cargando:', boardId);
      return boardId;
    }
    
    // CRÍTICO: Limpiar listener anterior ANTES de crear uno nuevo
    const { unsubscribeElements } = get();
    if (unsubscribeElements) {
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
      const db = getDb();
      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}
      const boardRef = doc(db, 'users', userId, 'canvasBoards', boardId);
      const boardSnap = await getDoc(boardRef);

      if (!boardSnap.exists()) {
          throw new Error("El tablero no existe o no tienes permiso para verlo.");
      }

      const boardDataRaw = boardSnap.data();
      const boardData: WithId<Board> = { 
        id: boardSnap.id, 
        ...boardDataRaw,
        // Asegurar que userId esté presente
        userId: (boardDataRaw.userId || (boardDataRaw as { ownerId?: string }).ownerId || userId) as string,
      } as WithId<Board>;

      // FIX: Usar onSnapshot en lugar de getDocs para tiempo real
      // Usar la nueva estructura para elementos: users/{userId}/canvasBoards/{boardId}/canvasElements
      const elementsCollection = collection(db, 'users', userId, 'canvasBoards', boardId, 'canvasElements');
      
      // Intentar con orderBy, si falla usar sin orden
      let unsubscribe: (() => void);
      try {
        const elementsQuery = query(elementsCollection, orderBy('zIndex', 'asc'));
        unsubscribe = onSnapshot(
          elementsQuery,
          (snapshot) => {
            const newElements = snapshot.docs
              .map(doc => ({
              id: doc.id, 
              ...doc.data() 
              } as WithId<CanvasElement>))
              .filter(el => el.type !== 'photo-ideas-guide'); // Filtrar elementos eliminados
            // CRÍTICO: Solo actualizar si realmente cambió (evitar re-renders innecesarios y bucles infinitos)
            const currentElements = get().elements;
            // Comparar por IDs y contenido, no por índice (el orden puede cambiar)
            const currentIds = new Set(currentElements.map(el => el.id));
            const newIds = new Set(newElements.map(el => el.id));
            const idsChanged = currentIds.size !== newIds.size || 
              Array.from(currentIds).some(id => !newIds.has(id)) ||
              Array.from(newIds).some(id => !currentIds.has(id));
            
            // Si los IDs cambiaron, actualizar siempre
            if (idsChanged || currentElements.length === 0) {
              set({ elements: newElements, isLoading: false });
            } else {
              // Si los IDs son iguales, comparar contenido de cada elemento
              const contentChanged = currentElements.some((el) => {
                const newEl = newElements.find(ne => ne.id === el.id);
                if (!newEl) return true;
                // Comparar solo campos relevantes, NO updatedAt (cambia siempre con serverTimestamp)
                return !safeContentCompare(el.content, newEl.content) ||
                       !safeContentCompare(el.properties, newEl.properties) ||
                       el.zIndex !== newEl.zIndex;
              });

              if (contentChanged) {
                console.log('🔄 [boardStore] Actualizando elementos por cambios de contenido:', {
                  elementsCount: newElements.length,
                  changedElements: currentElements.filter((el, index) => {
                    const newEl = newElements[index];
                    return newEl && (!safeContentCompare(el.content, newEl.content) ||
                           !safeContentCompare(el.properties, newEl.properties) ||
                           el.zIndex !== newEl.zIndex);
                  }).map(el => ({ id: el.id, type: el.type })),
                  timestamp: new Date().toISOString()
                });
                set({ elements: newElements, isLoading: false });
              }
            }
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
            const rawElements = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as WithId<CanvasElement>));

            // Validar integridad de elementos
            const newElements = rawElements.filter(validateElementIntegrity);
                // Ordenar manualmente por zIndex
                newElements.sort((a, b) => {
                  const aZ = a.zIndex || 0;
                  const bZ = b.zIndex || 0;
                  return aZ - bZ;
                });
                // CRÍTICO: Solo actualizar si realmente cambió (misma lógica que arriba)
                const currentElements = get().elements;
                const currentIds = new Set(currentElements.map(el => el.id));
                const newIds = new Set(newElements.map(el => el.id));
                const idsChanged = currentIds.size !== newIds.size || 
                  Array.from(currentIds).some(id => !newIds.has(id)) ||
                  Array.from(newIds).some(id => !currentIds.has(id));
                
                if (idsChanged || currentElements.length === 0) {
                  set({ elements: newElements, isLoading: false });
                } else {
                  const contentChanged = currentElements.some((el) => {
                    const newEl = newElements.find(ne => ne.id === el.id);
                    if (!newEl) return true;
                    return !safeContentCompare(el.content, newEl.content) ||
                           !safeContentCompare(el.properties, newEl.properties) ||
                           el.zIndex !== newEl.zIndex;
                  });
                  if (contentChanged) {
                    set({ elements: newElements, isLoading: false });
                  }
                }
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
            const newElements = snapshot.docs
              .map(doc => ({
              id: doc.id, 
              ...doc.data() 
              } as WithId<CanvasElement>))
              .filter(el => el.type !== 'photo-ideas-guide'); // Filtrar elementos eliminados
            // Ordenar manualmente por zIndex
            newElements.sort((a, b) => {
              const aZ = a.zIndex || 0;
              const bZ = b.zIndex || 0;
              return aZ - bZ;
            });
            // CRÍTICO: Solo actualizar si realmente cambió (misma lógica que arriba)
            const currentElements = get().elements;
            const currentIds = new Set(currentElements.map(el => el.id));
            const newIds = new Set(newElements.map(el => el.id));
            const idsChanged = currentIds.size !== newIds.size || 
              Array.from(currentIds).some(id => !newIds.has(id)) ||
              Array.from(newIds).some(id => !currentIds.has(id));
            
            if (idsChanged || currentElements.length === 0) {
              set({ elements: newElements, isLoading: false });
            } else {
                const contentChanged = currentElements.some((el) => {
                  const newEl = newElements.find(ne => ne.id === el.id);
                  if (!newEl) return true;
                  return !safeContentCompare(el.content, newEl.content) ||
                         !safeContentCompare(el.properties, newEl.properties) ||
                         el.zIndex !== newEl.zIndex;
                });
              if (contentChanged) {
                set({ elements: newElements, isLoading: false });
              }
            }
          },
          (error) => {
            console.error("Error en listener de elementos:", error);
            set({ isLoading: false, error: error.message });
          }
        );
      }
      
      set({ board: boardData, unsubscribeElements: unsubscribe, selectedElementIds: [], isLoading: false });

      // Limpiar elementos huérfanos después de cargar el tablero
      // Usar un timeout para no bloquear la carga inicial
      setTimeout(() => {
        get().cleanupOrphanedElements(boardId, userId, get().elements);
      }, 1000);

      console.log('✅ [boardStore] Tablero cargado exitosamente:', { boardId, userId, boardName: boardData.name });
      return boardId;
    } catch (error) {
      console.error("❌ [boardStore] Error al cargar el tablero:", error);
      const errorMessage = (error as Error).message;
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

  createBoard: async (userId: string, boardName: string = "Mi Primer Tablero", password?: string) => {
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
        const newBoard: any = {
            name: boardName,
            userId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Agregar contraseña si se proporciona
        if (password) {
            newBoard.password = password;
        }
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

    // Validación: asegurar que content nunca sea undefined
    const validatedElement = {
      ...element,
      content: element.content !== undefined ? element.content : { title: 'Elemento sin contenido' }
    };

    try {
      const db = getDb();
      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}/canvasElements
      const elementsCollection = collection(db, 'users', userId, 'canvasBoards', board.id, 'canvasElements');
      const docRef = await addDoc(elementsCollection, validatedElement);
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
    const { board, elements, isLoading } = get();
    if (isLoading) {
      console.warn("Board está cargando, esperando para actualizar elemento:", elementId);
      // Podríamos agregar un timeout o retry aquí si es necesario
      return;
    }
    if (!board || !board.id) {
      console.warn("Board no disponible para actualizar elemento:", elementId);
      return;
    }

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

    // OPTIMIZACIÓN: Actualizar estado local INMEDIATAMENTE para mejor UX
    // Esto previene race conditions y da feedback visual instantáneo al usuario
    const currentElements = get().elements;
    const optimisticUpdate = currentElements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    set({ elements: optimisticUpdate });

    try {
      const db = getDb();
      // Usar la nueva estructura: users/{userId}/canvasBoards/{boardId}/canvasElements/{elementId}
      const elementRef = doc(db, 'users', userId, 'canvasBoards', board.id, 'canvasElements', elementId);

      // Verificar si el documento existe antes de intentar actualizarlo
      const elementDoc = await getDoc(elementRef);
      if (!elementDoc.exists()) {
        console.warn(`🗑️ Elemento ${elementId} no existe en Firestore, eliminándolo del estado local`);
        // Eliminar el elemento huérfano del estado local
        const filteredElements = currentElements.filter(el => el.id !== elementId);
        set({ elements: filteredElements });
        return;
      }

      await updateDoc(elementRef, updates);
      // El listener onSnapshot corregirá automáticamente si hay discrepancias
      // Pero la actualización optimista ya dio feedback visual inmediato
    } catch (error: any) {
      console.error("Error al actualizar el elemento:", error);

      // Manejar específicamente errores de documento no encontrado
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Documento ${elementId} no encontrado en Firestore, eliminando del estado local`);
        // Eliminar el elemento del estado local si no existe en Firestore
        const filteredElements = currentElements.filter(el => el.id !== elementId);
        set({ elements: filteredElements });
        return;
      }

      // Revertir la actualización optimista en caso de otros errores
      set({ elements: currentElements });
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
