import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  progressPercent?: number;
  deltaPercent?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  progressPercent,
  deltaPercent,
  deltaLabel,
  icon,
  className = '',
  onClick,
}) => {
  return (
    <Card 
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-border/50 shadow-sm bg-card flex flex-col justify-between p-5 hover:border-primary/30 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="my-2 flex items-baseline justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight leading-none">
          {value}
        </h2>
        {deltaPercent !== undefined && (
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
            deltaPercent >= 0 
              ? 'bg-emerald-500/10 text-emerald-500' 
              : 'bg-rose-500/10 text-rose-500'
          }`}>
            {deltaPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
            {deltaLabel && <span className="opacity-70 text-[9px] uppercase ml-0.5">{deltaLabel}</span>}
          </div>
        )}
      </div>

      {progressPercent !== undefined && (
        <div className="space-y-1.5 pt-1">
          <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} 
            />
          </div>
          {subValue && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold block">
              {subValue}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
