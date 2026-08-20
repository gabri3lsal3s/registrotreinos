import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Dumbbell, Sparkles } from 'lucide-react';
import { 
  getExerciseSessionHistory, 
  type ExerciseSessionHistoryItem 
} from '../../services/workoutDB';
import { MuscleGroupIcon, MuscleGroupBadge } from '../common';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  exerciseName: string;
  muscleGroup?: string;
  truePR?: { weight: number; reps: number };
}

export function ExerciseHistoryModal({
  isOpen,
  onClose,
  userId,
  exerciseName,
  muscleGroup,
  truePR
}: ExerciseHistoryModalProps) {
  const [history, setHistory] = useState<ExerciseSessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cleanName = exerciseName.split(' (')[0] || exerciseName;

  useEffect(() => {
    async function loadHistory() {
      if (!isOpen || !userId || !exerciseName) return;
      setLoading(true);
      try {
        const data = await getExerciseSessionHistory(userId, exerciseName, 5);
        setHistory(data);
      } catch (err) {
        console.error('Erro ao carregar histórico do exercício:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [isOpen, userId, exerciseName]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[94vw] max-h-[88vh] flex flex-col p-5 sm:p-6 rounded-3xl bg-card border-border/70 shadow-2xl overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <MuscleGroupIcon
              muscleGroup={muscleGroup}
              exerciseName={cleanName}
              withContainer
              className="w-5 h-5"
              containerClassName="w-10 h-10 rounded-2xl shrink-0"
            />
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground truncate">
                {cleanName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <MuscleGroupBadge muscleGroup={muscleGroup} exerciseName={cleanName} size="sm" />
                {truePR && truePR.weight > 0 && (
                  <span className="flex items-center gap-1 text-primary text-xs font-mono font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    PR: {truePR.weight}kg × {truePR.reps}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl bg-muted/20 border border-border/40 space-y-2">
              <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <h4 className="font-bold text-sm text-foreground">Nenhum histórico anterior</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Este exercício ainda não foi registrado em sessões de treino concluídas anteriormente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Últimas {history.length} sessões realizadas
                </span>
              </div>

              {history.map((session, sIdx) => {
                const formattedDate = dayjs(session.date).format('DD [de] MMMM [de] YYYY');
                const relativeDate = dayjs(session.date).fromNow ? dayjs(session.date).fromNow() : '';

                return (
                  <div
                    key={session.workoutId || sIdx}
                    className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-3 transition-colors hover:border-border/80"
                  >
                    {/* Cabeçalho da Sessão */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-bold text-foreground capitalize">
                          {formattedDate}
                        </span>
                        {relativeDate && (
                          <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                            ({relativeDate})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground truncate max-w-[120px]">
                        {session.protocolName}
                      </span>
                    </div>

                    {/* Resumo de Destaque da Sessão */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-card border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Melhor Série
                        </span>
                        <span className="font-mono font-black text-foreground">
                          {session.bestWeight}kg × {session.bestReps}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-card border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          1RM Est.
                        </span>
                        <span className="font-mono font-black text-primary">
                          {session.estimated1RM} kg
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-card border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Volume Total
                        </span>
                        <span className="font-mono font-black text-foreground">
                          {Math.round(session.totalVolume)} kg
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Séries Realizadas */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                        <span>Série</span>
                        <span>Carga × Reps</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {session.sets.map((set, idx) => (
                          <div
                            key={set.id || idx}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card/80 border border-border/40 text-xs font-mono"
                          >
                            <span className="font-bold text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-foreground">
                              {set.weight}kg × {set.reps}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full rounded-xl border-border/60 font-bold"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
