import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'flat';
export type CardAccent = 'none' | 'primary' | 'secondary' | 'alert' | 'positive';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerContent?: React.ReactNode;
  variant?: CardVariant;
  accent?: CardAccent;
  noPadding?: boolean;
}

const variantMap: Record<CardVariant, string> = {
  // Standard content surface, hairline border, subtle drop shadow
  default: 'border border-gray-700/60 bg-gray-800/80 shadow-elev-sm',
  // Floating surfaces, modals, dropdowns, popovers
  elevated: 'border border-gray-600/40 bg-gray-800 shadow-elev-lg',
  // Inline sections inside larger cards, border only, no shadow
  flat: 'border border-gray-700 bg-gray-800/40 shadow-none',
};

const accentMap: Record<CardAccent, string> = {
  none: 'border-l-2 border-transparent', primary: 'border-l-2 border-brand-primary', secondary: 'border-l-2 border-brand-secondary', alert: 'border-l-2 border-alert-critical', positive: 'border-l-2 border-alert-positive',
};

/**
 * Content surface with an explicit elevation hierarchy.
 * - `default`: standard cards at rest (hairline border, subtle shadow)
 * - `elevated`: floating surfaces that must separate from content (modals/popovers)
 * - `flat`: inline sections inside another container (border only)
 *
 * Distinction between cards comes from border + background + accent, never
 * from decorative gradients or heavy shadows.
 */
const Card: React.FC<CardProps> = ({
  children, title, subtitle, className = '', headerContent, variant = 'default', accent = 'none', noPadding,
}) => {
  const paddingClass = noPadding ? '' : 'p-4 sm:p-5';

  return (
    <section className={`${variantMap[variant]} ${accentMap[accent]} ${paddingClass} flex min-w-0 flex-col overflow-hidden rounded-lg ${className}`}>
      {(title || headerContent) && (
        <div className={`mb-3 flex min-w-0 ${headerContent ? 'items-center justify-between gap-3' : 'flex-col'} border-b border-gray-700/70 pb-3`}>
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-white break-words">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-400 break-words">{subtitle}</p>}
          </div>
          {headerContent && <div className="min-w-0 max-w-full">{headerContent}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

export { Card, variantMap, accentMap };
export default Card;