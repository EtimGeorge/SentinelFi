import React from 'react';

interface AppLoadingFallbackProps {
  message?: string;
  isAuthenticating?: boolean;
}

const AppLoadingFallback: React.FC<AppLoadingFallbackProps> = ({ message, isAuthenticating }) => {
  const defaultMessage = isAuthenticating ? 'Authenticating Session...' : 'Verifying Access...';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark text-gray-300">
      <div className="w-16 h-16 mb-4">
        <svg
          className="animate-spin text-brand-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2 tracking-wider">
        {message || defaultMessage}
      </h2>
      <p className="text-sm text-gray-500">
        Please wait while we secure your connection.
      </p>
    </div>
  );
};

export default AppLoadingFallback;