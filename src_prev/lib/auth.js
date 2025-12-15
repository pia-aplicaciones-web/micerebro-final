// Utilidades de autenticación
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { initFirebase, getFirebaseAuth } from './firebase';

/**
 * Inicia sesión con Google usando popup
 */
export async function signInWithGoogle() {
  if (typeof window === 'undefined') {
    throw new Error('signInWithGoogle solo puede ejecutarse en el cliente');
  }

  // Asegurar que Firebase esté inicializado
  await initFirebase();
  
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está inicializado');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
    client_id: '917199598510-14h0c930cobfvnig8kdfj5i42untd7rg.apps.googleusercontent.com'
  });
  
  try {
    console.log('🔄 Iniciando sesión con Google (popup)...');
    const result = await signInWithPopup(auth, provider);
    console.log('✅ signInWithPopup exitoso:', result.user.email);
    return result;
  } catch (error) {
    console.error("❌ Error during Google sign-in popup:", error);
    
    if (error.code === 'auth/popup-blocked') {
      throw new Error('El popup fue bloqueado. Por favor, permite popups para este sitio e intenta de nuevo.');
    }
    
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('El popup fue cerrado antes de completar el login. Por favor, intenta de nuevo.');
    }
    
    throw error;
  }
}

/**
 * Inicia sesión como invitado (anónimo)
 */
export const signInAsGuest = async () => {
  if (typeof window === 'undefined') {
    throw new Error('signInAsGuest solo puede ejecutarse en el cliente');
  }

  // Asegurar que Firebase esté inicializado
  await initFirebase();
  
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está inicializado');
  }

  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential;
  } catch (error) {
    console.error('Error signing in as guest:', error);
    throw error;
  }
};

/**
 * Inicia sesión con email y contraseña
 */
export const signInWithEmail = async (email, password) => {
  if (typeof window === 'undefined') {
    throw new Error('signInWithEmail solo puede ejecutarse en el cliente');
  }

  // Asegurar que Firebase esté inicializado
  await initFirebase();
  
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está inicializado');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

/**
 * Crea una nueva cuenta con email y contraseña
 */
export const createUserWithEmail = async (email, password) => {
  if (typeof window === 'undefined') {
    throw new Error('createUserWithEmail solo puede ejecutarse en el cliente');
  }

  // Asegurar que Firebase esté inicializado
  await initFirebase();
  
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está inicializado');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error creating user with email:', error);
    throw error;
  }
};

/**
 * Cierra la sesión del usuario actual
 */
export const signOut = async () => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está inicializado');
  }

  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

