/**
 * BUG SHIELD - Sistema de protección contra bugs
 * Valida, sanitiza y protege la app de errores comunes
 */

import type { CanvasElement, ElementType, WithId } from './types';

// Tipos válidos de elementos
const VALID_ELEMENT_TYPES: ElementType[] = [
  'image', 'text', 'sticky', 'notepad',
  'comment', 'comment-small', 'comment-r',
  'todo', 'moodboard', 'gallery', 'yellow-notepad',
  'stopwatch', 'countdown', 'highlight-text',
  'weekly-planner', 'vertical-weekly-planner', 'weekly-menu',
  'container', 'two-columns',
  'locator', 'image-frame',
  'photo-grid', 'photo-grid-horizontal', 'photo-grid-adaptive', 'photo-grid-free', 'libreta'
];

// Dimensiones por defecto por tipo
const DEFAULT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'sticky': { width: 200, height: 200 },
  'text': { width: 300, height: 100 },
  'notepad': { width: 400, height: 500 },
  'todo': { width: 280, height: 350 },
  'image': { width: 300, height: 200 },
  'moodboard': { width: 600, height: 400 },
  'gallery': { width: 378, height: 800 },
  'comment': { width: 200, height: 100 },
  'comment-small': { width: 150, height: 60 },
  'comment-r': { width: 240, height: 120 },
  'container': { width: 378, height: 567 },
  'two-columns': { width: 378, height: 567 },
  'locator': { width: 120, height: 120 },
  'image-frame': { width: 300, height: 300 },
  'weekly-menu': { width: 756, height: 567 },
  'photo-grid': { width: 420, height: 420 },
  'photo-grid-horizontal': { width: 560, height: 360 },
  'photo-grid-adaptive': { width: 480, height: 420 },
  'photo-grid-free': { width: 600, height: 500 },
  'libreta': { width: 378, height: 567 },
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
    
    case 'locator':
      if (typeof content === 'object' && content !== null) {
        const loc = content as Record<string, unknown>;
        return {
          label: typeof loc.label === 'string' ? loc.label : 'Localizador',
        };
      }
      return { label: 'Localizador' };
    
    case 'container':
    case 'two-columns':
      if (typeof content === 'object' && content !== null) {
        const containerContent = content as Record<string, unknown>;
        const layout = containerContent.layout === 'two-columns' ? 'two-columns' : 'single';
        return {
          title: typeof containerContent.title === 'string' ? containerContent.title : 'Nuevo Contenedor',
          elementIds: Array.isArray(containerContent.elementIds)
            ? (containerContent.elementIds as unknown[]).filter((id): id is string => typeof id === 'string')
            : [],
          layout,
        };
      }
      return { title: 'Nuevo Contenedor', elementIds: [], layout: type === 'two-columns' ? 'two-columns' : 'single' };

    case 'image-frame':
      if (typeof content === 'object' && content !== null) {
        const frame = content as Record<string, unknown>;
        return {
          url: typeof frame.url === 'string' ? frame.url : '',
          zoom: typeof frame.zoom === 'number' ? frame.zoom : 1,
          panX: typeof frame.panX === 'number' ? frame.panX : 0,
          panY: typeof frame.panY === 'number' ? frame.panY : 0,
          rotation: typeof frame.rotation === 'number' ? frame.rotation : 0,
        };
      }
      return { url: '', zoom: 1, panX: 0, panY: 0, rotation: 0 };

    case 'weekly-menu':
      if (typeof content === 'object' && content !== null) {
        const menu = content as Record<string, unknown>;
        return {
          days: typeof menu.days === 'object' && menu.days !== null ? menu.days : {},
        };
      }
      return { days: {} };

    case 'photo-grid':
    case 'photo-grid-horizontal':
    case 'photo-grid-adaptive':
      if (typeof content === 'object' && content !== null) {
        const grid = content as Record<string, unknown>;
        return {
          title: typeof grid.title === 'string' ? grid.title : 'Guía de Fotos',
          rows: typeof grid.rows === 'number' ? grid.rows : 2,
          columns: typeof grid.columns === 'number' ? grid.columns : 2,
          cells: Array.isArray(grid.cells) ? grid.cells : [],
          layoutMode: (grid as any).layoutMode === 'horizontal'
            ? 'horizontal'
            : (grid as any).layoutMode === 'adaptive'
              ? 'adaptive'
              : 'default',
        };
      }
      return { title: 'Guía de Fotos', rows: 2, columns: 2, cells: [], layoutMode: 'default' };

    case 'comment-small':
      if (typeof content === 'object' && content !== null) {
        const cs = content as Record<string, unknown>;
        return { text: typeof cs.text === 'string' ? cs.text : '' };
      }
      return { text: '' };

    case 'comment-bubble':
      if (typeof content === 'object' && content !== null) {
        const cb = content as Record<string, unknown>;
        return { text: typeof cb.text === 'string' ? cb.text : '' };
      }
      return { text: '' };

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
    case 'container':
    case 'two-columns':
      return { title: 'Nuevo Contenedor', elementIds: [], layout: type === 'two-columns' ? 'two-columns' : 'single' };
    case 'locator':
      return { label: 'Localizador' };
    case 'todo':
      return { title: 'Lista', items: [] };
    case 'notepad':
    case 'yellow-notepad':
      return { title: '', text: '', content: '' };
    case 'image':
      return { url: '' };
    case 'moodboard':
      return { title: '', images: [], annotations: [] };
    case 'image-frame':
      return { url: '', zoom: 1, panX: 0, panY: 0, rotation: 0 };
    case 'weekly-menu':
      return { days: {} };
    case 'photo-grid':
    case 'photo-grid-horizontal':
    case 'photo-grid-adaptive':
      return { title: 'Guía de Fotos', rows: 2, columns: 2, cells: [] };
    case 'comment-small':
    case 'comment-r':
      return { text: '' };
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
  if (process.env.NODE_ENV === 'development') {
    console.table(extra);
  }
}
