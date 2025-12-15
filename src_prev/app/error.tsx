'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    console.error('Error capturado:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        {error.message || 'Ocurrió un error inesperado. Por favor, intenta recargar la página.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Intentar de nuevo</Button>
        <Button variant="outline" onClick={() => router.push('/login')}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}

