import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerContent?: React.ReactNode; // For buttons/actions in the header
  borderTopColor?: 'primary' | 'secondary' | 'alert' | 'positive';
}

const colorMap = {
  primary: 'border-brand-primary',
  secondary: 'border-brand-secondary',
  alert: 'border-alert-critical',
  positive: 'border-alert-positive',
};

/**
 * Professional, high-contrast card component for the Dark Theme UI.
 */
const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '', headerContent, borderTopColor }) => {
  const borderClass = borderTopColor ? `border-t-4 ${colorMap[borderTopColor]}` : '';

  return (
    <div className={`bg-gray-800 p-6 rounded-xl shadow-2xl ${borderClass} ${className}`}>
      
      {(title || headerContent) && (
        <div className={`mb-4 flex ${headerContent ? 'justify-between items-center' : 'flex-col'} border-b border-gray-700 pb-3`}>
          <div>
            {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {headerContent && <div>{headerContent}</div>}
        </div>
      )}

      {children}
    </div>
  );
};

export default Card;
