// src/components/canvas/element-card-content.tsx
import React from 'react';
import type { WithId, CanvasElement, CommentContent, NotepadContent, NotepadSimpleContent, TodoContent, ImageContent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ElementCardContentProps {
  element: WithId<CanvasElement>;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onEditComment: (element: WithId<CanvasElement>) => void;
  onOpenNotepad: (id: string) => void;
  onLocateElement: (id: string) => void;
}

const ElementCardContent: React.FC<ElementCardContentProps> = ({
  element,
  onUpdate,
  onEditComment,
  onOpenNotepad,
  onLocateElement,
}) => {
  // Extraer título según el tipo de elemento
  const getContentTitle = (): string => {
    switch (element.type) {
      case 'comment':
        const commentContent = element.content as CommentContent;
        return commentContent?.title || commentContent?.label || commentContent?.text || 'Comentario';
      case 'notepad':
        const notepadContent = element.content as NotepadContent;
        return notepadContent?.title || 'Cuaderno sin título';
      case 'notepad-simple':
        const simpleContent = element.content as NotepadSimpleContent;
        return simpleContent?.title || simpleContent?.text || 'Nota simple';
      case 'todo':
        const todoContent = element.content as TodoContent;
        return todoContent?.title || 'Lista de tareas';
      case 'text':
        // Para texto, mostrar una preview del contenido HTML
        const textContent = typeof element.content === 'string' ? element.content : '';
        const textPreview = textContent.replace(/<[^>]*>/g, '').substring(0, 50);
        return textPreview || 'Texto vacío';
      case 'sticky':
        const stickyContent = typeof element.content === 'string' ? element.content : '';
        const stickyPreview = stickyContent.replace(/<[^>]*>/g, '').substring(0, 50);
        return stickyPreview || 'Nota adhesiva';
      default:
        return 'Elemento sin título';
    }
  };

  const contentTitle = getContentTitle();
  const safeProperties = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};

  // Preview visual mejorado según tipo de elemento
  const renderPreview = () => {
    switch (element.type) {
      case 'image':
        const imageContent = element.content as ImageContent;
        if (imageContent?.url) {
          return (
            <div className="relative w-full h-24 bg-muted rounded-md overflow-hidden mt-2">
              <img 
                src={`${imageContent.url}`} 
                alt="Preview" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          );
        }
        return null;

      case 'sticky':
        const stickyColor = (safeProperties as any)?.color || element.color || 'yellow';
        const colorMap: { [key: string]: string } = {
          yellow: '#fffb8b',
          pink: '#ffc2d4',
          blue: '#bce8f1',
          green: '#d4edda',
          orange: '#ffeeba',
          purple: '#e9d5ff',
        };
        const colorHex = colorMap[stickyColor] || (stickyColor.startsWith('#') ? stickyColor : '#fffb8b');
        return (
          <div 
            className="w-full h-16 rounded-md mt-2 p-2 text-xs overflow-hidden"
            style={{ backgroundColor: colorHex }}
          >
            <p className="line-clamp-3">{contentTitle}</p>
          </div>
        );

      case 'todo':
        const todoContent = element.content as TodoContent;
        const items = todoContent?.items || [];
        const completedCount = items.filter(item => item.completed).length;
        return (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-muted-foreground">
              {items.length > 0 ? (
                <span>{completedCount}/{items.length} completadas</span>
              ) : (
                <span>Sin tareas</span>
              )}
            </div>
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} className={cn(
                "text-xs flex items-center gap-1",
                item.completed && "line-through text-muted-foreground"
              )}>
                <span>{item.completed ? '✓' : '○'}</span>
                <span className="truncate">{item.text || 'Tarea sin texto'}</span>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-muted-foreground">+{items.length - 3} más...</div>
            )}
          </div>
        );

      case 'text':
        const textContent = typeof element.content === 'string' ? element.content : '';
        const textPreview = textContent.replace(/<[^>]*>/g, '').substring(0, 100);
        return (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <p className="text-xs line-clamp-3">{textPreview || 'Texto vacío'}</p>
          </div>
        );

      case 'notepad':
      case 'notepad-simple':
        const notepadContent = element.content as NotepadContent | NotepadSimpleContent;
        const pages = 'pages' in notepadContent && notepadContent.pages ? notepadContent.pages : [];
        const currentPage = ('currentPage' in notepadContent && typeof notepadContent.currentPage === 'number') ? notepadContent.currentPage : 0;
        const pageContent = pages && pages.length > 0 && currentPage !== undefined && currentPage < pages.length ? pages[currentPage] : '';
        const pagePreview = pageContent.replace(/<[^>]*>/g, '').substring(0, 80);
        return (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground mb-1">
              {pages.length > 0 ? `Página ${currentPage + 1}/${pages.length}` : 'Sin páginas'}
            </div>
            <p className="text-xs line-clamp-2">{pagePreview || 'Cuaderno vacío'}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium capitalize text-xs">{element.type}</p>
        {element.color && (
          <div
            className="w-3 h-3 rounded-full border border-border"
            style={{ backgroundColor: element.color }}
            title={`Color: ${element.color}`}
          />
        )}
      </div>
      {contentTitle && (
        <p className="text-muted-foreground text-xs truncate mb-2" title={contentTitle}>
          {contentTitle}
        </p>
      )}
      {renderPreview()}
    </div>
  );
};

export default ElementCardContent;
