import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Dumbbell, Sparkles, Moon, ArrowRight } from 'lucide-react';
import type { Exercise } from '../../types';

export interface TodayWorkoutInfo {
  protocolName: string;
  protocolId: string;
  exercises: Exercise[];
}

interface TodayWorkoutHeroProps {
  todayWorkout: TodayWorkoutInfo | null;
  todayLabel: string;
  onStart: (protocolId: string) => void;
  onNavigateProtocols: () => void;
}

export function TodayWorkoutHero({
  todayWorkout,
  todayLabel,
  onStart,
  onNavigateProtocols
}: TodayWorkoutHeroProps) {
  if (!todayWorkout) {
    return (
      <Card className="border-border/50 bg-card/60 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center shrink-0">
              <Moon className="w-7 h-7 text-primary/70" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Hoje • {todayLabel}
              </span>
              <h3 className="text-lg font-black text-foreground">
                Dia de Descanso / Livre
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Nenhum treino agendado para hoje. Aproveite para recuperar os músculos.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onNavigateProtocols}
            className="h-11 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground border-border/60 shrink-0"
          >
            Ver Planilhas
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </Card>
    );
  }

  const muscleGroups = Array.from(new Set(todayWorkout.exercises.map(e => e.muscleGroup).filter(Boolean)));

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 rounded-3xl p-6 shadow-xl shadow-black/5 ring-1 ring-primary/10 overflow-hidden relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider">
              Treino de Hoje ({todayLabel})
            </span>
            {muscleGroups.length > 0 && (
              <span className="text-xs text-muted-foreground font-bold">
                • {muscleGroups.join(', ')}
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight leading-tight line-clamp-2">
            {todayWorkout.protocolName}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-primary" />
              {todayWorkout.exercises.length} {todayWorkout.exercises.length === 1 ? 'exercício' : 'exercícios'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Pronto para execução
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => onStart(todayWorkout.protocolId)}
          className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/25 flex items-center justify-center gap-2.5 active:scale-95 transition-all shrink-0"
        >
          <Play className="w-5 h-5 fill-current" />
          Iniciar Treino
        </Button>
      </div>
    </Card>
  );
}
