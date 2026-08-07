// Utilidades de autenticación
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { initFirebase, getFirebaseAuth } from './firebase';

const REDIRECTING_MSG = 'Redirigiendo a Google...';

/**
 * Detecta móvil / WebView / pantalla estrecha donde los popups suelen fallar.
 */
function shouldUseRedirect() {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || '';
  const isMobileUa = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isSmallScreen = window.innerWidth < 768;
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    // @ts-ignore iOS Safari
    navigator.standalone === true;

  return isMobileUa || isIpadOs || isSmallScreen || isStandalone;
}

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}

async function ensureAuth() {
  await initFirebase();
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está inicializado');
  }
  return auth;
}

/**
 * Inicia sesión con Google.
 * - Móvil: redirect (evita popups bloqueados en Safari/Chrome Android)
 * - Desktop: popup, con fallback a redirect si el popup está bloqueado
 */
export async function signInWithGoogle() {
  if (typeof window === 'undefined') {
    throw new Error('signInWithGoogle solo puede ejecutarse en el cliente');
  }

  const auth = await ensureAuth();
  const provider = createGoogleProvider();
  const useRedirect = shouldUseRedirect();

  if (useRedirect) {
    console.log('📱 Login Google con redirect (móvil)...');
    await signInWithRedirect(auth, provider);
    throw new Error(REDIRECTING_MSG);
  }

  try {
    console.log('💻 Login Google con popup (desktop)...');
    const result = await signInWithPopup(auth, provider);
    console.log('✅ signInWithPopup exitoso:', result.user.email);
    return result;
  } catch (error) {
    console.error('❌ Error during Google sign-in popup:', error);

    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      console.log('🔄 Popup no disponible, usando redirect...');
      await signInWithRedirect(auth, provider);
      throw new Error(REDIRECTING_MSG);
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

  const auth = await ensureAuth();

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

  const auth = await ensureAuth();

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

  const auth = await ensureAuth();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error creating user with email:', error);
    throw error;
  }
};

/**
 * Procesa el retorno de signInWithRedirect (y limpia redirects pendientes).
 */
export async function handleGoogleSignInResult(authInstance) {
  try {
    const auth = authInstance || (await ensureAuth());
    let redirectResult = null;
    try {
      redirectResult = await getRedirectResult(auth);
    } catch (error) {
      if (
        error?.message?.includes('missing initial state') ||
        error?.message?.includes('sessionStorage') ||
        error?.code === 'auth/no-auth-event'
      ) {
        console.warn('⚠️ getRedirectResult sin estado pendiente:', error?.message || error?.code);
        return null;
      }
      throw error;
    }

    if (redirectResult?.user) {
      console.log('✅ Login con Google exitoso (redirect):', redirectResult.user.email);
      return redirectResult;
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting redirect result:', error);
    if (
      error?.message?.includes('sessionStorage') ||
      error?.message?.includes('initial state') ||
      error?.message?.includes('missing initial state')
    ) {
      return null;
    }
    console.warn('⚠️ Error procesando redirect result (no crítico):', error);
    return null;
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export const signOut = async () => {
  if (typeof window !== 'undefined') {
    await initFirebase();
  }
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
