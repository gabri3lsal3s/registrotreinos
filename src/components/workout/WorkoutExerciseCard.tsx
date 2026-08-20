import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Dumbbell, 
  Sparkles
} from 'lucide-react';
import type { ExerciseCategory, WorkoutSetType } from '../../types';
import { triggerHaptic } from '../../utils/sensoryFeedback';
import { WorkoutSetRow, type SetInputData } from './WorkoutSetRow';

export type { SetInputData };

export interface WorkoutExerciseData {
  id: string;
  name: string;
  category?: ExerciseCategory;
  order: number;
  lastWeight?: number;
  lastReps?: number;
  sets: number;
  completedSets: boolean[];
  setsData: SetInputData[];
  isSessionOnly?: boolean;
}

interface WorkoutExerciseCardProps {
  exercise: WorkoutExerciseData;
  exIdx: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSet: (exIdx: number, setIdx: number) => void;
  onUpdateSetData: (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  onUpdateSetType?: (exIdx: number, setIdx: number, type: WorkoutSetType) => void;
  onDeleteExtraExercise?: (exId: string, name: string) => void;
  truePR?: { weight: number; reps: number };
}

export function WorkoutExerciseCard({
  exercise,
  exIdx,
  isExpanded,
  onToggleExpand,
  onToggleSet,
  onUpdateSetData,
  onUpdateSetType,
  onDeleteExtraExercise,
  truePR
}: WorkoutExerciseCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const completedCount = exercise.completedSets.filter(Boolean).length;
  const isAllCompleted = completedCount === exercise.sets && exercise.sets > 0;
  const displayName = exercise.name.split(' (')[0] || exercise.name;

  const handleHeaderClick = () => {
    triggerHaptic('medium');
    onToggleExpand();
  };

  return (
    <>
      <motion.div
        layout
        transition={{ duration: 0.2 }}
      >
        <Card className={`overflow-hidden border transition-colors duration-200 rounded-2xl ${
          isAllCompleted
            ? 'border-primary/40 bg-card/60'
            : isExpanded
            ? 'border-border/80 bg-card shadow-lg ring-1 ring-primary/10'
            : 'border-border/40 bg-card hover:border-border/60'
        }`}>
          {/* Header do Card (Clicável para expandir/recolher) */}
          <div
            onClick={handleHeaderClick}
            className="flex items-center justify-between p-4 cursor-pointer select-none transition-colors hover:bg-muted/15"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isAllCompleted
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-muted/60 text-muted-foreground'
              }`}>
                <Dumbbell className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate leading-tight">
                    {displayName}
                  </h3>
                  {exercise.isSessionOnly && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                      Extra
                    </span>
                  )}
                </div>

                {/* Informações de PR e progresso de séries */}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                  <span>{completedCount}/{exercise.sets} séries</span>
                  {truePR && truePR.weight > 0 && (
                    <span className="flex items-center gap-1 text-primary font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      PR: {truePR.weight}kg × {truePR.reps}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {exercise.isSessionOnly && onDeleteExtraExercise && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('heavy');
                    setDeleteDialogOpen(true);
                  }}
                  className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="p-1 rounded-lg text-muted-foreground/60">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </div>

          {/* Conteúdo Expandido com AnimatePresence e física fluida */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                <CardContent className="p-3 sm:p-4 pt-0 border-t border-border/30 bg-muted/5">
                  <div className="space-y-2.5 pt-3">
                    {/* Cabeçalho da tabela */}
                    <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                      <div className="w-10 sm:w-12 text-center">Série</div>
                      <div className="flex-1 max-w-[130px] text-center">
                        {exercise.category === 'weight' ? 'Carga (kg)' : '+ Carga'}
                      </div>
                      <div className="flex-1 max-w-[110px] text-center">
                        {exercise.category === 'time' ? 'Tempo (s)' : 'Reps'}
                      </div>
                      <div className="w-10 sm:w-11 text-center">OK</div>
                    </div>

                    {/* Linhas de Séries */}
                    {exercise.setsData.map((setData, setIdx) => (
                      <WorkoutSetRow
                        key={setIdx}
                        setIdx={setIdx}
                        setData={setData}
                        isCompleted={exercise.completedSets[setIdx]}
                        category={exercise.category}
                        onToggleSet={(idx) => onToggleSet(exIdx, idx)}
                        onUpdateSetData={(idx, field, val) => onUpdateSetData(exIdx, idx, field, val)}
                        onUpdateSetType={onUpdateSetType ? (idx, type) => onUpdateSetType(exIdx, idx, type) : undefined}
                      />
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Confirmação de exclusão de exercício extra */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Remover ${displayName}?`}
        description="Este exercício foi adicionado extra para esta sessão e será removido do treino atual."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={() => onDeleteExtraExercise?.(exercise.id, displayName)}
      />
    </>
  );
}

export default WorkoutExerciseCard;
