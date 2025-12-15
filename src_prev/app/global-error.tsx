'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    console.error('Error global capturado:', error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error crítico</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {error.message || 'Ocurrió un error crítico en la aplicación.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset}>Intentar de nuevo</Button>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

