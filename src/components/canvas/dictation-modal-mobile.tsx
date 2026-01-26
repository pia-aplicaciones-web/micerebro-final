// src/components/canvas/dictation-modal-mobile.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, X, Trash2, Undo, Redo, Eraser } from 'lucide-react';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useDictation } from '@/hooks/use-dictation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DictationModalMobileProps {
  isOpen: boolean;
  onClose: (text: string, title: string) => void; // Función para guardar el texto y cerrar
  initialText?: string;
  initialTitle?: string;
}

export default function DictationModalMobile({
  isOpen,
  onClose,
  initialText = '',
  initialTitle = '',
}: DictationModalMobileProps) {
  const { toast } = useToast();
  const [currentText, setCurrentText] = useState(initialText);
  const [currentTitle, setCurrentTitle] = useState(initialTitle || `Dictado ${format(new Date(), 'dd/MM/yyyy')}`);
  const [history, setHistory] = useState<string[]>([initialText]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hook de dictado
  const { isListening, transcript, interimTranscript, toggleListening } = useSpeechToText();
  // El useDictation hook se encarga de la lógica de agregar el transcript al input,
  // aquí lo usamos para controlar la escucha pero la gestión del texto es manual.
  // Podríamos necesitar un uso más directo del transcript aquí.

  // Efecto para sincronizar el transcript con el texto del modal
  useEffect(() => {
    if (transcript) {
      setCurrentText(prev => prev + ' ' + transcript);
      // Opcional: Actualizar historial aquí si se desea deshacer palabra por palabra.
      // Para simplicidad, actualizaremos el historial al cerrar o borrar.
    }
  }, [transcript]);

  // Manejar el texto interino
  useEffect(() => {
    if (textareaRef.current) {
      if (isListening && interimTranscript) {
        // Mostrar el texto interino, pero sin guardarlo al estado actual
        // Esto es un desafío con textarea que gestiona su propio valor.
        // Por ahora, solo se agregará al transcript final.
        // Si el usuario ve un campo de texto en vivo, el interimText ya se maneja en useSpeechToText.
      }
    }
  }, [isListening, interimTranscript]);


  const saveTextAndClose = useCallback(() => {
    onClose(currentText, currentTitle);
    // Reiniciar estados para la próxima vez que se abra el modal
    setCurrentText('');
    setCurrentTitle(`Dictado ${format(new Date(), 'dd/MM/yyyy')}`);
    setHistory(['']);
    setHistoryIndex(0);
  }, [onClose, currentText, currentTitle]);

  const handleClearContent = useCallback(() => {
    setCurrentText('');
    setHistory(['']);
    setHistoryIndex(0);
    toast({ title: 'Contenido borrado' });
  }, [toast]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentText(history[newIndex]);
      toast({ title: 'Deshacer' });
    } else {
      toast({ title: 'No hay más acciones para deshacer' });
    }
  }, [history, historyIndex, toast]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentText(history[newIndex]);
      toast({ title: 'Rehacer' });
    } else {
      toast({ title: 'No hay más acciones para rehacer' });
    }
  }, [history, historyIndex, toast]);

  const handleDeleteLastWord = useCallback(() => {
    setCurrentText(prev => {
      const words = prev.trim().split(/\s+/);
      if (words.length > 1) {
        const newText = words.slice(0, words.length - 1).join(' ');
        // No actualizamos historial aquí, para que se guarde un estado más "limpio"
        return newText;
      }
      return '';
    });
    toast({ title: 'Última palabra borrada' });
  }, [toast]);

  // Actualizar historial cuando el texto cambia (para deshacer/rehacer)
  useEffect(() => {
    // Solo si el texto no viene de un undo/redo
    if (currentText !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentText);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [currentText]); // Dependencia del texto actual

  // Si el modal se cierra externamente, asegúrate de detener el dictado
  useEffect(() => {
    if (!isOpen && isListening) {
      toggleListening();
    }
  }, [isOpen, isListening, toggleListening]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && saveTextAndClose()}>
      <DialogContent className={cn(
        "fixed inset-0 w-screen h-screen max-w-full max-h-full p-0 flex flex-col",
        "bg-white bg-opacity-80 backdrop-blur-sm", // Fondo blanco 80% opacidad
        "md:rounded-lg md:max-w-[calc(100vw-40px)] md:max-h-[calc(100vh-40px)]" // Para desktop, si se abre
      )}>
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold flex-grow mr-4">
            <input
              type="text"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              className="bg-transparent outline-none w-full text-center"
              placeholder="Título del dictado"
            />
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={saveTextAndClose}>
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex-1 p-4 overflow-auto relative">
          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none resize-none text-base font-body"
            placeholder="Comienza a dictar o escribir..."
            rows={1} // Ajuste para simular scroll infinito
            style={{ minHeight: 'calc(100vh - 150px)', lineHeight: '1.5rem' }} // Altura mínima y espaciado de línea para legibilidad
          />
        </div>

        <div className="p-4 border-t flex flex-wrap justify-center items-center gap-2">
          <Button
            variant={isListening ? 'destructive' : 'default'}
            className="rounded-full h-14 w-14"
            size="icon"
            onClick={toggleListening}
          >
            <Mic className={cn("h-8 w-8", { "animate-pulse": isListening })} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleClearContent} title="Borrar todo el contenido">
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex === 0} title="Deshacer">
            <Undo className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex === history.length - 1} title="Rehacer">
            <Redo className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDeleteLastWord} title="Borrar última palabra">
            <Eraser className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}