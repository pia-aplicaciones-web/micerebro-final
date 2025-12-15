/**
 * BUG SHIELD - Sistema de protección contra bugs
 * Valida, sanitiza y protege la app de errores comunes
 */

import type { CanvasElement, ElementType, WithId } from './types';

// Tipos válidos de elementos (solo los activos)
const VALID_ELEMENT_TYPES: ElementType[] = [
  'image', 'text', 'sticky', 'notepad', 'notepad-simple',
  'container', 'comment-bubble', 'todo', 'moodboard', 'yellow-notepad',
  'datetime-widget', 'habit-tracker', 'eisenhower-matrix', 'brain-dump',
  'gratitude-journal', 'sticker', 'locator',
  // Sistema
  'frame', 'connector', 'drawing',
];

// Dimensiones por defecto por tipo
const DEFAULT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'sticky': { width: 200, height: 200 },
  'text': { width: 300, height: 100 },
  'notepad': { width: 400, height: 500 },
  'notepad-simple': { width: 300, height: 400 },
  'yellow-notepad': { width: 280, height: 360 },
  'todo': { width: 280, height: 350 },
  'image': { width: 300, height: 200 },
  'moodboard': { width: 600, height: 400 },
  'container': { width: 380, height: 520 },
  'comment-bubble': { width: 240, height: 160 },
  'datetime-widget': { width: 320, height: 140 },
  'habit-tracker': { width: 360, height: 460 },
  'eisenhower-matrix': { width: 420, height: 320 },
  'brain-dump': { width: 360, height: 420 },
  'gratitude-journal': { width: 320, height: 420 },
  'sticker': { width: 160, height: 160 },
  'locator': { width: 48, height: 48 },
  'frame': { width: 400, height: 300 },
  'connector': { width: 200, height: 80 },
  'drawing': { width: 400, height: 300 },
  'default': { width: 200, height: 200 }
};

/**
 * Valida si un tipo de elemento es válido
 */
export function isValidElementType(type: unknown): type is ElementType {
  return typeof type === 'string' && VALID_ELEMENT_TYPES.includes(type as ElementType);
}

/**
 * Valida y repara un elemento del canvas
 * Retorna el elemento reparado o null si es irrecuperable
 */
export function validateAndRepairElement(element: unknown): WithId<CanvasElement> | null {
  if (!element || typeof element !== 'object') {
    console.warn('🛡️ BugShield: Elemento inválido (no es objeto)');
    return null;
  }

  const el = element as Record<string, unknown>;

  // Validar ID
  if (!el.id || typeof el.id !== 'string') {
    console.warn('🛡️ BugShield: Elemento sin ID válido');
    return null;
  }

  // Validar tipo
  if (!isValidElementType(el.type)) {
    console.warn(`🛡️ BugShield: Tipo inválido "${el.type}" en elemento ${el.id}`);
    return null;
  }

  const defaults = DEFAULT_DIMENSIONS[el.type] || DEFAULT_DIMENSIONS['default'];

  // Reparar coordenadas
  const x = typeof el.x === 'number' && !isNaN(el.x) ? el.x : 100;
  const y = typeof el.y === 'number' && !isNaN(el.y) ? el.y : 100;
  
  // Reparar dimensiones
  let width = typeof el.width === 'number' && el.width > 0 ? el.width : defaults.width;
  let height = typeof el.height === 'number' && el.height > 0 ? el.height : defaults.height;

  // Limitar dimensiones máximas (previene elementos gigantes)
  width = Math.min(width, 2000);
  height = Math.min(height, 2000);

  // Reparar zIndex
  const zIndex = typeof el.zIndex === 'number' ? Math.max(0, Math.min(el.zIndex, 9999)) : 1;

  // Sanitizar contenido según tipo
  const content = sanitizeContent(el.type as ElementType, el.content);

  return {
    ...el,
    id: el.id as string,
    type: el.type as ElementType,
    x,
    y,
    width,
    height,
    zIndex,
    content,
    hidden: el.hidden === true,
  } as WithId<CanvasElement>;
}

/**
 * Sanitiza el contenido según el tipo de elemento
 */
