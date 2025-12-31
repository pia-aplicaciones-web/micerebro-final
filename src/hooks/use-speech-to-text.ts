'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook simple y robusto para reconocimiento de voz
 * Compatible con Chrome, Edge, Safari
 */
export const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const isManualStop = useRef(false);
  const shouldBeListening = useRef(false);

  // Inicializar una sola vez
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition no soportado en este navegador');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      shouldBeListening.current = true;
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final + ' ');
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      // Solo detener por errores críticos, ignorar timeout, no-speech, etc.
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'audio-capture' || event.error === 'network') {
        // Intentar reiniciar automáticamente para estos errores comunes
        if (!isManualStop.current && shouldBeListening.current) {
          try {
            setTimeout(() => recognition.start(), 100);
          } catch (e) {
            // Ignorar errores de reinicio
          }
        }
        return;
      }

      // Para errores críticos, intentar reiniciar si no fue parada manual
      if (!isManualStop.current && shouldBeListening.current) {
        try {
          setTimeout(() => recognition.start(), 100);
        } catch (e) {
          console.warn('Error crítico de reconocimiento:', event.error);
          setIsListening(false);
          shouldBeListening.current = false;
        }
      } else {
        console.warn('Error de reconocimiento:', event.error);
        setIsListening(false);
        shouldBeListening.current = false;
      }
    };

    recognition.onend = () => {
      // Solo detener completamente si fue parada manual por el usuario
      if (isManualStop.current) {
        setIsListening(false);
        shouldBeListening.current = false;
        setInterimTranscript('');
      } else if (shouldBeListening.current) {
        // Reiniciar automáticamente para mantener el dictado activo
        try {
          recognition.start();
        } catch (e) {
          // Si falla el reinicio, intentar después de un breve delay
          setTimeout(() => {
            if (shouldBeListening.current) {
              try {
                recognition.start();
              } catch (retryError) {
                console.warn('Error al reiniciar reconocimiento después de onend');
                setIsListening(false);
                shouldBeListening.current = false;
              }
            }
          }, 500);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        isManualStop.current = true;
        shouldBeListening.current = false;
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    isManualStop.current = false;
    shouldBeListening.current = true;
    setTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
    } catch (e) {
      // Si ya está corriendo, ignorar
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    isManualStop.current = true;
    shouldBeListening.current = false;
    recognitionRef.current.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Limpiar transcript cuando se necesite
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
};
