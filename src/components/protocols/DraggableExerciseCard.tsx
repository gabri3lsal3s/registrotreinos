import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { GripVertical, Minus, Plus, Trash2, Pin } from 'lucide-react';
import type { ExerciseCategory } from '../../types';
import { parseLocaleNumber } from '../../utils/workoutMath';

export interface BuilderExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  category: ExerciseCategory;
  multiplier?: number;
  sets: number;
  reps: number;
  baseline: string | number;
  pinnedNotes?: string;
}

interface DraggableExerciseCardProps { 
  ex: BuilderExerciseItem; 
  idx: number; 
  day: string; 
  onUpdate: (day: string, idx: number, field: string, value: string | number | boolean) => void;
  onRemove: (day: string, idx: number) => void;
}

export function DraggableExerciseCard({ 
  ex, 
  idx, 
  day, 
  onUpdate,
  onRemove
}: DraggableExerciseCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: ex.id,
    data: {
      type: 'Exercise',
      day,
      exercise: ex
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : 'auto',
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card/80 border rounded-2xl p-3.5 group transition-all duration-200 ${
          isDragging 
            ? 'border-primary shadow-xl ring-2 ring-primary/20 scale-[1.02]' 
            : 'border-border/50 hover:border-border/80 hover:bg-card'
        }`}
      >
        {/* Alça de Arraste e Nome do Exercício */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-2 -ml-1.5 rounded-xl hover:bg-muted/60 text-muted-foreground/40 hover:text-primary transition-colors touch-none"
            title="Arraste para reordenar"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div className="flex flex-col flex-1 min-w-0 pr-2">
            <Input
              placeholder="Nome do Exercício"
              className="w-full bg-transparent border-none font-bold text-sm sm:text-base text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 p-0 h-auto"
              value={ex.name}
              onChange={(e) => onUpdate(day, idx, 'name', e.target.value)}
            />
            
            {/* Tags e Seletores de Categoria / Grupo Muscular */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Select 
                value={ex.category || 'weight'} 
                onValueChange={(val: ExerciseCategory) => onUpdate(day, idx, 'category', val)}
              >
                <SelectTrigger className="h-7 text-[10px] w-auto border-none bg-muted/60 hover:bg-muted font-bold text-foreground rounded-lg px-2.5 shadow-none">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="text-xs font-bold">
                  <SelectItem value="weight">Carga (Peso)</SelectItem>
                  <SelectItem value="bodyweight">Peso Corporal</SelectItem>
                  <SelectItem value="time">Tempo (Timer)</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={ex.muscleGroup || 'Outros'} 
                onValueChange={(val: string) => onUpdate(day, idx, 'muscleGroup', val)}
              >
                <SelectTrigger className="h-7 text-xs w-auto border-none bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg px-2.5 shadow-none">
                  <SelectValue placeholder="Músculo" />
                </SelectTrigger>
                <SelectContent className="text-xs font-bold">
                  <SelectItem value="Peito">Peito</SelectItem>
                  <SelectItem value="Costas">Costas</SelectItem>
                  <SelectItem value="Pernas">Pernas</SelectItem>
                  <SelectItem value="Ombros">Ombros</SelectItem>
                  <SelectItem value="Bíceps">Bíceps</SelectItem>
                  <SelectItem value="Tríceps">Tríceps</SelectItem>
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas Fixas / Regulagem de Aparelho */}
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <Pin className="w-3 h-3 text-muted-foreground/60 rotate-45 shrink-0" />
              <Input
                placeholder="Regulagem / notas (ex: Banco no furo 4)"
                className="h-6 text-xs text-muted-foreground placeholder:text-muted-foreground/40 bg-transparent border-none p-0 focus-visible:ring-0"
                value={ex.pinnedNotes || ''}
                onChange={(e) => onUpdate(day, idx, 'pinnedNotes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Configuração de Séries, Repetições e Baseline */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30 w-full sm:w-auto">
          {/* Séries x Reps */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {ex.category === 'time' ? 'Tempo' : 'Séries × Reps'}
            </span>
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => onUpdate(day, idx, 'sets', Math.max(1, (ex.sets || 1) - 1))}
                disabled={ex.sets <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              
              <Input
                type="number"
                min={1}
                max={99}
                className="w-8 h-7 text-xs text-center font-bold px-0 py-0 border-none bg-transparent shadow-none focus-visible:ring-0"
                value={ex.sets}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onUpdate(day, idx, 'sets', parseLocaleNumber(e.target.value, 1))}
              />
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => onUpdate(day, idx, 'sets', (ex.sets || 0) + 1)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>

              <span className="text-xs font-bold text-muted-foreground/60 px-0.5">×</span>

              <Input
                type="number"
                min={1}
                max={999}
                className={`${ex.category === 'time' ? 'w-10' : 'w-8'} h-7 text-xs text-center font-bold px-0 py-0 border-none bg-transparent shadow-none focus-visible:ring-0`}
                value={ex.reps}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onUpdate(day, idx, 'reps', parseLocaleNumber(e.target.value, 10))}
              />
              {ex.category === 'time' && <span className="text-xs font-bold text-muted-foreground pr-1">s</span>}
            </div>
          </div>

          {/* Carga Inicial (Baseline) */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {ex.category === 'weight' ? 'Carga Base' : '+ Carga'}
            </span>
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl px-2 h-9 border border-border/40 w-24">
              <Input
                type="text"
                inputMode="decimal"
                className="w-full h-full text-xs text-center font-bold px-0 py-0 border-none bg-transparent shadow-none focus-visible:ring-0"
                value={ex.baseline}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onUpdate(day, idx, 'baseline', e.target.value)}
                placeholder="0"
              />
              <span className="text-[10px] font-bold text-muted-foreground/70">KG</span>
            </div>
          </div>

          {/* Botão de Excluir */}
          <div className="flex items-center self-end sm:self-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-9 w-9 rounded-xl text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
              title="Remover exercício"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover exercício do treino?"
        description={`Deseja remover "${ex.name || 'este exercício'}" do dia ${day}?`}
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={() => onRemove(day, idx)}
      />
    </>
  );
}
