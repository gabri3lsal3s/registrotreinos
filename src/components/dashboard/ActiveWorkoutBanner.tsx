import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RefreshCw, Dumbbell, Trash2, Clock } from 'lucide-react';
import type { Workout } from '../../types';

export interface ActiveWorkoutInfo extends Workout {
  protocolName: string;
  completedSets: number;
}

interface ActiveWorkoutBannerProps {
  activeWorkout: ActiveWorkoutInfo | null;
  onResume: (protocolId: string) => void;
  onDiscard?: (workoutId: string) => void;
}

export function ActiveWorkoutBanner({
  activeWorkout,
  onResume,
  onDiscard
}: ActiveWorkoutBannerProps) {
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  if (!activeWorkout) return null;

  const startDate = new Date(activeWorkout.date);
  const now = new Date();
  const isToday = startDate.toDateString() === now.toDateString();
  const timeStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const timeLabel = isToday ? `Iniciado hoje às ${timeStr}` : `Iniciado em ${dateStr} às ${timeStr}`;

  return (
    <>
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5 flex-wrap">
                <span>{activeWorkout.completedSets} {activeWorkout.completedSets === 1 ? 'série registrada' : 'séries registradas'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {timeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onDiscard && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDiscardDialogOpen(true)}
                className="h-11 px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-wider"
                title="Descartar treino em andamento"
              >
                <Trash2 className="w-4 h-4 mr-1 sm:mr-0" />
                <span className="sm:hidden">Descartar</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => onResume(activeWorkout.protocolId)}
              className="h-11 sm:h-12 px-5 sm:px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md shadow-primary/25 flex items-center justify-center gap-2 active:scale-95 transition-all flex-1 sm:flex-initial"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              Continuar Treino
            </Button>
          </div>
        </CardContent>
      </Card>

      {onDiscard && (
        <ConfirmDialog
          open={discardDialogOpen}
          onOpenChange={setDiscardDialogOpen}
          title="Descartar treino em andamento?"
          description={`Deseja descartar a sessão em andamento de "${activeWorkout.protocolName}" (${timeLabel})? O progresso não será salvo no histórico.`}
          confirmLabel="Descartar Treino"
          variant="destructive"
          onConfirm={() => onDiscard(activeWorkout.id)}
        />
      )}
    </>
  );
}
