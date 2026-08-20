import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Save } from 'lucide-react';
import type { WorkoutSet } from '../../types';
import { parseLocaleNumber } from '../../utils/workoutMath';

interface EditSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  set: WorkoutSet | null;
  exerciseName?: string;
  onSave: (setId: string, weight: number, reps: number) => void;
}

export function EditSetModal({
  isOpen,
  onClose,
  set,
  exerciseName = 'Exercício',
  onSave
}: EditSetModalProps) {
  if (!isOpen || !set) return null;

  return (
    <EditSetModalContent
      key={set.id}
      isOpen={isOpen}
      onClose={onClose}
      set={set}
      exerciseName={exerciseName}
      onSave={onSave}
    />
  );
}

function EditSetModalContent({
  isOpen,
  onClose,
  set,
  exerciseName = 'Exercício',
  onSave
}: EditSetModalProps & { set: WorkoutSet }) {
  const [weight, setWeight] = useState(String(set.weight));
  const [reps, setReps] = useState(String(set.reps));

  const handleConfirm = () => {
    if (!set) return;
    const parsedWeight = parseLocaleNumber(weight, 0);
    const parsedReps = parseLocaleNumber(reps, 1);
    onSave(set.id, parsedWeight, parsedReps);
    onClose();
  };

  if (!set) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-[92vw] p-6 rounded-3xl bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            Editar Série #{set.setIndex + 1}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium truncate">
            {exerciseName}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Carga (kg)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="h-12 rounded-xl text-center font-bold text-base bg-background border-border/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Repetições
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="h-12 rounded-xl text-center font-bold text-base bg-background border-border/50"
            />
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
            onClick={handleConfirm}
            className="rounded-xl h-11 px-5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground flex items-center gap-1.5 shadow-sm shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
