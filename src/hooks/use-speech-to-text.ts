'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para reconocimiento de voz que solo se activa con botón manual
 * Compatible con Chrome, Edge, Safari
 */
export const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const { toast } = useToast();

  const recognitionRef = useRef<any>(null);
  const isManualStop = useRef(false);
  const shouldBeListening = useRef(false);
  const isStartingRef = useRef(false);
  const isRecognitionRunningRef = useRef(false);
  const permissionGranted = useRef(false);
  const isRequestingPermission = useRef(false);
  const beepTimeoutRef = useRef<number | null>(null);
  const beepIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (beepTimeoutRef.current) window.clearTimeout(beepTimeoutRef.current);
      if (beepIntervalRef.current) window.clearInterval(beepIntervalRef.current);
    };
  }, []);

  const playBeep = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.18);
    } catch {
      // no-op
    }
  }, []);

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition no soportado en este navegador');
      toast({
        variant: 'destructive',
        title: 'Dictado no disponible',
        description: 'Tu navegador no soporta reconocimiento de voz.',
      });
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
      setIsListening(true);
      shouldBeListening.current = true;
      toast({ title: 'Micrófono activado', description: 'Dictado en curso.' });
      if (beepTimeoutRef.current) window.clearTimeout(beepTimeoutRef.current);
      if (beepIntervalRef.current) window.clearInterval(beepIntervalRef.current);
      beepTimeoutRef.current = window.setTimeout(() => {
        playBeep();
        beepIntervalRef.current = window.setInterval(() => {
          playBeep();
        }, 30000);
      }, 5 * 60 * 1000);
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
        setTranscript(prev => prev + final);
      }
      if (interim) {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        console.warn('Permisos de micrófono denegados');
        isRecognitionRunningRef.current = false;
        setIsListening(false);
        shouldBeListening.current = false;
        if (beepTimeoutRef.current) window.clearTimeout(beepTimeoutRef.current);
        if (beepIntervalRef.current) window.clearInterval(beepIntervalRef.current);
        beepTimeoutRef.current = null;
        beepIntervalRef.current = null;
        return;
      }
      if (!isManualStop.current && shouldBeListening.current) {
        try {
          setTimeout(() => recognition.start(), 100);
        } catch (e) {
          console.warn('Error crítico de reconocimiento:', event.error);
          isRecognitionRunningRef.current = false;
          setIsListening(false);
          shouldBeListening.current = false;
        }
      } else {
        console.warn('Error de reconocimiento:', event.error);
        isRecognitionRunningRef.current = false;
        setIsListening(false);
        shouldBeListening.current = false;
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (isManualStop.current) {
        setIsListening(false);
        shouldBeListening.current = false;
        setInterimTranscript('');
        if (beepTimeoutRef.current) window.clearTimeout(beepTimeoutRef.current);
        if (beepIntervalRef.current) window.clearInterval(beepIntervalRef.current);
        beepTimeoutRef.current = null;
        beepIntervalRef.current = null;
      } else if (shouldBeListening.current) {
        try {
          recognition.start();
        } catch (e) {
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
    return recognition;
  }, [toast]);

  const startListening = useCallback((fromUserGesture = false) => {
    const startRecognition = () => {
      const recognition = initRecognition();
      if (!recognition) return;
      if (isRecognitionRunningRef.current || isStartingRef.current) return;
      isStartingRef.current = true;
      isManualStop.current = false;
      shouldBeListening.current = true;
      setTranscript('');
      setInterimTranscript('');
      try {
        recognition.start();
      } catch (e) {
        console.warn('Error al iniciar reconocimiento de voz:', e);
        isRecognitionRunningRef.current = false;
        setIsListening(false);
        shouldBeListening.current = false;
      } finally {
        isStartingRef.current = false;
      }
    };

    if (permissionGranted.current) {
      startRecognition();
      return;
    }

    const requestPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia no soportado en este navegador');
        toast({
          variant: 'destructive',
          title: 'Micrófono no disponible',
          description: 'Tu navegador no permite acceso al micrófono.',
        });
        return;
      }

      if (isRequestingPermission.current) return;
      isRequestingPermission.current = true;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        permissionGranted.current = true;
        startRecognition();
      } catch {
        console.warn('Permiso de micrófono denegado o bloqueado');
        permissionGranted.current = false;
        toast({
          variant: 'destructive',
          title: 'Permiso denegado',
          description: 'Activa el micrófono en tu navegador para dictar.',
        });
        setIsListening(false);
        shouldBeListening.current = false;
        if (beepTimeoutRef.current) window.clearTimeout(beepTimeoutRef.current);
        if (beepIntervalRef.current) window.clearInterval(beepIntervalRef.current);
        beepTimeoutRef.current = null;
        beepIntervalRef.current = null;
      } finally {
        isRequestingPermission.current = false;
      }
    };

    const permissionApi = (navigator as any).permissions;
    if (permissionApi?.query) {
      permissionApi.query({ name: 'microphone' }).then((status: any) => {
        if (status?.state === 'granted') {
          permissionGranted.current = true;
          startRecognition();
        } else if (status?.state === 'denied') {
          toast({
            variant: 'destructive',
            title: 'Permiso denegado',
            description: 'Activa el micrófono en tu navegador para dictar.',
          });
          setIsListening(false);
          shouldBeListening.current = false;
        } else {
          requestPermission();
        }
      }).catch(() => {
        requestPermission();
      });
      return;
    }

    requestPermission();
  }, [initRecognition, toast]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    isManualStop.current = true;
    shouldBeListening.current = false;
    recognitionRef.current.stop();
    isRecognitionRunningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (beepTimeoutRef.current) window.clearTimeout(beepTimeoutRef.current);
    if (beepIntervalRef.current) window.clearInterval(beepIntervalRef.current);
    beepTimeoutRef.current = null;
    beepIntervalRef.current = null;
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(true);
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
