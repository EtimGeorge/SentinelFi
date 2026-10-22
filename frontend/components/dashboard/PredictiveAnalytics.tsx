import React, { useMemo } from 'react';
import {
  ResponsiveChartContainer,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
  ChartArea,
  ChartLine,
  ChartCartesianGrid,
  CHART_COLORS,
  BaseChartProps,
} from '../chart';
import { TrendingUp, Calendar, AlertTriangle, Zap } from 'lucide-react';
import Card from '../common/Card';
import { useCurrency } from '../../components/context/CurrencyContext';

interface HistoryPoint {
  date: string;
  amount: number;
}

interface PredictiveAnalyticsProps {
  history: HistoryPoint[];
  totalBudgeted: number;
  totalActualPaid: number;
  avgDailySpend: number;
  estimatedExhaustionDate: string | null;
  currency: string;
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  history, totalBudgeted, totalActualPaid, avgDailySpend, estimatedExhaustionDate, currency
}) => {
  const { convertAmount, convertToDisplay, userCurrency } = useCurrency();

  const burnUpData = useMemo(() => {
    let cumulative = 0;
    const sourceCurrency = currency || 'NGN';
    return history.map(h => {
      const convertedAmt = convertAmount(h.amount, sourceCurrency, userCurrency.code);
      cumulative += convertedAmt;
      return {
        date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend: convertedAmt,
        cumulative: cumulative,
        budget: convertAmount(totalBudgeted, sourceCurrency, userCurrency.code),
      };
    });
  }, [history, totalBudgeted, currency, userCurrency.code, convertAmount]);

  const isNearingExhaustion = estimatedExhaustionDate
    ? (new Date(estimatedExhaustionDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000)
    : false;

  const currentCurrencySymbol = userCurrency.symbol;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Burn-Up Chart */}
      <div className="lg:col-span-2">
        <Card
          title="Financial Trajectory (Burn-up)"
          subtitle={`Cumulative spend vs total budgeted (${userCurrency.code})`}
          accent="primary"
        >
          <div className="h-[300px] w-full mt-4">
            <ResponsiveChartContainer width="100%" height="100%">
              <ChartArea
                data={burnUpData}
                xDataKey="date"
                yDataKeys={['cumulative', 'budget']}
                yDataLabels={{ cumulative: 'Cumulative Outflow', budget: 'Total Approved Budget' }}
                colors={[CHART_COLORS.primary, CHART_COLORS.axis]}
                strokeWidth={2}
                dot={false}
                fillOpacity={0.28}
                yTickFormatter={(value) => `${currentCurrencySymbol}${(Number(value) / 1000).toFixed(0)}k`}
                height={200}
              />
            </ResponsiveChartContainer>
          </div>
        </Card>
      </div>

      {/* Predictive Health Cards */}
      <div className="space-y-4">
        <Card title="Exhaustion Forecast" accent={isNearingExhaustion ? 'alert' : 'positive'}>
          <div className="space-y-5 py-1">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className={`w-4 h-4 ${isNearingExhaustion ? 'text-alert-critical' : 'text-brand-primary'}`} />
                <span className="text-label text-gray-500">Projected fund exhaustion</span>
              </div>
              <p className={`font-mono text-xl font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${isNearingExhaustion ? 'text-alert-critical' : 'text-white'}`}>
                {estimatedExhaustionDate ? new Date(estimatedExhaustionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
              <p className="mt-0.5 text-caption">Based on 30-day velocity</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700/60">
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-gray-400" />
                  <span className="text-label-sm text-gray-500">Daily velocity</span>
                </div>
                <p className="font-mono text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{convertToDisplay(avgDailySpend, currency || 'NGN')}</p>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-gray-400" />
                  <span className="text-label-sm text-gray-500">Est. monthly burn</span>
                </div>
                <p className="font-mono text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                  {convertToDisplay(avgDailySpend * 30, currency || 'NGN')}
                </p>
              </div>
            </div>

            {isNearingExhaustion && (
              <div className="mt-4 rounded-lg border border-alert-critical/30 bg-alert-critical/10 p-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-alert-critical shrink-0 mt-0.5" />
                <div>
                  <p className="text-label text-alert-critical">Budget alert</p>
                  <p className="mt-0.5 text-caption">Predicted exhaustion in less than 30 days at the current burn rate.</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Daily Spend Momentum" accent="secondary">
          <div className="h-[120px] w-full mt-2">
            <ResponsiveChartContainer width="100%" height="100%">
              <ChartLine
                data={burnUpData}
                xDataKey="date"
                yDataKeys={['spend']}
                colors={[CHART_COLORS.primary]}
                strokeWidth={2}
                dot={false}
                height={120}
              />
              <ChartTooltip
                contentStyle={{ backgroundColor: 'var(--chart-tooltip)', border: '1px solid var(--chart-axis)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '10px' }}
                formatter={(value: any) => [convertToDisplay(Number(value)), 'Daily spend']}
              />
            </ResponsiveChartContainer>
          </div>
          <p className="text-label-sm text-gray-500 mt-2 text-center">Daily spend volatility</p>
        </Card>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
