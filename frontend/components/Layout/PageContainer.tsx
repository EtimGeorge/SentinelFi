import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  className?: string;
}

/**
 * A consistent wrapper for page content to enforce standard layout,
 * spacing, and a "well-bordered" look, as per the design system.
 */
const PageContainer: React.FC<PageContainerProps> = ({ children, title, subtitle, headerContent, className = '' }) => {
  return (
    <div className={`bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700/50 ${className}`}>
      {(title || headerContent) && (
        <div className={`mb-4 flex ${headerContent ? 'justify-between items-center' : 'flex-col'} border-b border-gray-700 pb-4`}>
          <div>
            {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
            {subtitle && <p className="text-md text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {headerContent && <div>{headerContent}</div>}
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
