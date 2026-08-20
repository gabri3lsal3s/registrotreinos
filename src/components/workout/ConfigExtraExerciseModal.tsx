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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-[92vw] p-6 rounded-3xl bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground truncate">
            Adicionar à Sessão
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium">
            Configure as séries para {configEx.name.split(' (')[0]}.
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Número de Séries
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChangeSets(-1)}
                disabled={configEx.sets <= 1}
                className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center font-bold disabled:opacity-30 active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-mono font-black text-base text-foreground">
                {configEx.sets}
              </span>
              <button
                type="button"
                onClick={() => onChangeSets(1)}
                disabled={configEx.sets >= 10}
                className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center font-bold active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
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
