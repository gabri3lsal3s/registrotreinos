import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface InfoTooltipProps {
  title: string;
  content: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content, className = '' }) => (
  <div className={`group relative inline-block ${className}`}>
    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help group-hover:text-primary transition-colors flex-shrink-0" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed font-medium">{content}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-popover" />
    </div>
  </div>
);
