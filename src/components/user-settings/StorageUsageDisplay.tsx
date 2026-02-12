import React from 'react';
import { useStorageUsage } from '@/hooks/use-storage-usage';

function bytesToReadableSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function StorageUsageDisplay({ userId }: { userId: string | undefined }) {
  const usage = useStorageUsage(userId);

  if (usage.isLoading) {
    return <div>Cargando uso de almacenamiento...</div>;
  }

  if (usage.error) {
    return <div className="text-red-500">Error: {usage.error}</div>;
  }

  return (
    <div className="p-4 border rounded-md shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Uso de Almacenamiento</h3>
      <p>Tableros totales: {usage.totalBoards}</p>
      <p>Elementos totales: {usage.totalElements}</p>
      <p>Tamaño total de imágenes: {bytesToReadableSize(usage.totalImageSize)}</p>
    </div>
  );
}
