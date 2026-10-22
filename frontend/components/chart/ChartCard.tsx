import React from 'react';
import { Skeleton } from '../common/LoadingSkeleton';
import { AlertCircle } from 'lucide-react';

export interface ChartCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
  hasData?: boolean;
  loading?: boolean;
}

/**
 * Standard card wrapper for all charts.
 * Follows DESIGN.md: surface-1 background, hairline border, rounded-lg,
 * text-xs labels, no decorative shadows.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  className,
  emptyState,
  hasData = true,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={`chart-card chart-card-hover ${className ?? ''}`}>
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="chart-title">{title}</h3>
            {subtitle && <p className="chart-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="chart-skeleton-container">
          <Skeleton lines={3} />
          <Skeleton className="mt-6 h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={`chart-card chart-card-hover ${className ?? ''}`}>
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="chart-title">{title}</h3>
            {subtitle && <p className="chart-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="chart-empty-state">
          {emptyState ?? (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-300 mb-1">No data available</p>
              <p className="text-xs text-gray-500">Adjust filters or date range to view data.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-card chart-card-hover ${className ?? ''}`}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="chart-animate-in">{children}</div>
    </div>
  );
};

export default ChartCard;
