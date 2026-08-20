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
import { Calendar, Clock, Save } from 'lucide-react';

interface EditDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimestamp?: number;
  onSave: (newTimestamp: number) => void;
}

function getInitialDateTime(timestamp?: number) {
  const d = timestamp ? new Date(timestamp) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hours}:${mins}`
  };
}

export function EditDateModal({
  isOpen,
  onClose,
  currentTimestamp,
  onSave
}: EditDateModalProps) {
  if (!isOpen) return null;

  return (
    <EditDateModalContent
      key={currentTimestamp || 'new'}
      isOpen={isOpen}
      onClose={onClose}
      currentTimestamp={currentTimestamp}
      onSave={onSave}
    />
  );
}

function EditDateModalContent({
  isOpen,
  onClose,
  currentTimestamp,
  onSave
}: EditDateModalProps) {
  const initial = getInitialDateTime(currentTimestamp);
  const [dateStr, setDateStr] = useState(initial.dateStr);
  const [timeStr, setTimeStr] = useState(initial.timeStr);

  const handleConfirm = () => {
    if (!dateStr || !timeStr) return;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, mins] = timeStr.split(':').map(Number);
    const newDate = new Date(year, month - 1, day, hours, mins);
    onSave(newDate.getTime());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-[92vw] p-6 rounded-3xl bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Editar Data e Hora do Treino
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium">
            Altere o momento em que o treino foi realizado.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
              <Calendar className="w-3 h-3" /> Data
            </label>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="h-12 rounded-xl font-bold bg-background border-border/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
              <Clock className="w-3 h-3" /> Hora
            </label>
            <Input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="h-12 rounded-xl font-bold bg-background border-border/50"
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
            Salvar Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
