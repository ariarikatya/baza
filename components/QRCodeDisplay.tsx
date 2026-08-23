'use client';

import React from 'react';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  className = '',
  label,
}) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border ${className}`}>
      <img
        src={qrUrl}
        alt={`QR Code for ${value}`}
        width={size}
        height={size}
        className="rounded-lg bg-white p-2 shadow-md"
        loading="lazy"
      />
      {label && <p className="mt-3 text-xs text-muted-foreground font-medium text-center">{label}</p>}
    </div>
  );
};
