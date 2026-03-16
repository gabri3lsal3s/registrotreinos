import React from 'react';
import { Cloud, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../services/authStore';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  const { syncStatus } = useAuthStore();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 mb-10">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[0.15em] text-foreground uppercase leading-none truncate drop-shadow-sm">
            {title}
          </h1>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 border border-border/20 backdrop-blur-sm self-center h-fit">
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3 h-3 text-primary animate-spin" />
            ) : syncStatus === 'error' ? (
              <AlertCircle className="w-3 h-3 text-destructive animate-pulse" />
            ) : (
              <Cloud className="w-3 h-3 text-primary/60" />
            )}
            <span className={`text-[8px] font-black uppercase tracking-widest ${
              syncStatus === 'syncing' ? 'text-primary' : 
              syncStatus === 'error' ? 'text-destructive' : 
              'text-muted-foreground/60'
            }`}>
              {syncStatus === 'syncing' ? 'Syncing' : 
               syncStatus === 'error' ? 'Error' : 
               'Cloud'}
            </span>
          </div>
        </div>
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
