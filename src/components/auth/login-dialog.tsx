'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { signInWithEmail, createUserWithEmail } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginDialog({ isOpen, onClose, onSuccess }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      if (isCreatingAccount) {
        await createUserWithEmail(email, password);
        toast({ title: 'Cuenta creada', description: 'Tu cuenta ha sido creada exitosamente' });
      } else {
        await signInWithEmail(email, password);
        toast({ title: 'Sesión iniciada', description: 'Bienvenido de vuelta' });
      }
      setEmail('');
      setPassword('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Ocurrió un error al iniciar sesión',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa tu email y contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Cargando...' : isCreatingAccount ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsCreatingAccount(!isCreatingAccount)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {isCreatingAccount ? '¿Ya tienes cuenta? Inicia sesión' : 'Opción crear cuenta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
