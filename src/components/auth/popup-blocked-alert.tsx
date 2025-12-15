'use client';

import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PopupBlockedAlertProps {
  onDismiss?: () => void;
}

export function PopupBlockedAlert({ onDismiss }: PopupBlockedAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Alert 
      variant="destructive" 
      className="fixed bottom-4 left-4 right-4 z-50 max-w-2xl mx-auto shadow-lg border-2"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <AlertTitle className="font-semibold mb-1">
            Pop-ups bloqueados
          </AlertTitle>
          <AlertDescription className="text-sm">
            Para iniciar sesión con Google, necesitas permitir pop-ups en este sitio.
            <br />
            <strong className="mt-2 block">Cómo permitir pop-ups:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 ml-2">
              <li>Busca el icono de bloqueo o pop-up en la barra de direcciones</li>
              <li>Haz clic y selecciona "Permitir pop-ups y redirecciones"</li>
              <li>O ve a Configuración del navegador → Privacidad → Pop-ups</li>
              <li>Agrega <code className="bg-red-100 px-1 rounded">app-micerebro.web.app</code> a la lista de sitios permitidos</li>
            </ol>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

