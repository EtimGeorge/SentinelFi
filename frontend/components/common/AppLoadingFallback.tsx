// frontend/components/common/AppLoadingFallback.tsx
import React from 'react';

const AppLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-brand-dark text-gray-300">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-white">Initializing application...</p>
    </div>
  </div>
);

export default AppLoadingFallback;
