'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, ShieldCheck, ShieldX, Settings, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSafety } from '@/context/SafetyContext';

function SafetyControls() {
  const {
    config,
    toggleSafeMode,
    toggleAutoSave,
    toggleReadOnlyMode,
    canAutoSave,
    canModify,
  } = useSafety();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {config.safeMode ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5 text-gray-600" />
          )}
          Controles de Seguridad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Modo Seguro */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="safe-mode" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Modo Seguro
            </Label>
            <p className="text-sm text-muted-foreground">
              Previene reversiones automáticas de cambios
            </p>
          </div>
          <Switch
            id="safe-mode"
            checked={config.safeMode}
            onCheckedChange={toggleSafeMode}
          />
        </div>

        {/* Auto-guardado */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-save" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Auto-guardado
            </Label>
            <p className="text-sm text-muted-foreground">
              Guarda automáticamente los cambios
              {!canAutoSave() && (
                <span className="text-orange-600 font-medium"> (deshabilitado)</span>
              )}
            </p>
          </div>
          <Switch
            id="auto-save"
            checked={config.allowAutoSave}
            onCheckedChange={toggleAutoSave}
            disabled={config.safeMode}
          />
        </div>

        {/* Modo Solo Lectura */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="read-only" className="flex items-center gap-2">
              <ShieldX className="h-4 w-4" />
              Modo Solo Lectura
            </Label>
            <p className="text-sm text-muted-foreground">
              Previene cualquier modificación
              {config.readOnlyMode && (
                <span className="text-red-600 font-medium"> (activo)</span>
              )}
            </p>
          </div>
          <Switch
            id="read-only"
            checked={config.readOnlyMode}
            onCheckedChange={toggleReadOnlyMode}
          />
        </div>

        {/* Confirmación de reversiones */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="confirm-revert" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Confirmar Reversiones
            </Label>
            <p className="text-sm text-muted-foreground">
              Pide confirmación antes de revertir cambios
            </p>
          </div>
          <Switch
            id="confirm-revert"
            checked={config.confirmBeforeRevert}
            onCheckedChange={(checked) =>
              // Aquí actualizarías la configuración
              console.log('Confirm revert:', checked)
            }
          />
        </div>

        {/* Estado actual */}
        <div className="pt-4 border-t">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Estado de modificaciones:</span>
              <span className={canModify() ? 'text-green-600' : 'text-red-600'}>
                {canModify() ? 'Permitidas' : 'Bloqueadas'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Auto-guardado:</span>
              <span className={canAutoSave() ? 'text-green-600' : 'text-orange-600'}>
                {canAutoSave() ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Información de ayuda */}
        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
          <strong>💡 Modo Seguro:</strong> Cuando está activado, previene que la aplicación
          revierta automáticamente tus cambios. Útil durante sesiones de edición intensiva.
        </div>
      </CardContent>
    </Card>
  );
}

// Componente más simple para mostrar el estado de seguridad en la barra
export function SafetyIndicator() {
  const { config } = useSafety();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={config.safeMode ? "default" : "ghost"}
          size="sm"
          className={`flex items-center gap-2 ${
            config.safeMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''
          }`}
        >
          {config.safeMode ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {config.safeMode ? 'Modo Seguro' : 'Modo Normal'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Controles de Seguridad</DialogTitle>
        </DialogHeader>
        <SafetyControls />
      </DialogContent>
    </Dialog>
  );
}
