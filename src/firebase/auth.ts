'use client';

import {
  type Auth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';

/**
 * Detecta si el dispositivo es móvil o si hay problemas con sessionStorage
 */
function shouldUsePopup(): boolean {
  // Verificar si estamos en un dispositivo móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Verificar si sessionStorage está disponible
  let sessionStorageAvailable = false;
  try {
    const testKey = '__firebase_auth_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    sessionStorageAvailable = true;
  } catch (e) {
    sessionStorageAvailable = false;
  }

  // Usar popup si es móvil o si sessionStorage no está disponible
  return isMobile || !sessionStorageAvailable;
}

/**
 * Initiates the Google sign-in process using redirect (desktop) or popup (mobile).
 * @param auth The Firebase Auth instance.
 */
export async function signInWithGoogle(auth: Auth): Promise<UserCredential> {
  if (typeof window === 'undefined') {
    throw new Error('signInWithGoogle solo puede ejecutarse en el cliente');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  const usePopup = shouldUsePopup();

  if (usePopup) {
    console.log('🔄 Usando popup para login con Google (móvil/detectado problema de sessionStorage)...');
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Login con Google exitoso:', result.user.email);
      return result;
    } catch (error: any) {
      console.error('❌ Error en popup de Google:', error);

      // Si el popup es bloqueado, intentar con redirect como fallback
      if (error.code === 'auth/popup-blocked') {
        console.log('🔄 Popup bloqueado, intentando con redirect...');
        await signInWithRedirect(auth, provider);
        // Esta línea no se ejecutará porque signInWithRedirect redirige
        throw new Error('Redirigiendo a Google...');
      }

      throw error;
    }
  } else {
    console.log('🔄 Redirigiendo a Google para login (desktop)...');
    await signInWithRedirect(auth, provider);
    // Esta función ya no retorna un UserCredential porque signInWithRedirect redirige
    throw new Error('Redirigiendo a Google...');
  }
}

/**
 * Maneja el resultado de Google sign-in (tanto popup como redirect).
 * @param auth The Firebase Auth instance.
 * @returns A promise that resolves with the user credential or null.
 */
export async function handleGoogleSignInResult(auth: Auth): Promise<UserCredential | null> {
  try {
    // Primero intentar obtener resultado de redirect (por si se usó redirect)
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult) {
      console.log('✅ Login con Google exitoso (redirect):', redirectResult.user.email);
      return redirectResult;
    }

    // Si no hay resultado de redirect, significa que no se usó redirect o ya se procesó
    return null;
  } catch (error: any) {
    console.error('❌ Error getting redirect result:', error);

    // Si hay un error relacionado con sessionStorage, sugerir usar popup
    if (error.message?.includes('sessionStorage') || error.message?.includes('initial state')) {
      console.warn('⚠️ Problema con sessionStorage detectado. Se recomienda usar popup para móviles.');
      throw new Error('Problema con el almacenamiento del navegador. Intenta desde una pestaña de incógnito o usa otro navegador.');
    }

    throw error;
  }
}

/**
 * Signs in the user anonymously.
 * @param auth The Firebase Auth instance.
 * @returns A promise that resolves with the user credential.
 */
export const signInAsGuest = async (auth: Auth): Promise<UserCredential> => {
  try {
    console.log('🔄 Iniciando sesión como invitado...');
    const userCredential = await signInAnonymously(auth);
    console.log('✅ Login como invitado exitoso');
    return userCredential;
  } catch (error) {
    console.error('❌ Error signing in as guest:', error);
    throw error;
  }
};

/**
 * Signs in the user with email and password.
 * @param auth The Firebase Auth instance.
 * @param email The user's email address.
 * @param password The user's password.
 * @returns A promise that resolves with the user credential.
 */
export const signInWithEmail = async (auth: Auth, email: string, password: string): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

/**
 * Creates a new user account with email and password.
 * @param auth The Firebase Auth instance.
 * @param email The user's email address.
 * @param password The user's password.
 * @returns A promise that resolves with the user credential.
 */
export const createUserWithEmail = async (auth: Auth, email: string, password: string): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    console.error('Error creating user with email:', error);
    throw error;
  }
};

/**
 * Signs the current user out.
 * @param {Auth} auth - The Firebase Auth instance.
 * @returns {Promise<void>} A promise that resolves when sign-out is complete.
 */
export const signOut = async (auth: Auth): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};
