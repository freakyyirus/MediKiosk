import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type StatColor = 'primary' | 'success' | 'warning' | 'danger';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: StatColor;
}

const colorStyles: Record<StatColor, { bg: string; icon: string }> = {
  primary: { bg: 'bg-primary-50', icon: 'text-primary-600' },
  success: { bg: 'bg-success-50', icon: 'text-success-600' },
  warning: { bg: 'bg-warning-50', icon: 'text-warning-600' },
  danger: { bg: 'bg-danger-50', icon: 'text-danger-600' },
};

export default function StatsCard({
  title,
  value,
  change,
  icon,
  color = 'primary',
}: StatsCardProps) {
  const styles = colorStyles[color];

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{title}</p>
          <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp size={14} className="text-success-500" />
              ) : (
                <TrendingDown size={14} className="text-danger-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  change >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}
              >
                {change >= 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${styles.bg}`}>
          <span className={styles.icon}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
