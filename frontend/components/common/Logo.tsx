import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 32, // w-8 h-8
  md: 48, // w-12 h-12
  lg: 80, // w-20 h-20 (for Login Page)
  xl: 120, // w-30 h-30 (extra large marketing banner)
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const pixelSize = sizeMap[size];

  return (
    <div className={`relative ${className}`} style={{ width: pixelSize, height: pixelSize }}>
      <Image
        // Asset name based on the final brand report
        src="/SentinelFi Logo Concept-bg-remv-logo-only.png" 
        alt="SentinelFi Logo: Vigilant Eye and Target Shield"
        fill // Fills the parent div based on the pixelSize
        sizes="(max-width: 768px) 100vw, 33vw"
        priority={size === 'lg'} // Prioritize loading for the large login logo
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
};

export default Logo;
