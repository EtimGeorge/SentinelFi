import React, { useEffect, useRef, useState } from 'react';
import { loadAdsenseBanner } from '../../lib/ads';

interface DisplayAdProps {
  /** AdSense ad-slot ID (from ADSENSE_BANNER_SLOT / AdSense dashboard). */
  slot?: string | null;
  /** Visual shape of the reserved space. */
  format?: 'banner' | 'rectangle';
  className?: string;
}

/**
 * DisplayAd, passive banner placement.
 * - Production (NEXT_PUBLIC_ADSENSE_CLIENT_ID set): renders the real
 *   AdSense `<ins>` unit; impressions/clicks earn CPM/CPC revenue.
 * - Dev/test (no ID): renders a labeled placeholder so layouts stay intact.
 * Parent components decide *whether* to mount it (free tier only).
 */
const DisplayAd: React.FC<DisplayAdProps> = ({ slot, format = 'banner', className = '' }) => {
  const [live, setLive] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    setLive(loadAdsenseBanner());
  }, []);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = slot || process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT;

  if (!live || !clientId || !slotId) {
    return (
      <div
        aria-label="Advertisement placeholder"
        className={`flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-xs font-bold uppercase tracking-[0.3em] text-gray-600 print:hidden ${
          format === 'banner' ? 'h-20' : 'h-64'
        } ${className}`}
      >
        Ad space, free plan
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl print:hidden ${className}`} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format === 'banner' ? 'horizontal' : 'rectangle'}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default DisplayAd;
