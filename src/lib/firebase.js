// Firebase configuration - Solo configuración, sin inicialización
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * authDomain en el mismo origen que la app (vía proxy /__/auth).
 * Evita fallos de login con Google en Safari/iOS por storage de terceros.
 */
function resolveAuthDomain(envAuthDomain) {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return envAuthDomain || 'micerebroapp.firebaseapp.com';
}

// Configuración de Firebase
// Prioridad: variables de entorno (.env.local) > config por defecto
// Para nuevo proyecto: crear .env.local con NEXT_PUBLIC_FIREBASE_* desde Firebase Console
const getFirebaseConfig = () => {
  const env = typeof process !== 'undefined' ? process.env : {};
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCbnZ8uKlOc8PBvTql2N2PkIDxc2BXWFCg',
    authDomain: resolveAuthDomain(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'micerebroapp',
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'micerebroapp.firebasestorage.app',
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '967156176052',
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:967156176052:web:2a7da145935daecdd6f3e1',
  };
};
export const firebaseConfig = getFirebaseConfig();

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
      const config = getFirebaseConfig();
      if (!config.apiKey || !config.projectId) {
        console.error('❌ Firebase: Configura NEXT_PUBLIC_FIREBASE_* en .env.local - Ver MIGRACION_GOOGLE_CLOUD.md');
        throw new Error('Firebase no configurado. Añade las variables de entorno.');
      }
      // Inicializar app
      if (!getApps().length) {
        app = initializeApp(config);
        console.log('✅ Firebase App inicializado');
      } else {
        app = getApp();
        console.log('✅ Firebase App ya existente, reutilizando');
      }

      // Persistencia local: sobrevive al cierre de pestaña y es más fiable en móvil
      auth = getAuth(app);
      await setPersistence(auth, browserLocalPersistence);
      console.log('✅ Firebase Auth inicializado (persistencia local, authDomain:', getFirebaseConfig().authDomain, ')');

      // Inicializar Firestore (base de datos datacerebro)
      // CRÍTICO: ignoreUndefinedProperties=true evita errores cuando los objetos tienen undefined
      // (Firestore rechaza undefined por defecto, causando que los guardados fallen silenciosamente)
      try {
        firestore = initializeFirestore(app, { ignoreUndefinedProperties: true }, 'datacerebro');
      } catch (e) {
        if (e?.code === 'failed-precondition' || /already been called|different options/i.test(e?.message || '')) {
          const { getFirestore } = await import('firebase/firestore');
          firestore = getFirestore(app, 'datacerebro');
        } else {
          throw e;
        }
      }
      storage = getStorage(app);
      console.log('✅ Firebase Firestore y Storage inicializados');

      console.log('✅ Firebase completamente inicializado');
      
      return { app, auth, firestore, storage };
    } catch (error) {
      console.error('❌ Error al inicializar Firebase:', error);
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

