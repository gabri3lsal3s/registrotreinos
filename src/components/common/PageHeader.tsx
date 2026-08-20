import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  icon, 
  badge, 
  action,
  className = ''
}: PageHeaderProps) {
  return (
    <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4 mb-6 ${className}`}>
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full">
        {icon && (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
            {icon}
          </div>
        )}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase leading-tight truncate">
              {title}
            </h1>
            {badge && (
              <div className="inline-flex items-center">
                {badge}
              </div>
            )}
          </div>
          {description && (
            <div className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>
      {action && (
        <div className="w-full sm:w-auto shrink-0 flex flex-wrap items-center justify-start sm:justify-end gap-2">
          {action}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
