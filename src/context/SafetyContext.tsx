'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SafetyConfig {
  // Modo seguro: previene reversiones automáticas
  safeMode: boolean;

  // Permitir auto-guardado
  allowAutoSave: boolean;

  // Permitir hot reloading
  allowHotReload: boolean;

  // Confirmar antes de revertir cambios
  confirmBeforeRevert: boolean;

  // Modo de solo lectura (previene cualquier modificación)
  readOnlyMode: boolean;
}

interface SafetyContextType {
  config: SafetyConfig;
  updateConfig: (updates: Partial<SafetyConfig>) => void;
  toggleSafeMode: () => void;
  toggleAutoSave: () => void;
  toggleReadOnlyMode: () => void;

  // Funciones de verificación de seguridad
  canAutoSave: () => boolean;
  canModify: () => boolean;
  shouldConfirmRevert: () => boolean;
}

const defaultConfig: SafetyConfig = {
  safeMode: false, // Por defecto desactivado para compatibilidad
  allowAutoSave: true,
  allowHotReload: true,
  confirmBeforeRevert: false,
  readOnlyMode: false,
};

const SafetyContext = createContext<SafetyContextType | null>(null);

export function SafetyProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SafetyConfig>(() => {
    // Intentar cargar configuración desde localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('canvasmind-safety-config');
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
      } catch {
        return defaultConfig;
      }
    }
    return defaultConfig;
  });

  // Guardar configuración en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('canvasmind-safety-config', JSON.stringify(config));
      } catch (error) {
        console.warn('No se pudo guardar configuración de seguridad:', error);
      }
    }
  }, [config]);

  const updateConfig = (updates: Partial<SafetyConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleSafeMode = () => {
    setConfig(prev => ({
      ...prev,
      safeMode: !prev.safeMode,
      // Cuando se activa modo seguro, se configuran valores seguros por defecto
      ...(prev.safeMode ? {} : {
        allowAutoSave: false,
        confirmBeforeRevert: true,
        readOnlyMode: false,
      })
    }));
  };

  const toggleAutoSave = () => {
    setConfig(prev => ({ ...prev, allowAutoSave: !prev.allowAutoSave }));
  };

  const toggleReadOnlyMode = () => {
    setConfig(prev => ({ ...prev, readOnlyMode: !prev.readOnlyMode }));
  };

  // Funciones de verificación de seguridad
  const canAutoSave = () => {
    return !config.safeMode && config.allowAutoSave && !config.readOnlyMode;
  };

  const canModify = () => {
    return !config.readOnlyMode;
  };

  const shouldConfirmRevert = () => {
    return config.safeMode || config.confirmBeforeRevert;
  };

  const value: SafetyContextType = {
    config,
    updateConfig,
    toggleSafeMode,
    toggleAutoSave,
    toggleReadOnlyMode,
    canAutoSave,
    canModify,
    shouldConfirmRevert,
  };

  return (
    <SafetyContext.Provider value={value}>
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety debe usarse dentro de un SafetyProvider');
  }
  return context;
}

// Hook específico para controlar auto-guardado con reglas de seguridad
export function useSafeAutoSave(options: {
  getContent: () => any;
  onSave: (content: any) => void | Promise<void>;
  debounceMs?: number;
  disabled?: boolean;
}) {
  const { canAutoSave, shouldConfirmRevert } = useSafety();

  // Si el modo seguro está activado, deshabilitar auto-guardado
  const effectiveDisabled = options.disabled || !canAutoSave();

  return {
    canAutoSave: canAutoSave(),
    shouldConfirmRevert: shouldConfirmRevert(),
    effectiveDisabled,
    // Aquí podrías retornar el hook useAutoSave con las configuraciones ajustadas
  };
}
