import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, PlusCircle } from 'lucide-react';
import type { ExerciseCategory } from '../../types';
import { MuscleGroupIcon, MuscleGroupBadge } from '../common';

export interface ConfigExerciseState {
  name: string;
  category: ExerciseCategory;
  sets: number;
  muscleGroup?: string;
  multiplier?: number;
}

interface ConfigExtraExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  configEx: ConfigExerciseState | null;
  onChangeSets: (delta: number) => void;
  onConfirm: () => void;
}

export function ConfigExtraExerciseModal({
  isOpen,
  onClose,
  configEx,
  onChangeSets,
  onConfirm
}: ConfigExtraExerciseModalProps) {
  if (!configEx) return null;

  const cleanName = configEx.name.split(' (')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-[92vw] p-6 rounded-3xl bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1 text-left">
            <MuscleGroupIcon
              muscleGroup={configEx.muscleGroup}
              exerciseName={configEx.name}
              withContainer
              className="w-5 h-5"
              containerClassName="w-10 h-10 rounded-2xl shrink-0"
            />
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                {cleanName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <MuscleGroupBadge muscleGroup={configEx.muscleGroup} exerciseName={configEx.name} size="sm" />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Número de Séries
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChangeSets(-1)}
                disabled={configEx.sets <= 1}
                className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-mono font-black text-base text-foreground">
                {configEx.sets}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChangeSets(1)}
                disabled={configEx.sets >= 10}
                className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl h-11 text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="rounded-xl h-11 px-5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
