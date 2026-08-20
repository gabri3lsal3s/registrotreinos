import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Dumbbell, Plus } from 'lucide-react';
import { getExerciseInfo } from '../../utils/exerciseDictionary';
import type { ExerciseCategory } from '../../types';

interface ExercisePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => void;
}

const MUSCLE_GROUPS = [
  'Todos',
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Core'
];

const POPULAR_EXERCISES = [
  { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'weight' as ExerciseCategory },
  { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'weight' as ExerciseCategory },
  { name: 'Crucifixo na Polia', muscleGroup: 'Peito', category: 'weight' as ExerciseCategory },
  { name: 'Puxada Frontal', muscleGroup: 'Costas', category: 'weight' as ExerciseCategory },
  { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'weight' as ExerciseCategory },
  { name: 'Remada Baixa Triângulo', muscleGroup: 'Costas', category: 'weight' as ExerciseCategory },
  { name: 'Agachamento Livre com Barra', muscleGroup: 'Pernas', category: 'weight' as ExerciseCategory },
  { name: 'Leg Press 45°', muscleGroup: 'Pernas', category: 'weight' as ExerciseCategory },
  { name: 'Cadeira Extensora', muscleGroup: 'Pernas', category: 'weight' as ExerciseCategory },
  { name: 'Mesa Flexora', muscleGroup: 'Pernas', category: 'weight' as ExerciseCategory },
  { name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', category: 'weight' as ExerciseCategory },
  { name: 'Elevação Lateral na Polia', muscleGroup: 'Ombros', category: 'weight' as ExerciseCategory },
  { name: 'Rosca Direta com Barra W', muscleGroup: 'Bíceps', category: 'weight' as ExerciseCategory },
  { name: 'Rosca Martelo com Halteres', muscleGroup: 'Bíceps', category: 'weight' as ExerciseCategory },
  { name: 'Tríceps Corda na Polia', muscleGroup: 'Tríceps', category: 'weight' as ExerciseCategory },
  { name: 'Tríceps Testa com Barra W', muscleGroup: 'Tríceps', category: 'weight' as ExerciseCategory },
  { name: 'Prancha Isométrica', muscleGroup: 'Core', category: 'time' as ExerciseCategory },
  { name: 'Abdominal Supra na Polia', muscleGroup: 'Core', category: 'weight' as ExerciseCategory }
];

export function ExercisePickerModal({
  isOpen,
  onClose,
  onSelect
}: ExercisePickerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');

  const filteredExercises = POPULAR_EXERCISES.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const handleSelectPredefined = (ex: typeof POPULAR_EXERCISES[0]) => {
    const info = getExerciseInfo(ex.name);
    onSelect({
      name: info.canonicalName,
      muscleGroup: info.muscleGroup || ex.muscleGroup,
      category: (info.category || ex.category) as ExerciseCategory,
      multiplier: info.multiplier
    });
    onClose();
  };

  const handleAddCustom = () => {
    if (!search.trim()) return;
    const info = getExerciseInfo(search.trim());
    onSelect({
      name: info.canonicalName,
      muscleGroup: info.muscleGroup || (selectedMuscle !== 'Todos' ? selectedMuscle : 'Outros'),
      category: (info.category || 'weight') as ExerciseCategory,
      multiplier: info.multiplier
    });
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Adicionar Exercício ao Treino
          </DialogTitle>
        </DialogHeader>

        {/* Busca */}
        <div className="relative mt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar ou digitar nome do exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-background border-border/50 font-medium"
            autoFocus
          />
        </div>

        {/* Filtros por Grupo Muscular */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
          {MUSCLE_GROUPS.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscle(muscle)}
              className={`h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedMuscle === muscle
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>

        {/* Lista de Exercícios */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2 max-h-[45vh]">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={() => handleSelectPredefined(ex)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 hover:border-primary/30 transition-all text-left group"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {ex.name}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {ex.muscleGroup}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum exercício pré-definido encontrado para "{search}".
              </p>
              {search.trim() && (
                <Button
                  type="button"
                  onClick={handleAddCustom}
                  className="rounded-xl h-11 px-4 font-bold text-xs uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar "{search.trim()}"
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
