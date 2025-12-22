### STEP 107 - Create Tooltip Component

**GUIDANCE:** The sidebar relies on a `Tooltip` component for professional UX, especially when collapsed. We are creating a reusable, robust tooltip component using standard React/Tailwind patterns. This component will be used throughout the application for clear information on hover, fulfilling a primary UX requirement.

**FILE PATH:** `./frontend/components/common/Tooltip.tsx` (Create this file)

```tsx
import React, { useState, useRef } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  enabled?: boolean; // For conditional display (e.g., only show when sidebar is collapsed)
  position?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  enabled = true,
  position = 'right' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!enabled) {
    return <>{children}</>;
  }

  const showTooltip = () => {
    // Debounce the show action slightly
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300); 
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };
  
  // Maps position prop to Tailwind CSS classes
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  }[position];

  return (
    <div className="relative inline-block" 
         onMouseEnter={showTooltip} 
         onMouseLeave={hideTooltip}
         onFocus={showTooltip}
         onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute ${positionClasses} 
                     bg-brand-dark text-white text-xs rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap 
                     transition-opacity duration-200 opacity-100 animate-fadeIn`}
          style={{ zIndex: 50 }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
```

NEXT ACTION: Save the file as `./frontend/components/common/Tooltip.tsx`. We now create the full CEO Dashboard page, replacing its placeholder content.

---