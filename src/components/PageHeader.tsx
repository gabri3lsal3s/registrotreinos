import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 mb-10">
      <div className="space-y-2 flex-1 min-w-0">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[0.15em] text-foreground uppercase leading-none truncate drop-shadow-sm">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground font-mono text-[clamp(11px,1.5vw,13px)] uppercase tracking-[0.25em] font-medium opacity-80 truncate">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}
