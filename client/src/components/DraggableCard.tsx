'use client'

import React, { useState, useEffect, useRef } from 'react';

interface DraggableCardProps {
  children: React.ReactNode;
  widthClass?: string;
  onClose: () => void;
  isOpen: boolean;
}

export default function DraggableCard({
  children,
  widthClass = "w-[680px]",
  onClose,
  isOpen
}: DraggableCardProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOffset({ x: 0, y: 0 });
      currentOffset.current = { x: 0, y: 0 };
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't start dragging if clicking inside interactive elements
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offset };
    currentOffset.current = { ...offset };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = moveEvent.clientX - dragStart.current.x;
      const deltaY = moveEvent.clientY - dragStart.current.y;
      const newX = initialOffset.current.x + deltaX;
      const newY = initialOffset.current.y + deltaY;
      currentOffset.current = { x: newX, y: newY };

      if (cardRef.current) {
        cardRef.current.style.transform = `translate(calc(-50% + ${newX}px), ${newY}px)`;
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setOffset({ ...currentOffset.current });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        ref={cardRef}
        style={{
          transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-5 left-1/2 ${widthClass} max-w-[calc(100%-2rem)] max-h-[82vh] z-40 bg-[#0d0d10]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col text-white font-sans animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-250 ease-out cursor-grab active:cursor-grabbing select-none`}
      >
        {/* Subtle top drag indicator */}
        <div className="w-full flex items-center justify-center pb-2 cursor-grab active:cursor-grabbing select-none shrink-0">
          <div className="w-10 h-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors" />
        </div>
        <div className="flex-1 overflow-y-auto cursor-default select-text space-y-4 pt-1 no-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}
