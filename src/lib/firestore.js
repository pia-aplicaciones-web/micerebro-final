// CRUD abstraído para Firestore
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { initFirebase, getFirebaseFirestore } from './firebase';

/**
 * Obtiene un documento por ID
 */
export const getDocument = async (collectionPath, docId) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const docRef = doc(db, collectionPath, docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * Obtiene todos los documentos de una colección
 */
export const getDocuments = async (collectionPath, constraints = []) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const collectionRef = collection(db, collectionPath);
  let q = query(collectionRef);
  
  // Aplicar constraints (where, orderBy, limit)
  constraints.forEach(constraint => {
    if (constraint.type === 'where') {
      q = query(q, where(constraint.field, constraint.operator, constraint.value));
    } else if (constraint.type === 'orderBy') {
      q = query(q, orderBy(constraint.field, constraint.direction || 'asc'));
    } else if (constraint.type === 'limit') {
      q = query(q, limit(constraint.value));
    }
  });

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Crea un nuevo documento
 */
export const createDocument = async (collectionPath, data) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const collectionRef = collection(db, collectionPath);
  const docData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collectionRef, docData);
  return docRef.id;
};

/**
 * Actualiza un documento existente
 */
export const updateDocument = async (collectionPath, docId, data) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const docRef = doc(db, collectionPath, docId);
  const updateData = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  
  await updateDoc(docRef, updateData);
};

/**
 * Elimina un documento
 */
export const deleteDocument = async (collectionPath, docId) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const docRef = doc(db, collectionPath, docId);
  await deleteDoc(docRef);
};

/**
 * Crea o actualiza un documento (set con merge)
 */
export const setDocument = async (collectionPath, docId, data) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const docRef = doc(db, collectionPath, docId);
  
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/**
 * Operaciones en batch
 */
export const batchWrite = async (operations) => {
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');

  const batch = writeBatch(db);
  
  operations.forEach(op => {
    const docRef = doc(db, op.collectionPath, op.docId);
    if (op.type === 'set') {
      batch.set(docRef, op.data);
    } else if (op.type === 'update') {
      batch.update(docRef, op.data);
    } else if (op.type === 'delete') {
      batch.delete(docRef);
    }
  });
  
  await batch.commit();
};

// Guards para prevenir llamadas duplicadas
const creatingBoardsMap = new Map(); // userId -> Promise
const loadingBoardsMap = new Map(); // boardId -> Promise

/**
 * Asegura que existe un documento de usuario
 */
export async function ensureUserDocument(user) {
  if (!user?.uid) {
    throw new Error('Usuario no válido');
  }
  
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');
  
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await setDocument('users', user.uid, {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Invitado',
    });
  }
  
  return userRef;
}

/**
 * Obtiene todos los tableros de un usuario
 */
export async function getUserBoards(userId) {
  if (!userId) throw new Error('userId es requerido');
  
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');
  
  const boardsCollection = collection(db, 'users', userId, 'canvasBoards');
  const snapshot = await getDocs(boardsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Obtiene el tablero más reciente de un usuario
 */
export async function getLatestBoard(userId) {
  if (!userId) throw new Error('userId es requerido');
  
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');
  
  const boardsCollection = collection(db, 'users', userId, 'canvasBoards');
  
  try {
    const q = query(boardsCollection, orderBy('updatedAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  } catch {
    // Si falla orderBy, buscar sin orden
    const snapshot = await getDocs(boardsCollection);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }
  
  return null;
}

/**
 * Crea un nuevo tablero para un usuario (con guard para prevenir duplicados)
 */
export async function createBoard(userId, boardName = 'Mi Primer Tablero') {
  if (!userId) throw new Error('userId es requerido');
  
  // Guard: Si ya hay una creación en progreso para este usuario, esperar a que termine
  if (creatingBoardsMap.has(userId)) {
    console.log('⏸️ Ya hay una creación de tablero en progreso para este usuario, esperando...');
    return await creatingBoardsMap.get(userId);
  }
  
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');
  
  // Crear la promesa y guardarla en el mapa
  const createPromise = (async () => {
    try {
      const boardsCollection = collection(db, 'users', userId, 'canvasBoards');
      const newBoard = await addDoc(boardsCollection, {
        name: boardName,
        userId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Tablero creado:', newBoard.id);
      return newBoard.id;
    } catch (error) {
      console.error('❌ Error creando tablero:', error);
      throw error;
    } finally {
      // Limpiar el mapa después de completar
      creatingBoardsMap.delete(userId);
    }
  })();
  
  // Guardar la promesa en el mapa
  creatingBoardsMap.set(userId, createPromise);
  
  return createPromise;
}

/**
 * Obtiene un tablero por ID (con guard para prevenir múltiples cargas)
 */
export async function getBoard(userId, boardId) {
  if (!userId || !boardId) throw new Error('userId y boardId son requeridos');
  
  // Guard: Si ya hay una carga en progreso para este tablero, esperar a que termine
  const loadKey = `${userId}:${boardId}`;
  if (loadingBoardsMap.has(loadKey)) {
    console.log('⏸️ Ya hay una carga de tablero en progreso, esperando...');
    return await loadingBoardsMap.get(loadKey);
  }
  
  await initFirebase();
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore no está inicializado');
  
  // Crear la promesa y guardarla en el mapa
  const loadPromise = (async () => {
    try {
      const boardRef = doc(db, 'users', userId, 'canvasBoards', boardId);
      const boardDoc = await getDoc(boardRef);
      
      if (!boardDoc.exists()) {
        return null;
      }
      
      return { id: boardDoc.id, ...boardDoc.data() };
    } catch (error) {
      console.error('❌ Error cargando tablero:', error);
      throw error;
    } finally {
      // Limpiar el mapa después de completar
      loadingBoardsMap.delete(loadKey);
    }
  })();
  
  // Guardar la promesa en el mapa
  loadingBoardsMap.set(loadKey, loadPromise);
  
  return loadPromise;
}

