import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro não tratado capturado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-full bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-card border border-border/60 shadow-2xl space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-lg shadow-destructive/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                Algo deu errado
              </h2>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Ocorreu uma falha inesperada na interface. Seus dados no dispositivo permanecem seguros.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/40 text-left font-mono text-[11px] text-muted-foreground break-all max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={this.handleReload}
                className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-border/60"
              >
                <RefreshCw className="w-4 h-4 text-primary" />
                Recarregar
              </Button>
              <Button
                type="button"
                onClick={this.handleReset}
                className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
              >
                <Home className="w-4 h-4" />
                Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
