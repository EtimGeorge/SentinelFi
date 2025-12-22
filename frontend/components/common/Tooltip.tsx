import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  enabled?: boolean; // New prop to enable/disable tooltip
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, enabled = true }) => {
  const [showTooltip, setShowTooltip] = useState(false);

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
          className="absolute z-30 px-3 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg shadow-sm whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-2 transition-opacity duration-300 opacity-100"
          role="tooltip"
        >
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
