import React from 'react';
import MobileBoardClient from '@/components/canvas/mobile/mobile-board-client';

const MobilePage = ({ params }) => {
  // Extraer boardId de los parámetros si la ruta fuera /movil/[boardId]
  // Por ahora, asumimos un boardId fijo o se obtendrá de otra forma
  // Para propósitos de prueba, puedes pasar un ID de tablero quemado o hacer que el componente MobileBoardClient lo maneje internamente
  const boardId = params?.boardId || 'auto-load-board'; // Reemplazar 'default-board-id' con lógica real

  return (
    <MobileBoardClient boardId={boardId} />
  );
};

export default MobilePage;