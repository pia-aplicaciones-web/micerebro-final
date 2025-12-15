// src/components/ui/context-menu.tsx
import React from 'react';

// Estos son los componentes exportados, como placeholders
// En una implementación real, importarías de una librería UI o tendrías tu propia lógica

// Componente ContextMenu
export const ContextMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative">
      {children}
    </div>
  );
};

// Componente ContextMenuTrigger
export const ContextMenuTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children }) => {
  // asChild es una prop común en Radix/shadcn para renderizar el hijo sin un div extra
  return children; // Por ahora, simplemente renderiza el hijo
};

// Componente ContextMenuContent
export const ContextMenuContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div
      className={`absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 ${className || ''}`}
      // Estilo muy básico, en un proyecto real tendrías más lógica de posicionamiento y apertura/cierre
      style={{ minWidth: '100px' }}
    >
      {children}
    </div>
  );
};

// Componente ContextMenuItem
export const ContextMenuItem: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => {
  return (
    <div
      className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Puedes añadir ContextMenuSeparator, ContextMenuLabel si también se importan
export const ContextMenuSeparator: React.FC = () => {
  return <div className="border-t border-gray-200 my-1" />;
};

export const ContextMenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="px-3 py-1 text-xs text-gray-500">{children}</div>;
};
