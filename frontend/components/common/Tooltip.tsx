import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  enabled?: boolean; // New prop to enable/disable tooltip
  position?: 'top' | 'bottom' | 'left' | 'right'; // NEW: Position of the tooltip
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, enabled = true, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'bottom-[-5px] left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-gray-700',
    bottom: 'top-[-5px] left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-gray-700',
    left: 'right-[-5px] top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-l-8 border-l-gray-700',
    right: 'left-[-5px] top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-gray-700',
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          className={`absolute z-30 px-3 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg shadow-sm whitespace-nowrap transition-opacity duration-300 opacity-100 ${positionClasses[position]}`}
          role="tooltip"
        >
          {content}
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
