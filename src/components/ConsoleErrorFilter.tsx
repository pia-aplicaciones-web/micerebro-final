'use client';

import { useEffect } from 'react';

/**
 * Componente que filtra errores no críticos de la consola
 * - Suprime advertencias de Cross-Origin-Opener-Policy (COOP) que son conocidas y no afectan la funcionalidad
 * - Suprime errores temporales de Firestore durante la conexión inicial
 */
export default function ConsoleErrorFilter() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Guardar los métodos originales
    const originalError = console.error;
    const originalWarn = console.warn;

    // Errores/advertencias conocidos y no críticos que deben ser suprimidos
    const suppressedMessages = [
      'Cross-Origin-Opener-Policy policy would block the window.closed call',
      'Cross-Origin-Opener-Policy policy would block the window.close call',
      'WebChannelConnection RPC \'Listen\' stream',
      'transport errored',
    ];

    // URLs de Firestore que pueden fallar temporalmente durante la conexión inicial
    const suppressedFirestoreUrls = [
      'firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel',
    ];

    // Función para verificar si un mensaje debe ser suprimido
    const shouldSuppress = (message: string, ...args: any[]): boolean => {
      const messageStr = String(message);
      
      // Verificar mensajes conocidos
      if (suppressedMessages.some(msg => messageStr.includes(msg))) {
        return true;
      }

      // Verificar errores de Firestore temporales (404, 400) durante conexión inicial
      if (args.length > 0) {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && suppressedFirestoreUrls.some(url => firstArg.includes(url))) {
          // Solo suprimir errores 404 y 400 (conexión inicial)
          if (firstArg.includes('404') || firstArg.includes('400')) {
            return true;
          }
        }
        // Verificar si es un objeto Error con stack trace de Firestore
        if (firstArg instanceof Error && firstArg.stack) {
          if (suppressedFirestoreUrls.some(url => firstArg.stack?.includes(url))) {
            return true;
          }
        }
      }

      return false;
    };

    // Sobrescribir console.error
    console.error = (...args: any[]) => {
      if (!shouldSuppress(args[0] || '', ...args)) {
        originalError.apply(console, args);
      }
      // Silenciar errores suprimidos (no hacer nada)
    };

    // Sobrescribir console.warn
    console.warn = (...args: any[]) => {
      if (!shouldSuppress(args[0] || '', ...args)) {
        originalWarn.apply(console, args);
      }
      // Silenciar advertencias suprimidas (no hacer nada)
    };

    // Restaurar métodos originales al desmontar
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
