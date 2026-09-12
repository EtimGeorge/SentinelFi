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
    <div className={`bg-gray-800/80 p-4 sm:p-6 rounded-lg border border-gray-700/60 shadow-elev-sm print:bg-transparent print:p-0 print:border-none print:shadow-none print:text-black min-w-0 ${className}`}>
      {(title || headerContent) && (
        <div className={`mb-4 flex ${headerContent ? 'items-center justify-between gap-3' : 'flex-col'} border-b border-gray-700/70 pb-4 print:hidden`}>
          <div>
            {title && <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
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
