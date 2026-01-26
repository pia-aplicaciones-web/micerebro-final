// Utilidades de autenticación
import {
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
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
    prompt: 'select_account'
    // client_id será configurado automáticamente por Firebase
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
 * Maneja el resultado de Google sign-in (tanto popup como redirect).
 */
export async function handleGoogleSignInResult(auth) {
  try {
    // Intentar obtener resultado de redirect (por si se usó redirect)
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult) {
      console.log('✅ Login con Google exitoso (redirect):', redirectResult.user.email);
      return redirectResult;
    }

    // Si no hay resultado de redirect, significa que no se usó redirect o ya se procesó
    return null;
  } catch (error) {
    console.error('❌ Error getting redirect result:', error);

    // Si hay un error relacionado con sessionStorage, sugerir usar popup
    if (error.message?.includes('sessionStorage') || error.message?.includes('initial state')) {
      console.warn('⚠️ Problema con sessionStorage detectado.');
      throw new Error('Problema con el almacenamiento del navegador. Intenta desde una pestaña de incógnito o usa otro navegador.');
    }

    throw error;
  }
}

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

