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
 * Detecta si el dispositivo es móvil o si hay problemas con sessionStorage
 * Siempre retorna true para móviles para evitar problemas con redirect
 */
function shouldUsePopup() {
  if (typeof window === 'undefined') return true;
  
  // Verificar si estamos en un dispositivo móvil (mejorado)
  const userAgent = navigator.userAgent || navigator.vendor || (typeof window.opera !== 'undefined' ? window.opera : '');
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  
  // Verificar tamaño de pantalla (móviles generalmente tienen ancho < 768px)
  const isSmallScreen = window.innerWidth < 768;
  
  // Verificar si sessionStorage está disponible y funciona correctamente
  let sessionStorageAvailable = false;
  try {
    const testKey = '__firebase_auth_test__';
    sessionStorage.setItem(testKey, 'test');
    const retrieved = sessionStorage.getItem(testKey);
    sessionStorage.removeItem(testKey);
    sessionStorageAvailable = retrieved === 'test';
  } catch (e) {
    console.warn('⚠️ sessionStorage no disponible:', e);
    sessionStorageAvailable = false;
  }
  
  // Verificar si estamos en modo de almacenamiento particionado (común en móviles)
  const isStoragePartitioned = !sessionStorageAvailable || 
    (navigator.userAgentData && navigator.userAgentData.mobile);
  
  // Usar popup si es móvil, pantalla pequeña, o hay problemas con sessionStorage
  const usePopup = isMobile || isSmallScreen || !sessionStorageAvailable || isStoragePartitioned;
  
  if (usePopup) {
    console.log('📱 Usando popup para login (móvil o problemas con sessionStorage detectados)');
  }
  
  return usePopup;
}

function isSessionStorageAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__firebase_auth_test__';
    sessionStorage.setItem(testKey, 'test');
    const retrieved = sessionStorage.getItem(testKey);
    sessionStorage.removeItem(testKey);
    return retrieved === 'test';
  } catch (e) {
    console.warn('⚠️ sessionStorage no disponible:', e);
    return false;
  }
}

/**
 * Inicia sesión con Google usando popup (siempre en móviles para evitar problemas con sessionStorage)
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
  
  // Siempre usar popup en móviles o si hay problemas con sessionStorage
  const usePopup = shouldUsePopup();
  
  if (!usePopup) {
    console.warn('⚠️ Se detectó desktop pero se recomienda usar popup para evitar problemas. Usando popup de todas formas.');
  }
  
  try {
    console.log('🔄 Iniciando sesión con Google (popup)...');
    const result = await signInWithPopup(auth, provider);
    console.log('✅ signInWithPopup exitoso:', result.user.email);
    return result;
  } catch (error) {
    console.error("❌ Error during Google sign-in popup:", error);
    
    // Manejar errores específicos
    if (error.code === 'auth/popup-blocked') {
      throw new Error('El popup fue bloqueado. Por favor, permite popups para este sitio en la configuración del navegador e intenta de nuevo.');
    }
    
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('El popup fue cerrado antes de completar el login. Por favor, intenta de nuevo.');
    }
    
    // Si hay error relacionado con sessionStorage, dar mensaje más claro
    if (error.message?.includes('sessionStorage') || error.message?.includes('initial state') || error.message?.includes('missing initial state')) {
      console.error('❌ Error de sessionStorage detectado. Esto no debería pasar con popup.');
      throw new Error('Error de autenticación. Por favor, intenta cerrar y abrir el navegador, o usa otro navegador.');
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
 * Nota: Con la nueva implementación, siempre usamos popup, pero mantenemos esto
 * por compatibilidad por si hay redirects pendientes de sesiones anteriores.
 */
export async function handleGoogleSignInResult(auth) {
  try {
    // Evitar getRedirectResult si sessionStorage no está disponible
    if (!isSessionStorageAvailable()) {
      return null;
    }

    // Intentar obtener resultado de redirect (por si se usó redirect en una sesión anterior)
    // Esto es solo para limpiar redirects pendientes, no para el flujo normal
    let redirectResult = null;
    try {
      redirectResult = await getRedirectResult(auth);
    } catch (error) {
      // Ignorar errores de "missing initial state" en navegadores con storage particionado
      if (error?.message?.includes('missing initial state') || error?.message?.includes('sessionStorage')) {
        console.warn('⚠️ getRedirectResult ignorado por storage no disponible:', error?.message);
        return null;
      }
      throw error;
    }
    if (redirectResult) {
      console.log('✅ Login con Google exitoso (redirect pendiente procesado):', redirectResult.user.email);
      return redirectResult;
    }

    // Si no hay resultado de redirect, significa que no se usó redirect o ya se procesó
    return null;
  } catch (error) {
    console.error('❌ Error getting redirect result:', error);

    // Si hay un error relacionado con sessionStorage, es porque se intentó usar redirect
    // pero ahora siempre usamos popup, así que este error no debería ocurrir en el flujo normal
    if (error.message?.includes('sessionStorage') || 
        error.message?.includes('initial state') || 
        error.message?.includes('missing initial state')) {
      console.warn('⚠️ Problema con sessionStorage detectado en redirect. Esto no debería pasar ya que usamos popup.');
      // No lanzar error, solo loggear, porque el flujo normal usa popup
      return null;
    }

    // Para otros errores, solo loggear pero no fallar
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
