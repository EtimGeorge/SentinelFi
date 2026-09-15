import React, { useEffect, useState } from 'react';
import { EmailStatsResponse } from 'shared/types/email';
import Card from '../common/Card';
import { Spinner } from '../common/Spinner';
import { Mail, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

interface EmailDeliverabilityCardProps {
  title?: string;
  refreshKey?: number;
}

const EmailDeliverabilityCard: React.FC<EmailDeliverabilityCardProps> = ({
  title = 'Email Deliverability (30d)',
  refreshKey = 0,
}) => {
  const [stats, setStats] = useState<EmailStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api
      .get('/email-stats', { params: { days: 30 }, signal: controller.signal })
      .then((res) => {
        if (active) setStats(res.data);
      })
      .catch((err: any) => {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        if (active) setStats(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshKey]);

  return (
    <Card title={title} headerContent={<Mail className="w-5 h-5 text-blue-400" />}>
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : !stats ? (
          <p className="text-sm text-gray-500">Deliverability stats unavailable.</p>
        ) : (
          <div className="space-y-4">
            {stats.totals.failed > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/40 rounded-lg text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {stats.totals.failed} of {stats.totals.sent + stats.totals.failed} sends failed in the last{' '}
                  {stats.days} days — review the SMTP/Resend configuration below.
                </span>
              </div>
            )}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Delivery Rate</p>
                <p
                  className={`text-2xl font-bold font-mono ${
                    stats.deliveryRate === null
                      ? 'text-gray-400'
                      : stats.deliveryRate >= 95
                        ? 'text-green-400'
                        : stats.deliveryRate >= 90
                          ? 'text-yellow-400'
                          : 'text-red-400'
                  }`}
                >
                  {stats.deliveryRate === null ? '\u2014' : `${stats.deliveryRate}%`}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-brand-dark/50 border border-gray-700 rounded-lg">
                  <p className="text-lg font-bold font-mono text-green-400">{stats.totals.sent}</p>
                  <p className="text-xs text-gray-500">Sent</p>
                </div>
                <div className="p-2 bg-brand-dark/50 border border-gray-700 rounded-lg">
                  <p className="text-lg font-bold font-mono text-red-400">{stats.totals.failed}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
                <div className="p-2 bg-brand-dark/50 border border-gray-700 rounded-lg">
                  <p className="text-lg font-bold font-mono text-gray-400">{stats.totals.preview}</p>
                  <p className="text-xs text-gray-500">Previewed</p>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
              <span className="text-gray-400">Unique Recipients</span>
              <span className="font-mono text-white">{stats.uniqueRecipients}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Last Successful Send</span>
              <span className="text-gray-300">
                {stats.lastSentAt ? new Date(stats.lastSentAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EmailDeliverabilityCard;