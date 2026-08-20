import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { 
  Dumbbell, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2, 
  Smile, 
  Flame, 
  Moon 
} from 'lucide-react';
import type { Workout, WorkoutSet, Exercise } from '../../types';
import { calculateVolume } from '../../utils/workoutMath';

interface HistoryWorkoutCardProps {
  workout: Workout;
  protocolName: string;
  groupedSets: [string, WorkoutSet[]][];
  exercisesMap: Record<string, Exercise>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditSet: (set: WorkoutSet, exerciseName: string) => void;
  onDeleteSet: (setId: string) => void;
  onEditDate: (workout: Workout) => void;
  onDeleteWorkout: (workoutId: string) => void;
}

export function HistoryWorkoutCard({
  workout,
  protocolName,
  groupedSets,
  exercisesMap,
  isExpanded,
  onToggleExpand,
  onEditSet,
  onDeleteSet,
  onEditDate,
  onDeleteWorkout
}: HistoryWorkoutCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const date = new Date(workout.date);
  const formattedDate = date.toLocaleDateString('pt-BR', { 
    weekday: 'short', 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let totalSets = 0;
  let totalVolume = 0;

  groupedSets.forEach(([exerciseId, sets]) => {
    const ex = exercisesMap[exerciseId];
    sets.forEach(s => {
      totalSets++;
      totalVolume += calculateVolume(s.weight, s.reps, ex?.category);
    });
  });

  return (
    <>
      <Card className={`overflow-hidden border transition-all duration-200 rounded-2xl ${
        isExpanded
          ? 'border-primary/50 bg-card shadow-md ring-1 ring-primary/10'
          : 'border-border/50 bg-card hover:border-border/80 shadow-sm'
      }`}>
        <div
          onClick={onToggleExpand}
          className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h4 className="font-black text-sm sm:text-base text-foreground truncate leading-tight">
                {protocolName}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium flex-wrap">
                <span className="capitalize">{formattedDate}</span>
                <span>•</span>
                <span className="font-mono">{formattedTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold font-mono text-primary block leading-none">
                {Math.round(totalVolume).toLocaleString('pt-BR')} kg
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {totalSets} séries
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditDate(workout);
                }}
                className="h-8 w-8 text-muted-foreground/60 hover:text-foreground rounded-lg"
                title="Editar data/hora"
              >
                <Calendar className="w-3.5 h-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title="Excluir treino"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>

              <div className="p-1 text-muted-foreground/60">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <CardContent className="p-4 pt-0 border-t border-border/30 bg-muted/5 space-y-4 animate-in fade-in duration-200">
            {(workout.mood || workout.sleepQuality || workout.stressLevel || workout.notes) && (
              <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-muted-foreground">
                {workout.mood && (
                  <span className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-lg">
                    <Smile className="w-3.5 h-3.5 text-primary" /> Humor: {workout.mood}/5
                  </span>
                )}
                {workout.sleepQuality && (
                  <span className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-lg">
                    <Moon className="w-3.5 h-3.5 text-blue-400" /> Sono: {workout.sleepQuality}/5
                  </span>
                )}
                {workout.stressLevel && (
                  <span className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-lg">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Esforço: {workout.stressLevel}/5
                  </span>
                )}
                {workout.notes && (
                  <p className="w-full text-xs italic text-muted-foreground/90 bg-muted/20 p-2.5 rounded-xl border border-border/30">
                    "{workout.notes}"
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2">
              {groupedSets.map(([exerciseId, sets]) => {
                const exercise = exercisesMap[exerciseId];
                const displayName = exercise?.name ? exercise.name.split(' (')[0] : 'Exercício';

                return (
                  <div key={exerciseId} className="p-3 rounded-xl bg-card border border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-foreground">
                        {displayName}
                      </h5>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {sets.length} séries
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {sets.map((set) => (
                        <div
                          key={set.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30 text-xs"
                        >
                          <div className="min-w-0 pr-1">
                            <span className="text-[10px] font-mono text-muted-foreground block leading-none">
                              #{set.setIndex + 1}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {set.weight}kg × {set.reps}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditSet(set, displayName)}
                              className="h-6 w-6 text-muted-foreground/60 hover:text-foreground rounded"
                              title="Editar série"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteSet(set.id)}
                              className="h-6 w-6 text-muted-foreground/60 hover:text-destructive rounded"
                              title="Excluir série"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir treino do histórico?"
        description={`Deseja realmente excluir o treino de "${protocolName}" realizado em ${formattedDate}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Treino"
        variant="destructive"
        onConfirm={() => onDeleteWorkout(workout.id)}
      />
    </>
  );
}
