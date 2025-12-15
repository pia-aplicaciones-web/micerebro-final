'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface DictationInputParams {
  elementRef: React.RefObject<HTMLElement | HTMLInputElement | HTMLTextAreaElement>;
  isListening: boolean;
  liveTranscript: string; // Combina final e interim
  finalTranscript: string;
  interimTranscript: string;
  isSelected: boolean; // Si el elemento contentEditable está seleccionado/activo
  enabled: boolean; // Controla si este hook debe estar activo
}

export const useDictationInput = ({
  elementRef,
  isListening,
  liveTranscript,
  finalTranscript,
  interimTranscript,
  isSelected,
  enabled,
}: DictationInputParams) => {
  const speechRecognitionRangeRef = useRef<Range | null>(null);
  const interimSpeechNodeRef = useRef<HTMLSpanElement | null>(null);
  const currentLiveTranscriptRef = useRef('');
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (enabled && isListening && isSelected && !speechRecognitionRangeRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && elementRef.current && elementRef.current.contains(selection.anchorNode)) {
        speechRecognitionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
    }
    if (!enabled || !isListening || !isSelected) {
      speechRecognitionRangeRef.current = null;
      if (interimSpeechNodeRef.current && interimSpeechNodeRef.current.parentNode) {
        interimSpeechNodeRef.current.parentNode.removeChild(interimSpeechNodeRef.current);
        interimSpeechNodeRef.current = null;
      }
    }
  }, [enabled, isListening, isSelected, elementRef]);

  useEffect(() => {
    if (!enabled || !isListening || !isSelected || !elementRef.current) {
      currentLiveTranscriptRef.current = '';
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;

    if (liveTranscript === currentLiveTranscriptRef.current) {
      return;
    }
    currentLiveTranscriptRef.current = liveTranscript;

    if (speechRecognitionRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(speechRecognitionRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(elementRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (interimSpeechNodeRef.current && interimSpeechNodeRef.current.parentNode) {
      interimSpeechNodeRef.current.parentNode.removeChild(interimSpeechNodeRef.current);
      interimSpeechNodeRef.current = null;
    }

    if (finalTranscript && interimTranscript === '') {
      document.execCommand('insertText', false, finalTranscript + ' ');
    } else if (interimTranscript) {
      const span = document.createElement('span');
      span.style.color = '#a0aec0';
      span.textContent = interimTranscript;
      interimSpeechNodeRef.current = span;

      const range = selection.getRangeAt(0);
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (selection.rangeCount > 0) {
      speechRecognitionRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, [enabled, isListening, isSelected, elementRef, liveTranscript, finalTranscript, interimTranscript]);

  useEffect(() => {
    return () => {
      if (interimSpeechNodeRef.current && interimSpeechNodeRef.current.parentNode) {
        interimSpeechNodeRef.current.parentNode.removeChild(interimSpeechNodeRef.current);
        interimSpeechNodeRef.current = null;
      }
      speechRecognitionRangeRef.current = null;
    };
  }, []);
};