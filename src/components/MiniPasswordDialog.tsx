'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MiniPasswordDialogProps {
  elementTitle: string;
  currentPassword?: string;
  isLocked?: boolean;
  onPasswordChange: (password: string | null) => void;
  onUnlock?: () => void;
  onClose: () => void;
  isSettingPassword?: boolean;
}

export function MiniPasswordDialog({
  elementTitle,
  currentPassword,
  isLocked = false,
  onPasswordChange,
  onUnlock,
  onClose,
  isSettingPassword = false
}: MiniPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Contraseña requerida',
        description: 'Por favor ingresa una contraseña.'
      });
      return;
    }

    if (password.length < 4) {
      toast({
        variant: 'destructive',
        title: 'Contraseña muy corta',
        description: 'La contraseña debe tener al menos 4 caracteres.'
      });
      return;
    }

    if (confirmPassword !== password) {
      toast({
        variant: 'destructive',
        title: 'Contraseñas no coinciden',
        description: 'La confirmación de contraseña no coincide.'
      });
      return;
    }

    setIsLoading(true);
    try {
      await onPasswordChange(password.trim());
      toast({
        title: 'Contraseña configurada',
        description: `El elemento "${elementTitle}" ahora está protegido con contraseña.`
      });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo configurar la contraseña.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setIsLoading(true);
    try {
      await onPasswordChange(null);
      toast({
        title: 'Contraseña removida',
        description: `El elemento "${elementTitle}" ya no tiene protección de contraseña.`
      });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo remover la contraseña.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Contraseña requerida',
        description: 'Por favor ingresa la contraseña para desbloquear.'
      });
      return;
    }

    if (password.trim() !== currentPassword) {
      toast({
        variant: 'destructive',
        title: 'Contraseña incorrecta',
        description: 'La contraseña ingresada no es correcta.'
      });
      return;
    }

    setIsLoading(true);
    try {
      // El desbloqueo se maneja cambiando el estado isLocked
      if (onUnlock) {
        onUnlock();
      }
      toast({
        title: 'Elemento desbloqueado',
        description: `Ahora puedes editar "${elementTitle}".`
      });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo desbloquear el elemento.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLocked && currentPassword) {
    // Diálogo para desbloquear
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Lock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-xl">
              Elemento Protegido
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>"{elementTitle}"</strong> requiere una contraseña para editar.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unlock-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="unlock-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa la contraseña..."
                    className="pr-10"
                    autoFocus
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !password.trim()}
                >
                  {isLoading ? 'Verificando...' : 'Desbloquear'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Diálogo para configurar/remover contraseña
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl">
            {currentPassword ? 'Cambiar Contraseña' : 'Configurar Contraseña'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Protege <strong>"{elementTitle}"</strong> con una contraseña.
          </p>
        </CardHeader>
        <CardContent>
          {currentPassword && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                ⚠️ Este elemento ya tiene una contraseña configurada.
              </p>
            </div>
          )}

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {currentPassword ? 'Nueva Contraseña' : 'Contraseña'}
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa una contraseña..."
                  className="pr-10"
                  autoFocus
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma la contraseña..."
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !password.trim() || !confirmPassword.trim()}
              >
                {isLoading ? 'Guardando...' : (currentPassword ? 'Cambiar' : 'Configurar')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>

            {currentPassword && (
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-red-600 hover:bg-red-50"
                  onClick={handleRemovePassword}
                  disabled={isLoading}
                >
                  Remover Contraseña
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
