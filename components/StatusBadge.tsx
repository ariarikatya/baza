'use client';

import React from 'react';

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let badgeStyles = 'bg-gray-800 text-gray-200 border-gray-700';

  switch (status?.toUpperCase()) {
    case 'ЧЕМПИОН':
    case '🏆 ЧЕМПИОН':
      badgeStyles = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-900/20';
      break;
    case 'ВИЦЕ-ЧЕМПИОН':
    case '🥈 ВИЦЕ-ЧЕМПИОН':
      badgeStyles = 'bg-slate-300/20 text-slate-200 border-slate-400/50 shadow-slate-900/20';
      break;
    case 'ЗОЛОТОЙ ИГРОК':
    case '⭐ ЗОЛОТОЙ ИГРОК':
      badgeStyles = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      break;
    case 'МОНСТР':
      badgeStyles = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      break;
    case 'ИГРОК':
      badgeStyles = 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      break;
    case 'АДМИН':
    case 'СУПЕРАДМИН':
      badgeStyles = 'bg-red-500/20 text-red-300 border-red-500/50';
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles} ${className}`}
    >
      {status}
    </span>
  );
};
