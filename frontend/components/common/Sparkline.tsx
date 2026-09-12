import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  positive?: boolean;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, positive = true, height = 32 }) => {
  if (!data || data.length < 2) return null;

  const points = data.map((value, index) => ({ index, value }));
  const color = positive ? '#059669' : '#EA580C';

  return (
    <div className="w-full" style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;