import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Dumbbell } from 'lucide-react';
import type { Workout } from '../../types';

export interface ActiveWorkoutInfo extends Workout {
  protocolName: string;
  completedSets: number;
}

interface ActiveWorkoutBannerProps {
  activeWorkout: ActiveWorkoutInfo | null;
  onResume: (protocolId: string) => void;
}

export function ActiveWorkoutBanner({
  activeWorkout,
  onResume
}: ActiveWorkoutBannerProps) {
  if (!activeWorkout) return null;

  return (
    <Card className="border-primary/50 bg-primary/10 shadow-lg shadow-primary/10 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
      <CardContent className="p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md shadow-primary/20 animate-pulse">
            <Dumbbell className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                Sessão em Andamento
              </span>
            </div>
            <h3 className="font-black text-base sm:text-lg text-foreground truncate leading-tight mt-0.5">
              {activeWorkout.protocolName}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {activeWorkout.completedSets} séries registradas
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => onResume(activeWorkout.protocolId)}
          className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md shadow-primary/25 flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          Continuar Treino
        </Button>
      </CardContent>
    </Card>
  );
}
