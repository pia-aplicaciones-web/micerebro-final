'use client';

import React from 'react';

interface BoardTitleDisplayProps {
  name: string;
}

export default function BoardTitleDisplay({ name }: BoardTitleDisplayProps) {
  return (
    <div className="fixed top-4 left-4 z-[9999] pointer-events-none">
      <h1 
        className="text-sm font-medium tracking-tight opacity-70"
        style={{
          fontFamily: "'Space Grotesk', 'Poppins', sans-serif",
          color: '#1a1a1a',
          textShadow: '0 1px 2px rgba(255,255,255,0.8)',
          letterSpacing: '-0.01em',
        }}
      >
        {name || 'Sin título'}
      </h1>
    </div>
  );
}
