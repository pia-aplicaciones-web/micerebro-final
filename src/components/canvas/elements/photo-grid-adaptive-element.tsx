'use client';
import React from 'react';
import PhotoGridElement from './photo-grid-element';
import type { CommonElementProps } from '@/lib/types';

export default function PhotoGridAdaptiveElement(props: CommonElementProps) {
  return <PhotoGridElement {...props} type="photo-grid-adaptive" />;
}
