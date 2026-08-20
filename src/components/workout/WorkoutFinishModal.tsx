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
import { Trophy, Sparkles, CheckCircle2, Smile, Moon, Flame } from 'lucide-react';

interface PRDetail {
  exerciseName: string;
  weight: number;
  reps: number;
  previousWeight?: number;
}

interface WorkoutFinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (metrics: { mood: number; sleepQuality: number; stressLevel: number; notes: string }) => void;
  totalSetsCompleted: number;
  totalVolumeKg: number;
  brokenPRs: PRDetail[];
  isSubmitting?: boolean;
}

export function WorkoutFinishModal({
  isOpen,
  onClose,
  onConfirm,
  totalSetsCompleted,
  totalVolumeKg,
  brokenPRs,
  isSubmitting = false
}: WorkoutFinishModalProps) {
  const [mood, setMood] = useState(4); // 1-5
  const [sleepQuality, setSleepQuality] = useState(4); // 1-5
  const [stressLevel, setStressLevel] = useState(2); // 1-5
  const [notes, setNotes] = useState('');

  const handleFinish = () => {
    onConfirm({
      mood,
      sleepQuality,
      stressLevel,
      notes: notes.trim()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md w-[92vw] max-h-[90vh] flex flex-col p-6 rounded-3xl bg-card border-border/60 shadow-2xl overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-black uppercase tracking-wider text-foreground text-center">
            Treino Concluído!
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium text-center">
            Excelente trabalho! Confira o resumo da sua sessão.
          </p>
        </DialogHeader>

        {/* Resumo da Sessão */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Séries Válidas
            </span>
            <span className="text-2xl font-black font-mono text-foreground">
              {totalSetsCompleted}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Volume Total
            </span>
            <span className="text-2xl font-black font-mono text-primary">
              {Math.round(totalVolumeKg).toLocaleString('pt-BR')} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </span>
          </div>
        </div>

        {/* Novos Recordes Superados (PRs) */}
        {brokenPRs.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-2 mb-4">
            <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Novos Recordes Pessoais!
            </div>
            <div className="space-y-1.5">
              {brokenPRs.map((pr, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate pr-2">
                    {pr.exerciseName}
                  </span>
                  <span className="font-mono font-bold text-primary shrink-0">
                    {pr.weight}kg × {pr.reps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avaliação Rápida de Percepção */}
        <div className="space-y-4 py-2 border-t border-border/30">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Smile className="w-3.5 h-3.5" /> Disposição / Humor
              </span>
              <span className="font-mono text-primary font-black">{mood}/5</span>
            </div>
            <div className="flex justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMood(val)}
                  className={`flex-1 h-9 rounded-xl font-bold font-mono text-xs transition-all ${
                    mood === val
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                      : 'bg-muted/30 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Moon className="w-3.5 h-3.5" /> Qualidade do Sono
              </span>
              <span className="font-mono text-primary font-black">{sleepQuality}/5</span>
            </div>
            <div className="flex justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSleepQuality(val)}
                  className={`flex-1 h-9 rounded-xl font-bold font-mono text-xs transition-all ${
                    sleepQuality === val
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                      : 'bg-muted/30 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Flame className="w-3.5 h-3.5" /> Nível de Esforço
              </span>
              <span className="font-mono text-primary font-black">{stressLevel}/5</span>
            </div>
            <div className="flex justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStressLevel(val)}
                  className={`flex-1 h-9 rounded-xl font-bold font-mono text-xs transition-all ${
                    stressLevel === val
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                      : 'bg-muted/30 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Anotações da Sessão */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Observações da Sessão
            </span>
            <Input
              type="text"
              placeholder="Ex: Treino muito produtivo, progredi carga no supino."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 rounded-xl bg-background border-border/50 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl h-12 text-muted-foreground font-bold text-xs uppercase tracking-wider"
          >
            Voltar ao treino
          </Button>

          <Button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="rounded-xl h-12 px-6 font-black text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Salvar e Concluir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
