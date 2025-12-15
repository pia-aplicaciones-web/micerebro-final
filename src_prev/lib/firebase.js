// Firebase configuration - Solo configuración, sin inicialización
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyDnDsbb2jVLZmgpfkrpdzA6yTFRpPo2f9c",
  authDomain: "canvasmind-app.firebaseapp.com",
  projectId: "canvasmind-app",
  storageBucket: "canvasmind-app.firebasestorage.app",
  messagingSenderId: "917199598510",
  appId: "1:917199598510:web:73840729e1333a07804e3f"
};

// Inicializar Firebase solo en el cliente
let app = null;
let auth = null;
let firestore = null;
let storage = null;
let initPromise = null; // Promesa de inicialización para evitar múltiples inicializaciones simultáneas

export const initFirebase = async () => {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, firestore: null, storage: null };
  }

  // Si ya está inicializado, retornar inmediatamente
  if (app && auth && firestore && storage) {
    return { app, auth, firestore, storage };
  }

  // Si hay una inicialización en curso, esperar a que termine
  if (initPromise) {
    return initPromise;
  }

  // Crear nueva promesa de inicialización
  initPromise = (async () => {
    try {
      // Limpiar estado anterior si es necesario
      if (getApps().length > 0) {
        console.log('🧹 Limpiando apps Firebase existentes...');
        // No podemos realmente eliminar apps existentes, pero podemos reutilizar
      }

      // Inicializar app
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase App inicializado');
      } else {
        app = getApp();
        console.log('✅ Firebase App ya existente, reutilizando');
      }

      // Inicializar Auth con persistencia local (persiste después de cerrar navegador)
      auth = getAuth(app);

      // Intentar configurar persistencia, pero manejar errores
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ Firebase Auth inicializado con persistencia local');
      } catch (persistenceError) {
        console.warn('⚠️ No se pudo configurar persistencia local, usando por defecto:', persistenceError);
        // Continuar sin persistencia configurada explícitamente
      }

      // Inicializar Firestore y Storage
      firestore = getFirestore(app);
      storage = getStorage(app);
      console.log('✅ Firebase Firestore y Storage inicializados');

      console.log('✅ Firebase completamente inicializado');

      return { app, auth, firestore, storage };
    } catch (error) {
      console.error('❌ Error al inicializar Firebase:', error);
      // Resetear variables globales en caso de error
      app = null;
      auth = null;
      firestore = null;
      storage = null;
      initPromise = null; // Resetear para permitir reintentos
      throw error;
    }
  })();

  return initPromise;
};

// Getters para obtener instancias (solo en cliente)
export const getFirebaseApp = () => {
  if (typeof window === 'undefined') return null;
  return app;
};

export const getFirebaseAuth = () => {
  if (typeof window === 'undefined') return null;
  return auth;
};

export const getFirebaseFirestore = () => {
  if (typeof window === 'undefined') return null;
  return firestore;
};

export const getFirebaseStorage = () => {
  if (typeof window === 'undefined') return null;
  return storage;
};

// Función para forzar limpieza de sesión cuando hay problemas
export const clearFirebaseSession = async () => {
  try {
    console.log('🧹 Forzando limpieza de sesión Firebase...');

    // Limpiar sessionStorage y localStorage relacionado con Firebase
    const keysToRemove = [
      'hasActiveSession',
      'isAnonymousUser',
      'currentUserId',
      'justLoggedIn',
      'userId'
    ];

    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

    // Intentar hacer signOut si hay auth disponible
    if (auth) {
      try {
        await auth.signOut();
        console.log('✅ SignOut forzado completado');
      } catch (signOutError) {
        console.warn('⚠️ Error en signOut forzado:', signOutError);
      }
    }

    // Resetear variables globales
    app = null;
    auth = null;
    firestore = null;
    storage = null;
    initPromise = null;

    console.log('✅ Limpieza de sesión completada');
  } catch (error) {
    console.error('❌ Error limpiando sesión:', error);
  }
};

