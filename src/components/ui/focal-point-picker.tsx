'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FocalPointPickerProps {
  src: string;
  alt?: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
  className?: string;
}

export function FocalPointPicker({
  src,
  alt = '',
  focalX,
  focalY,
  onChange,
  className,
}: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFocal = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    onChange(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    updateFocal(e.clientX, e.clientY);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    updateFocal(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        'relative select-none cursor-crosshair rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50',
        dragging && 'ring-2 ring-accent',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Crosshair guides */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/70 pointer-events-none"
        style={{ left: `${focalX}%`, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)' }}
      />
      <div
        className="absolute left-0 right-0 h-px bg-white/70 pointer-events-none"
        style={{ top: `${focalY}%`, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)' }}
      />

      {/* Focal point marker */}
      <div
        className={cn(
          'absolute pointer-events-none transition-transform',
          dragging && 'scale-125'
        )}
        style={{
          left: `${focalX}%`,
          top: `${focalY}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-5 h-5 rounded-full bg-accent border-2 border-white shadow-lg" />
        <div className="absolute inset-0 w-5 h-5 rounded-full bg-accent animate-ping opacity-30" />
      </div>
    </div>
  );
}
