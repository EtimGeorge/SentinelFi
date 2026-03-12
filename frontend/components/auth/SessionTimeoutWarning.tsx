// frontend/components/auth/SessionTimeoutWarning.tsx
import React, { useEffect, useState } from 'react';
import { useSessionTimeout } from '../../hooks/useAuthHooks'; // Relative path
import { useAuth } from '../context/AuthContext'; // Relative path

interface SessionTimeoutWarningProps {
  timeout?: number;
  warningTime?: number;
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  timeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 5 * 60 * 1000, // 5 minute warning
}) => {
  const { refreshUser, isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  const { timeRemaining, isWarningShown, resetTimer, formatTime } = useSessionTimeout({
    timeout,
    warningTime,
    onWarning: () => {
      if (isAuthenticated) { // Only show warning if still authenticated
        setIsVisible(true);
      }
    },
    onTimeout: () => {
      setIsVisible(false);
      // Logout is handled directly by useSessionTimeout hook
    },
  });

  const handleExtendSession = async () => {
    try {
      // Attempt to refresh auth (which will validate token and potentially extend session on backend)
      await refreshUser();
      resetTimer(); // Reset local timer if refresh is successful
      setIsVisible(false); // Hide warning
    } catch (error) {
      console.error('[SessionWarning] Failed to extend session:', error);
      // Optionally show a toast error or log
    }
  };

  const handleLogoutNow = () => {
    setIsVisible(false);
    // The useSessionTimeout hook will call logout if the timer runs out.
    // If the user explicitly clicks "Logout Now", we should probably force a logout.
    // However, for simplicity and to prevent race conditions with the timeout,
    // we'll let the timeout handle the logout. User can just wait for the timeout.
    // Or, we could directly call logout() here, but then we'd need to manage
    // the timer more carefully to prevent a double logout.
  };

  if (!isVisible || !isWarningShown) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Session Expiring Soon</h3>
                <p className="text-sm text-white text-opacity-90">Your session will expire in:</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Countdown Timer */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-yellow-700 to-orange-700 border-4 border-yellow-800">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white font-mono">
                    {formatTime()}
                  </div>
                  <div className="text-xs text-yellow-300 uppercase tracking-wide mt-1">
                    Seconds
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-300">
              For your security, you&apos;ll be automatically logged out due to inactivity.
              Click &quot;Stay Logged In&quot; to extend your session.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleLogoutNow}
                className="px-4 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors font-medium"
              >
                Logout Now
              </button>
              <button
                onClick={handleExtendSession}
                className="px-4 py-3 bg-gradient-to-r from-brand-primary to-blue-600 text-white rounded-lg hover:from-brand-primary-dark hover:to-blue-700 transition-all font-medium shadow-md hover:shadow-lg"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SessionTimeoutWarning;