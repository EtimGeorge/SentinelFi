import React, { useEffect, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import Button from './Button';

interface ToastWithUndoProps {
  message: string;
  onUndo: () => void;
  onDismiss?: () => void;
  duration?: number;
  variant?: 'success' | 'warning' | 'error' | 'info';
  undoLabel?: string;
  isOpen: boolean;
  onClose: () => void;
}

const variantStyles: Record<string, string> = {
  success: 'bg-green-900/40 border-green-700/50 text-green-300', warning: 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300', error: 'bg-red-900/40 border-red-700/50 text-red-300', info: 'bg-blue-900/40 border-blue-700/50 text-blue-300',
};

const variantIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />, warning: <AlertTriangle className="w-5 h-5" />, error: <XCircle className="w-5 h-5" />, info: <Info className="w-5 h-5" />,
};

import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export const ToastWithUndo: React.FC<ToastWithUndoProps> = ({
  message, onUndo, onDismiss, duration = 5000, variant = 'success', undoLabel = 'Undo', isOpen, onClose,
}) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(newProgress);
      if (newProgress === 0) {
        clearInterval(interval);
        setIsExiting(true);
        setTimeout(() => {
          onClose();
          onDismiss?.();
        }, 200);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, duration, onClose, onDismiss]);

  if (!isOpen && !isExiting) return null;

  return (
    <div
      className={`fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 z-[9999] flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300 ${isExiting ? 'animate-out fade-out duration-200' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-2xl border elev-lg w-full min-w-0 max-w-md backdrop-blur-xl ${variantStyles[variant]}`}
        style={{ borderWidth: '1px' }}
      >
        <div className="flex-shrink-0 mt-0.5">
          {variantIcons[variant]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{message}</p>
          <div className="flex items-center gap-3 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onUndo();
                onClose();
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> {undoLabel}
            </Button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            className="h-1 bg-white/10 rounded-full mt-3 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Time remaining to undo"
          >
            <div
              className="h-full bg-white/50 transition-all duration-50 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastWithUndo;