import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Dumbbell, 
  Sparkles,
  History,
  Pin,
  Edit2,
  ArrowLeftRight
} from 'lucide-react';
import type { ExerciseCategory, UniqueExercise, WorkoutSetType } from '../../types';
import { triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';
import { WorkoutSetRow, type SetInputData } from './WorkoutSetRow';
import { ExerciseHistoryModal } from './ExerciseHistoryModal';
import { SwapExerciseModal } from './SwapExerciseModal';

export type { SetInputData };

export interface WorkoutExerciseData {
  id: string;
  name: string;
  category?: ExerciseCategory;
  multiplier?: number;
  muscleGroup?: string;
  order: number;
  lastWeight?: number;
  lastReps?: number;
  sets: number;
  completedSets: boolean[];
  setsData: SetInputData[];
  isSessionOnly?: boolean;
  pinnedNotes?: string;
  supersetGroupId?: string;
}

interface WorkoutExerciseCardProps {
  exercise: WorkoutExerciseData;
  exIdx: number;
  isExpanded: boolean;
  userId?: string;
  library?: UniqueExercise[];
  onToggleExpand: () => void;
  onToggleSet: (exIdx: number, setIdx: number) => void;
  onUpdateSetData: (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  onUpdateSetType?: (exIdx: number, setIdx: number, type: WorkoutSetType) => void;
  onDeleteExtraExercise?: (exId: string, name: string) => void;
  onUpdatePinnedNotes?: (exId: string, notes: string) => void;
  onOpenPlateCalculator?: (exIdx: number, setIdx: number, currentWeight: number) => void;
  onSwapExercise?: (exIdx: number, newEx: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => void;
  truePR?: { weight: number; reps: number };
}

export function WorkoutExerciseCard({
  exercise,
  exIdx,
  isExpanded,
  userId,
  library,
  onToggleExpand,
  onToggleSet,
  onUpdateSetData,
  onUpdateSetType,
  onDeleteExtraExercise,
  onUpdatePinnedNotes,
  onOpenPlateCalculator,
  onSwapExercise,
  truePR
}: WorkoutExerciseCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState(exercise.pinnedNotes || '');

  const completedCount = exercise.completedSets.filter(Boolean).length;
  const isAllCompleted = completedCount === exercise.sets && exercise.sets > 0;
  const displayName = exercise.name.split(' (')[0] || exercise.name;

  const handleHeaderClick = () => {
    triggerHaptic('medium');
    onToggleExpand();
  };

  const handleOpenHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    playAudioCue('click');
    setHistoryModalOpen(true);
  };

  const handleOpenNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setTempNotes(exercise.pinnedNotes || '');
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    triggerHaptic('success');
    onUpdatePinnedNotes?.(exercise.id, tempNotes.trim());
    setNotesDialogOpen(false);
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
                  {exercise.supersetGroupId && (
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                      ⚡ Bi-Set {exercise.supersetGroupId}
                    </span>
                  )}
                  {exercise.isSessionOnly && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                      Extra
                    </span>
                  )}
                </div>

                {/* Informações de Séries, PR e Histórico Rápido */}
                <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground font-mono flex-wrap">
                  <span>{completedCount}/{exercise.sets} séries</span>
                  {truePR && truePR.weight > 0 && (
                    <span className="flex items-center gap-1 text-primary font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      PR: {truePR.weight}kg × {truePR.reps}
                    </span>
                  )}

                  {/* Botão de Histórico Inline */}
                  {userId && (
                    <button
                      type="button"
                      onClick={handleOpenHistory}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-sans font-bold transition-colors"
                      title="Ver histórico das últimas 5 sessões deste exercício"
                    >
                      <History className="w-3 h-3 text-primary" />
                      Histórico
                    </button>
                  )}
                </div>

                {/* Pinned Notes / Regulagem Fixa de Aparelho */}
                {exercise.pinnedNotes ? (
                  <div 
                    onClick={handleOpenNotes}
                    className="flex items-center gap-1 mt-1.5 text-[11px] text-primary/90 hover:text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md w-fit cursor-pointer transition-colors"
                  >
                    <Pin className="w-3 h-3 rotate-45 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{exercise.pinnedNotes}</span>
                    <Edit2 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenNotes}
                    className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
                  >
                    <Pin className="w-2.5 h-2.5 rotate-45" />
                    <span>+ Nota de regulagem</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onSwapExercise && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    setSwapModalOpen(true);
                  }}
                  className="h-8 w-8 text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/10"
                  title="Substituir aparelho/exercício"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>
              )}

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
                    {exercise.setsData.map((setData, setIdx) => {
                      const w = parseFloat(setData.weight || '0') || 0;
                      const r = parseFloat(setData.reps || '0') || 0;
                      const isPR = truePR && (truePR.weight > 0 || truePR.reps > 0)
                        ? (w > truePR.weight || (w === truePR.weight && r > truePR.reps && w > 0))
                        : (w > 0 && r > 0);

                      return (
                        <WorkoutSetRow
                          key={setIdx}
                          setIdx={setIdx}
                          setData={setData}
                          isCompleted={exercise.completedSets[setIdx]}
                          isPR={isPR}
                          category={exercise.category}
                          onToggleSet={(idx) => onToggleSet(exIdx, idx)}
                          onUpdateSetData={(idx, field, val) => onUpdateSetData(exIdx, idx, field, val)}
                          onUpdateSetType={onUpdateSetType ? (idx, type) => onUpdateSetType(exIdx, idx, type) : undefined}
                          onOpenPlateCalculator={onOpenPlateCalculator ? (idx, weight) => onOpenPlateCalculator(exIdx, idx, weight) : undefined}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Modal de Histórico Inline das Últimas Sessões */}
      {userId && (
        <ExerciseHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          userId={userId}
          exerciseName={exercise.name}
          truePR={truePR}
        />
      )}

      {/* Dialog para Notas Fixas / Regulagem de Aparelho */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-sm w-[92vw] p-5 rounded-3xl bg-card border-border/70 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Pin className="w-4 h-4 text-primary rotate-45" />
              <DialogTitle className="text-base font-bold text-foreground">
                Regulagem Fixa ({displayName})
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Anotação persistente (ex: banco no furo 4, pegada aberta, polia altura 8).
            </p>
          </DialogHeader>

          <div className="py-2">
            <Input
              type="text"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Ex: Furo 3 do banco, pegada aberta"
              className="h-11 rounded-xl bg-background border-border/60 text-sm font-medium"
              autoFocus
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
              className="flex-1 rounded-xl border-border/60"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveNotes}
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              Salvar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Substituição de Exercício */}
      {onSwapExercise && (
        <SwapExerciseModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          currentExerciseName={exercise.name}
          muscleGroup={exercise.muscleGroup}
          category={exercise.category}
          userLibrary={library}
          onConfirmSwap={(newEx) => onSwapExercise(exIdx, newEx)}
        />
      )}

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
