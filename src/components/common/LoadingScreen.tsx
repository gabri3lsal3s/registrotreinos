import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-full bg-background flex flex-col items-center justify-center p-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <span className="text-sm font-medium text-muted-foreground animate-pulse">
        Carregando...
      </span>
    </div>
  );
};
