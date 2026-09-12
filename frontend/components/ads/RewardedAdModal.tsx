import React, { useEffect, useRef, useState } from 'react';
import { X, Play, CheckCircle2 } from 'lucide-react';

interface RewardedAdModalProps {
  requiredSeconds: number;
  provider: string;
  onComplete: () => void;
  onClose: () => void;
}

/**
 * RewardedAdModal — the watch-to-earn gate.
 *
 * WHO SETS THE SECONDS?
 * - `requiredSeconds` comes from the server (GET /ads/config →
 *   REWARD_REQUIRED_SECONDS, default 15s) which mirrors what the ad
 *   network requires for a paid completed view (15–30s typical).
 * - The Close button is locked until the countdown finishes — closing
 *   early = no reward (the server also enforces elapsed time, so even
 *   a tampered client can't claim credit).
 * - In `test` provider mode this renders a simulated creative; with a
 *   real network, swap the body for the network's rewarded player SDK —
 *   the countdown + onComplete contract stays identical.
 */
const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  requiredSeconds,
  provider,
  onComplete,
  onClose,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const done = elapsed >= requiredSeconds;
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= requiredSeconds && timer.current) {
          clearInterval(timer.current);
        }
        return Math.min(e + 1, requiredSeconds);
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [requiredSeconds]);

  const remaining = Math.max(requiredSeconds - elapsed, 0);
  const progress = Math.min((elapsed / requiredSeconds) * 100, 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e1a] elev-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">
            Sponsored {provider !== 'test' ? `· ${provider}` : '· demo'}
          </span>
          <button
            onClick={onClose}
            disabled={!done}
            aria-label="Close ad"
            className={`rounded-lg p-1.5 transition-all ${
              done
                ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                : 'cursor-not-allowed text-gray-700'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Creative area (test provider renders a simulated spot) */}
        <div className="flex h-56 flex-col items-center justify-center gap-3 bg-brand-primary/10 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/20">
            {done ? (
              <CheckCircle2 className="h-7 w-7 text-green-400" />
            ) : (
              <Play className="h-7 w-7 text-brand-primary" />
            )}
          </div>
          <p className="text-sm font-bold text-white">
            {done ? 'Thanks for watching!' : 'Your reward is playing…'}
          </p>
          <p className="text-xs text-gray-500">
            {done
              ? 'Tap below to claim +1 task for today.'
              : `Keep watching — reward unlocks in ${remaining}s`}
          </p>
        </div>

        {/* Progress */}
        <div className="h-1 w-full bg-white/5">
          <div
            className={`h-full transition-all duration-1000 ${done ? 'bg-green-400' : 'bg-brand-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="font-mono text-xs text-gray-500">
            {done ? '✓ Complete' : `${remaining}s remaining`}
          </span>
          <button
            onClick={onComplete}
            disabled={!done}
            className={`rounded-xl px-6 py-2.5 text-xs font-black  transition-all ${
              done
                ? 'bg-green-500 text-white hover:bg-green-500/90'
                : 'cursor-not-allowed bg-white/5 text-gray-600'
            }`}
          >
            Claim +1 task
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardedAdModal;
