/**
 * Procesador de texto - Versión SIMPLE y ESTABLE
 * Sin complejidad innecesaria
 */

/**
 * Formatea texto final del dictado
 */
export function formatFinalText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let processed = text.trim();
  if (!processed) return '';
  
  // Capitalizar primera letra
  processed = processed.charAt(0).toUpperCase() + processed.slice(1);
  
  return processed;
}

/**
 * Formatea texto provisional del dictado
 */
export function formatInterimText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim();
}

/**
 * Procesa texto para agregar puntuación (simplificado)
 */
export function addIntelligentPunctuation(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text.trim();
}

/**
 * Sanitiza texto HTML
 */
export function sanitizeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
