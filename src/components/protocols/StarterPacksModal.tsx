import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarDays, Dumbbell, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { STARTER_PACKS } from '../../utils/starterPacks';
import { WEEK_DAYS } from '../../utils/constants';
import { addExercise, createProtocol } from '../../services/workoutDB';
import { fullSync } from '../../services/syncService';
import { triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';
import { toast } from 'sonner';

interface StarterPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (newProtocolId: string) => void;
}

export function StarterPacksModal({
  isOpen,
  onClose,
  userId,
  onSuccess
}: StarterPacksModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>(STARTER_PACKS[0].id);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [isAdopting, setIsAdopting] = useState(false);

  const selectedPack = STARTER_PACKS.find((p) => p.id === selectedPackId) || STARTER_PACKS[0];

  const handleAdoptTemplate = async () => {
    if (!userId || !selectedPack) return;
    setIsAdopting(true);
    triggerHaptic('success');
    playAudioCue('pr_celebration');

    try {
      const protocolId = await createProtocol({
        userId,
        name: selectedPack.name.split(' (')[0],
        description: selectedPack.description,
        daysOfWeek: selectedPack.daysOfWeek,
        isEnabled: true
      });

      for (const dayKey of selectedPack.daysOfWeek) {
        const dayLabel = WEEK_DAYS.find(w => w.key === dayKey)?.label || dayKey;
        const exercises = selectedPack.exercisesByDay[dayKey] || [];

        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          await addExercise({
            protocolId,
            name: `${ex.name} (${dayLabel})`,
            muscleGroup: ex.muscleGroup,
            category: ex.category || 'weight',
            multiplier: ex.multiplier || 1.0,
            order: i,
            dayOfWeek: dayKey,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            pinnedNotes: ex.pinnedNotes
          });
        }
      }

      fullSync().catch(console.error);
      toast.success(`Template "${selectedPack.name.split(' (')[0]}" adicionado com sucesso!`);
      onSuccess(protocolId);
      onClose();
    } catch (err) {
      console.error('Erro ao adotar template:', err);
      toast.error('Erro ao criar protocolo a partir do template.');
    } finally {
      setIsAdopting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isAdopting && onClose()}>
      <DialogContent className="max-w-xl w-[94vw] max-h-[88vh] flex flex-col p-5 sm:p-6 rounded-3xl bg-card border-border/70 shadow-2xl overflow-hidden">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground">
                Templates Consagrados (Starter Packs)
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Fichas clássicas completas montadas por especialistas
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Abas dos Templates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3">
          {STARTER_PACKS.map((pack) => {
            const isSelected = selectedPackId === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  playAudioCue('click');
                  setSelectedPackId(pack.id);
                  setExpandedDay(null);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/20'
                    : 'bg-muted/20 border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm truncate">
                  {pack.split}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-muted-foreground">
                  <CalendarDays className="w-3 h-3 text-primary" />
                  {pack.daysCount} dias/sem
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalhes do Template Selecionado */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[200px]">
          <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5">
            <h4 className="font-black text-sm text-foreground">
              {selectedPack.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {selectedPack.description}
            </p>
          </div>

          {/* Lista de Dias e Exercícios */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block px-1">
              Divisão Semanal ({selectedPack.daysCount} sessões)
            </span>

            {selectedPack.daysOfWeek.map((dayKey) => {
              const dayLabel = WEEK_DAYS.find(w => w.key === dayKey)?.label || dayKey;
              const exercises = selectedPack.exercisesByDay[dayKey] || [];
              const isDayOpen = expandedDay === dayKey || selectedPack.daysOfWeek.length <= 4;

              return (
                <div
                  key={dayKey}
                  className="rounded-xl border border-border/40 bg-card overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setExpandedDay(expandedDay === dayKey ? null : dayKey);
                    }}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/20 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-bold text-xs sm:text-sm text-foreground">
                        {dayLabel}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({exercises.length} exercícios)
                      </span>
                    </div>
                    {isDayOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isDayOpen && (
                    <div className="p-3 pt-0 border-t border-border/20 space-y-1.5 bg-muted/5">
                      {exercises.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-card border border-border/30"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground truncate">
                              {ex.name}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-muted-foreground shrink-0 text-[11px]">
                            {ex.sets} × {ex.reps} {ex.category === 'time' ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/30">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isAdopting}
            className="w-full sm:w-auto rounded-xl border-border/60 font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAdoptTemplate}
            disabled={isAdopting}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center justify-center gap-2 shadow-md shadow-primary/20"
          >
            {isAdopting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Adotar este Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
