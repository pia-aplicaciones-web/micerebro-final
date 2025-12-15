'use client';
import { useEffect, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import type { FirestorePermissionError } from '@/firebase/errors';
import { useAuthContext } from '@/context/AuthContext';

/**
 * A client-side component that listens for permission errors
 * and displays them as toasts for easier debugging during development.
 */
export default function FirebaseErrorListener() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  
  // CRÍTICO: Usar refs para evitar re-suscripciones cuando toast o user cambian
  const toastRef = useRef(toast);
  const userRef = useRef(user);
  
  // Actualizar refs cuando cambian
  useEffect(() => {
    toastRef.current = toast;
    userRef.current = user;
  }, [toast, user]);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Pass the user from the ref to the error for more context
      const contextualError = error.withUser(userRef.current);

      console.error('Firestore Permission Error Caught:', contextualError.message);
      
      // Usar ref en lugar de valor directo
      toastRef.current({
        variant: 'destructive',
        title: 'Error de Permisos de Firestore',
        description: 'No tienes permiso para realizar esta acción. Revisa las reglas de seguridad y la consola para más detalles.',
        duration: 9000,
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []); // CRÍTICO: Sin dependencias - usar refs en su lugar

  return null;
}
