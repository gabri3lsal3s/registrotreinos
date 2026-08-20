import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6">
      <div className="space-y-1 flex-1 min-w-0 w-full">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="w-full sm:w-auto shrink-0 flex items-center justify-start sm:justify-end gap-2">
          {action}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
