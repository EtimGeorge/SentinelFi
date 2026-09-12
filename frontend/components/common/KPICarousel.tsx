import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subLabel,
  trend,
  trendLabel,
  icon,
  accentColor = '#0D9488',
  className = '',
}) => {
  return (
    <div
      className={'bg-gray-800 border border-gray-700 rounded-2xl p-5 elev-lg ' + className}
      style={{ borderLeft: '4px solid ' + accentColor }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="p-2 rounded-lg"
              style={{ background: accentColor + '20' }}
            >
              {icon}
            </div>
          )}
          <div>
            <p className="text-xs font-black text-gray-500 r">
              {label}
            </p>
            {subLabel && (
              <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="text-2xl font-black text-white tabular-nums">
          {value}
        </p>
        {trend !== undefined && (
          <div
            className={'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ' +
              (trend >= 0
                ? 'bg-green-900/30 text-green-400'
                : 'bg-red-900/30 text-red-400')}
          >
            {trend >= 0 ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(trend)}%
            {trendLabel && <span className="text-xs opacity-75">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

interface KPICarouselProps {
  items: KPICardProps[];
  showNavArrows?: boolean;
  autoScroll?: boolean;
  autoScrollInterval?: number;
  className?: string;
}

export const KPICarousel: React.FC<KPICarouselProps> = ({
  items,
  showNavArrows = false,
  autoScroll = false,
  autoScrollInterval = 5000,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const itemWidth = 300;
    carouselRef.current.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth',
    });
    setCurrentIndex(index);
  }, []);

  const next = useCallback(() => {
    if (items.length === 0) return;
    const nextIndex = (currentIndex + 1) % items.length;
    scrollToIndex(nextIndex);
  }, [currentIndex, items.length, scrollToIndex]);

  const prev = useCallback(() => {
    if (items.length === 0) return;
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    scrollToIndex(prevIndex);
  }, [currentIndex, items.length, scrollToIndex]);

  useEffect(() => {
    if (!autoScroll || items.length === 0) return;
    autoScrollRef.current = setInterval(() => {
      if (!isDragging) next();
    }, autoScrollInterval);
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [autoScroll, autoScrollInterval, currentIndex, isDragging, next, items.length]);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const itemWidth = 300;
    const scrollLeft = carouselRef.current.scrollLeft;
    const index = Math.round(scrollLeft / itemWidth);
    if (index !== currentIndex && index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, items.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const deltaX = startX - e.touches[0].clientX;
    carouselRef.current.scrollLeft += deltaX;
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    handleScroll();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const deltaX = startX - e.clientX;
    carouselRef.current.scrollLeft += deltaX;
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    handleScroll();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      handleScroll();
    }
  };

  return (
    <div className={'kpi-carousel ' + className}>
      <div
        ref={carouselRef}
        className="flex gap-4 pb-4"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, index) => (
          <KPICard
            key={index}
            label={item.label}
            value={item.value}
            subLabel={item.subLabel}
            trend={item.trend}
            trendLabel={item.trendLabel}
            icon={item.icon}
            accentColor={item.accentColor}
            className={item.className}
          />
        ))}
      </div>

      {showNavArrows && items.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={prev}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Previous KPI"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={'w-2 h-2 rounded-full transition-all ' +
                  (index === currentIndex
                    ? 'bg-brand-primary w-6'
                    : 'bg-gray-600 hover:bg-gray-500')}
                aria-label={'Go to KPI ' + (index + 1)}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Next KPI"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default KPICarousel;