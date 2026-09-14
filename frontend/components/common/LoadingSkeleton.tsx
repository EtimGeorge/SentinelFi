import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'table-row' | 'kpi' | 'chart' | 'avatar' | 'button' | 'table-header';
  lines?: number;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '', variant = 'text', lines = 1, width, height,
}) => {
  const baseStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%)', backgroundSize: '200% 100%', animation: 'skeleton-loading 1.5s ease-in-out infinite', borderRadius: '8px',
  };

  const variants: Record<string, React.CSSProperties> = {
    text: { height: '1rem', borderRadius: '4px' }, card: { borderRadius: '16px' },
    'table-row': { height: '48px', borderRadius: '0' }, kpi: { height: '120px', borderRadius: '16px' }, chart: { height: '250px', borderRadius: '16px' }, avatar: { borderRadius: '50%' }, button: { height: '40px', borderRadius: '8px', width: '120px' },
    'table-header': { height: '40px', borderRadius: '0' },
  };

  return (
    <>
      <style jsx>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={className}
          style={{
            ...baseStyle,
            ...variants[variant], width: width || (variant === 'button' ? '120px' : '100%'), height: height || undefined, marginBottom: lines > 1 && i < lines - 1 ? '0.5rem' : 0,
          }}
        />
      ))}
    </>
  );
};

export const KPISkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <Skeleton variant="text" width="60%" className="mb-2" />
        <Skeleton variant="text" width="40%" className="mb-4" />
        <Skeleton variant="text" width="80%" />
      </div>
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ title?: boolean; lines?: number }> = ({ title = true, lines = 3 }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
    {title && <Skeleton variant="text" width="40%" className="mb-4" />}
    <Skeleton lines={lines} variant="text" />
  </div>
);

export const TableSkeleton: React.FC<{ columns: number; rows?: number }> = ({ columns, rows = 5 }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
    <div className="bg-brand-dark/50 border-b border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton variant="table-header" width="80%" />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
    </div>
    <div className="divide-y divide-gray-800">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <tbody>
              <tr>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton variant="text" width={colIndex === 0 ? '60%' : '40%' } />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 250 }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
    <Skeleton variant="text" width="30%" className="mb-4" />
    <Skeleton variant="chart" height={`${height}px`} />
  </div>
);

export const ListSkeleton: React.FC<{ items?: number; avatar?: boolean }> = ({ items = 5, avatar = false }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-gray-800 border border-gray-700 rounded-xl">
        {avatar && <Skeleton variant="avatar" width="48px" height="48px" />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
        <Skeleton variant="button" />
      </div>
    ))}
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-1">
        <Skeleton variant="text" width="25%" className="mb-1" />
        <Skeleton variant="text" width="100%" height="44px" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <KPISkeleton />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ChartSkeleton height={300} />
      </div>
      <div>
        <ChartSkeleton height={180} />
        <ChartSkeleton height={180} />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CardSkeleton lines={4} />
      <CardSkeleton lines={4} />
    </div>
  </div>
);

export default Skeleton;