function sanitizeContent(type: ElementType, content: unknown): unknown {
  if (content === undefined || content === null) {
    return getDefaultContent(type);
  }

  switch (type) {
    case 'text':
    case 'sticky':
      return typeof content === 'string' ? sanitizeHtml(content) : '';
    
    case 'todo':
      if (typeof content === 'object' && content !== null) {
        const todoContent = content as Record<string, unknown>;
        return {
          title: typeof todoContent.title === 'string' ? todoContent.title : 'Lista',
          items: Array.isArray(todoContent.items) 
            ? todoContent.items.filter(item => item && typeof item === 'object')
            : []
        };
      }
      return { title: 'Lista', items: [] };

    case 'notepad':
    case 'notepad-simple':
    case 'yellow-notepad':
      if (typeof content === 'object' && content !== null) {
        const noteContent = content as Record<string, unknown>;
        return {
          title: typeof noteContent.title === 'string' ? noteContent.title : '',
          text: typeof noteContent.text === 'string' ? sanitizeHtml(noteContent.text) : '',
          content: typeof noteContent.content === 'string' ? sanitizeHtml(noteContent.content) : '',
        };
      }
      return { title: '', text: '', content: '' };

    case 'image':
      if (typeof content === 'object' && content !== null) {
        const imgContent = content as Record<string, unknown>;
        return {
          url: typeof imgContent.url === 'string' && isValidUrl(imgContent.url) 
            ? imgContent.url 
            : ''
        };
      }
      return { url: '' };

    default:
      return content;
  }
}

/**
 * Retorna contenido por defecto según tipo
 */
function getDefaultContent(type: ElementType): unknown {
  switch (type) {
    case 'text':
    case 'sticky':
      return '';
    case 'todo':
      return { title: 'Lista', items: [] };
    case 'notepad':
    case 'notepad-simple':
    case 'yellow-notepad':
      return { title: '', text: '', content: '' };
    case 'image':
      return { url: '' };
    case 'moodboard':
      return { title: '', images: [], annotations: [] };
    case 'comment-bubble':
      return { text: '', authorId: '', label: '' };
    case 'locator':
      return { label: 'Localizador' };
    default:
      return {};
  }
}

/**
 * Sanitiza HTML para prevenir XSS y contenido corrupto
 */
function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  
  // Limitar longitud (previene contenido gigante)
  const maxLength = 50000;
  let safe = html.slice(0, maxLength);
  
  // Remover scripts y eventos maliciosos
  safe = safe.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  safe = safe.replace(/on\w+="[^"]*"/gi, '');
  safe = safe.replace(/on\w+='[^']*'/gi, '');
  safe = safe.replace(/javascript:/gi, '');
  
  return safe;
}

/**
 * Valida si una URL es válida
 */
function isValidUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'data:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Filtra y repara una lista de elementos
 */
export function validateElementsList(elements: unknown[]): WithId<CanvasElement>[] {
  if (!Array.isArray(elements)) {
    console.warn('🛡️ BugShield: Lista de elementos no es un array');
    return [];
  }

  const validElements: WithId<CanvasElement>[] = [];
  let repairedCount = 0;
  let removedCount = 0;

  for (const element of elements) {
    const repaired = validateAndRepairElement(element);
    if (repaired) {
      validElements.push(repaired);
      if (JSON.stringify(element) !== JSON.stringify(repaired)) {
        repairedCount++;
      }
    } else {
      removedCount++;
    }
  }

  if (repairedCount > 0 || removedCount > 0) {
    console.log(`🛡️ BugShield: ${repairedCount} elementos reparados, ${removedCount} eliminados`);
  }

  return validElements;
}

/**
 * Valida props antes de actualizar un elemento
 */
export function validateUpdateProps(updates: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    // Prevenir valores undefined o NaN
    if (value === undefined) continue;
    if (typeof value === 'number' && isNaN(value)) continue;

    // Validar coordenadas
    if (key === 'x' || key === 'y') {
      if (typeof value === 'number' && !isNaN(value)) {
        safe[key] = Math.max(-5000, Math.min(value, 50000)); // Limitar rango
      }
      continue;
    }

    // Validar dimensiones
    if (key === 'width' || key === 'height') {
      if (typeof value === 'number' && value > 0) {
        safe[key] = Math.min(value, 2000); // Máximo 2000px
      }
      continue;
    }

    // Validar zIndex
    if (key === 'zIndex') {
      if (typeof value === 'number') {
        safe[key] = Math.max(0, Math.min(Math.floor(value), 9999));
      }
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

/**
 * Logger de errores para debugging
 */
export function logBugShieldError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const errorInfo = {
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...extra
  };

  console.error('🛡️ BugShield Error:', errorInfo);

  // En desarrollo, mostrar más detalles
  if (process.env.NODE_ENV === 'development' && extra) {
    console.table(extra);
  }
}
