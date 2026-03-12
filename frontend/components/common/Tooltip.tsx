import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  enabled?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, enabled = true, position = 'top', delay = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!enabled) return;
    
    timerRef.current = setTimeout(() => {
      // Calculate position relative to viewport
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;
        
        // Approximate centered positioning until real render
        switch(position) {
          case 'top':
            top = rect.top - 40; // Approx height + gap
            left = rect.left + (rect.width / 2);
            break;
          case 'bottom':
            top = rect.bottom + 8;
            left = rect.left + (rect.width / 2);
            break;
          case 'left':
            top = rect.top + (rect.height / 2);
            left = rect.left - 8;
            break;
          case 'right':
             top = rect.top + (rect.height / 2);
             left = rect.right + 8;
             break;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  // Recalculate precisely once rendered
  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;
      const margin = 8;
      
      switch(position) {
        case 'top':
          top = rect.top - tipRect.height - margin;
          left = rect.left + (rect.width / 2) - (tipRect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + margin;
          left = rect.left + (rect.width / 2) - (tipRect.width / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tipRect.height / 2);
          left = rect.left - tipRect.width - margin;
          break;
        case 'right':
           top = rect.top + (rect.height / 2) - (tipRect.height / 2);
           left = rect.right + margin;
           break;
      }
      
      // Keep in viewport boundaries
      const padding = 10;
      if (left < padding) left = padding;
      if (left + tipRect.width > window.innerWidth - padding) left = window.innerWidth - tipRect.width - padding;
      if (top < padding) top = padding;
      if (top + tipRect.height > window.innerHeight - padding) top = window.innerHeight - tipRect.height - padding;

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  const tooltipElement = isVisible && typeof window !== 'undefined' ? createPortal(
    <div
      ref={tooltipRef}
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-[99999] px-3 py-2 text-xs font-bold text-white bg-slate-800 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
      role="tooltip"
    >
      {content}
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={containerRef}
      className="inline-flex relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipElement}
    </div>
  );
};

export default Tooltip;
