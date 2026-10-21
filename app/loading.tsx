import React from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Loading() {
  return <LoadingSpinner text="Данные загружаются…" fullScreen={true} size="lg" />;
}
