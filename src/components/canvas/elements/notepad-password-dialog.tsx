'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotepadPasswordDialogProps {
  notepadTitle: string;
  isLocked: boolean;
  onPasswordSubmit: (password: string) => void;
  onSetPassword?: (password: string) => void;
  onRemovePassword?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: 'unlock' | 'set' | 'change' | 'remove';
}

export default function NotepadPasswordDialog({
  notepadTitle,
  isLocked,
  onPasswordSubmit,
  onSetPassword,
  onRemovePassword,
  onCancel,
  isLoading = false,
  mode
}: NotepadPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const getDialogTitle = () => {
    switch (mode) {
      case 'unlock':
        return isLocked ? 'Cuaderno Bloqueado' : 'Acceder al Cuaderno';
      case 'set':
        return 'Establecer Contraseña';
      case 'change':
        return 'Cambiar Contraseña';
      case 'remove':
        return 'Remover Contraseña';
      default:
        return 'Contraseña del Cuaderno';
    }
  };

  const getDialogDescription = () => {
    switch (mode) {
      case 'unlock':
        return isLocked
          ? `"${notepadTitle}" está bloqueado. Ingresa la contraseña para desbloquearlo.`
          : `"${notepadTitle}" requiere contraseña para acceder.`;
      case 'set':
        return `Establece una contraseña para proteger "${notepadTitle}".`;
      case 'change':
        return `Cambia la contraseña de "${notepadTitle}".`;
      case 'remove':
        return `¿Quieres remover la protección con contraseña de "${notepadTitle}"?`;
      default:
        return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    switch (mode) {
      case 'unlock':
        if (!password.trim()) {
          toast({
            variant: 'destructive',
            title: 'Contraseña requerida',
            description: 'Por favor ingresa la contraseña del cuaderno.'
          });
          return;
        }
        onPasswordSubmit(password.trim());
        break;

      case 'set':
        if (!newPassword.trim()) {
          toast({
            variant: 'destructive',
            title: 'Contraseña requerida',
            description: 'Por favor ingresa una nueva contraseña.'
          });
          return;
        }
        if (newPassword.length < 4) {
          toast({
            variant: 'destructive',
            title: 'Contraseña muy corta',
            description: 'La contraseña debe tener al menos 4 caracteres.'
          });
          return;
        }
        if (onSetPassword) {
          onSetPassword(newPassword.trim());
        }
        break;

      case 'change':
        if (!password.trim()) {
          toast({
            variant: 'destructive',
            title: 'Contraseña actual requerida',
            description: 'Por favor ingresa la contraseña actual.'
          });
          return;
        }
        if (!newPassword.trim()) {
          toast({
            variant: 'destructive',
            title: 'Nueva contraseña requerida',
            description: 'Por favor ingresa una nueva contraseña.'
          });
          return;
        }
        if (newPassword.length < 4) {
          toast({
            variant: 'destructive',
            title: 'Contraseña muy corta',
            description: 'La contraseña debe tener al menos 4 caracteres.'
          });
          return;
        }
        if (newPassword !== confirmPassword) {
          toast({
            variant: 'destructive',
            title: 'Contraseñas no coinciden',
            description: 'La nueva contraseña y su confirmación deben ser iguales.'
          });
          return;
        }
        // First verify current password, then set new one
        onPasswordSubmit(password.trim());
        break;

      case 'remove':
        if (!password.trim()) {
          toast({
            variant: 'destructive',
            title: 'Contraseña requerida',
            description: 'Por favor ingresa la contraseña actual para remover la protección.'
          });
          return;
        }
        onPasswordSubmit(password.trim());
        break;
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const renderPasswordInputs = () => {
    switch (mode) {
      case 'unlock':
        return (
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
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
        );

      case 'set':
        return (
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa una nueva contraseña..."
                className="pr-10"
                autoFocus
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La contraseña debe tener al menos 4 caracteres.
            </p>
          </div>
        );

      case 'change':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña actual..."
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
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingresa una nueva contraseña..."
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma la nueva contraseña..."
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
          </div>
        );

      case 'remove':
        return (
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña Actual</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña para remover..."
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
        );

      default:
        return null;
    }
  };

  const getSubmitButtonText = () => {
    if (isLoading) {
      switch (mode) {
        case 'unlock':
          return 'Verificando...';
        case 'set':
          return 'Estableciendo...';
        case 'change':
          return 'Cambiando...';
        case 'remove':
          return 'Removiendo...';
        default:
          return 'Procesando...';
      }
    }

    switch (mode) {
      case 'unlock':
        return 'Desbloquear';
      case 'set':
        return 'Establecer';
      case 'change':
        return 'Cambiar';
      case 'remove':
        return 'Remover';
      default:
        return 'Aceptar';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              {mode === 'unlock' ? (
                <Lock className="h-6 w-6 text-blue-600" />
              ) : (
                <Unlock className="h-6 w-6 text-blue-600" />
              )}
            </div>
          </div>
          <CardTitle className="text-xl">
            {getDialogTitle()}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {getDialogDescription()}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderPasswordInputs()}

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || (mode === 'unlock' && !password.trim()) || (mode === 'set' && !newPassword.trim()) || (mode === 'change' && (!password.trim() || !newPassword.trim())) || (mode === 'remove' && !password.trim())}
              >
                {getSubmitButtonText()}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
