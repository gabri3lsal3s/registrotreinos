import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <Card className={`rounded-2xl border border-dashed border-border/80 bg-muted/20 shadow-none ${className}`}>
      <CardContent className="p-8 md:p-12 flex flex-col items-center justify-center text-center gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
            {icon}
          </div>
        )}
        <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground font-medium max-w-sm">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  );
};
