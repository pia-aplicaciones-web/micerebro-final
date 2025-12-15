'use client';

import {
  type Auth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';

/**
 * Initiates the Google sign-in process using redirect (sin popup).
 * @param auth The Firebase Auth instance.
 */
export async function signInWithGoogle(auth: Auth): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('signInWithGoogle solo puede ejecutarse en el cliente');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  
  console.log('🔄 Redirigiendo a Google para login...');
  await signInWithRedirect(auth, provider);
}

/**
 * Gets the result after Google redirect.
 * @param auth The Firebase Auth instance.
 * @returns A promise that resolves with the user credential or null.
 */
export async function getGoogleRedirectResult(auth: Auth): Promise<UserCredential | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('✅ Login con Google exitoso:', result.user.email);
    }
    return result;
  } catch (error: any) {
    console.error('❌ Error getting redirect result:', error);
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
