import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, Search, Sparkles } from 'lucide-react';
import { EXERCISE_DATABASE, getExerciseInfo } from '../../utils/exerciseDictionary';
import type { ExerciseCategory, UniqueExercise } from '../../types';
import { triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';
import { MuscleGroupIcon, MuscleGroupBadge } from '../common';

interface SwapExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExerciseName: string;
  muscleGroup?: string;
  category?: ExerciseCategory;
  userLibrary?: UniqueExercise[];
  onConfirmSwap: (newExercise: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => void;
}

export function SwapExerciseModal({
  isOpen,
  onClose,
  currentExerciseName,
  muscleGroup,
  category = 'weight',
  userLibrary = [],
  onConfirmSwap
}: SwapExerciseModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEx, setSelectedEx] = useState<{ name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number } | null>(null);

  const cleanCurrentName = currentExerciseName.split(' (')[0] || currentExerciseName;
  const currentInfo = getExerciseInfo(cleanCurrentName);
  const targetMuscle = muscleGroup || currentInfo.muscleGroup;

  // Sugestões inteligentes do mesmo grupo muscular
  const suggestions = useMemo(() => {
    const list: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }[] = [];
    const seen = new Set<string>();
    seen.add(cleanCurrentName.toLowerCase());

    // 1. Da biblioteca padrão
    EXERCISE_DATABASE.forEach((item) => {
      const matchMuscle = item.muscleGroup.toLowerCase() === targetMuscle.toLowerCase();
      if (matchMuscle && !seen.has(item.name.toLowerCase())) {
        seen.add(item.name.toLowerCase());
        list.push({
          name: item.name,
          muscleGroup: item.muscleGroup,
          category: item.category,
          multiplier: item.multiplier
        });
      }
    });

    // 2. Do histórico do usuário
    userLibrary.forEach((item) => {
      if (!seen.has(item.name.toLowerCase())) {
        const matchMuscle = item.muscleGroup?.toLowerCase() === targetMuscle.toLowerCase();
        if (matchMuscle) {
          seen.add(item.name.toLowerCase());
          list.push({
            name: item.name,
            muscleGroup: item.muscleGroup || targetMuscle,
            category: item.category || category,
            multiplier: item.multiplier
          });
        }
      }
    });

    return list;
  }, [cleanCurrentName, targetMuscle, category, userLibrary]);

  // Lista filtrada por busca
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return suggestions;
    const term = searchTerm.toLowerCase();

    const results: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }[] = [];
    const seen = new Set<string>();

    EXERCISE_DATABASE.forEach((item) => {
      if (item.name.toLowerCase().includes(term) || item.muscleGroup.toLowerCase().includes(term)) {
        seen.add(item.name.toLowerCase());
        results.push(item);
      }
    });

    userLibrary.forEach((item) => {
      if (!seen.has(item.name.toLowerCase()) && item.name.toLowerCase().includes(term)) {
        results.push({
          name: item.name,
          muscleGroup: item.muscleGroup || 'Outros',
          category: item.category || 'weight',
          multiplier: item.multiplier
        });
      }
    });

    return results;
  }, [searchTerm, suggestions, userLibrary]);

  const handleSelect = (item: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => {
    triggerHaptic('light');
    playAudioCue('click');
    setSelectedEx(item);
  };

  const handleConfirm = () => {
    if (!selectedEx) return;
    triggerHaptic('success');
    playAudioCue('set_complete');
    onConfirmSwap(selectedEx);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[94vw] max-h-[85vh] flex flex-col p-5 sm:p-6 rounded-3xl bg-card border-border/70 shadow-2xl overflow-hidden">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground">
                Substituir Exercício
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium truncate">
                Aparelho ocupado? Troque <strong>{cleanCurrentName}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Campo de Busca */}
        <div className="relative my-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar alternativa ou outro aparelho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 pl-10 rounded-xl bg-background border-border/60 text-xs sm:text-sm font-medium"
          />
        </div>

        {/* Lista de Alternativas */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px] max-h-[320px]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
            <span>{searchTerm ? 'Resultados da busca' : `Alternativas para ${targetMuscle}`}</span>
            <span>{filteredList.length} opções</span>
          </div>

          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhum exercício alternativo encontrado para "{searchTerm}".
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = selectedEx?.name === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-foreground shadow-xs'
                      : 'bg-muted/20 border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <MuscleGroupIcon muscleGroup={item.muscleGroup} exerciseName={item.name} className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-xs sm:text-sm truncate text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <MuscleGroupBadge muscleGroup={item.muscleGroup} size="sm" />
                    {isSelected && (
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/30">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border-border/60 font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selectedEx}
            onClick={handleConfirm}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Substituir Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
