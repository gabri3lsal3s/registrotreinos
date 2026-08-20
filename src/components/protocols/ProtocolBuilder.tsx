import { useState } from 'react';
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  rectIntersection, 
  type DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  CalendarDays,
  Dumbbell
} from 'lucide-react';
import { WEEK_DAYS } from '../../utils/constants';
import { DraggableExerciseCard, type BuilderExerciseItem } from './DraggableExerciseCard';
import { ExercisePickerModal } from './ExercisePickerModal';
import type { ExerciseCategory } from '../../types';

interface ProtocolBuilderProps {
  protocolName: string;
  onChangeName: (name: string) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  activeDays: string[];
  onToggleDay: (dayKey: string) => void;
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
  exercisesByDay: Record<string, BuilderExerciseItem[]>;
  onUpdateExercise: (day: string, idx: number, field: string, value: string | number | boolean) => void;
  onRemoveExercise: (day: string, idx: number) => void;
  onAddExercise: (day: string, exercise: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => void;
  onReorderExercises: (day: string, newExercises: BuilderExerciseItem[]) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ProtocolBuilder({
  protocolName,
  onChangeName,
  isEnabled,
  onToggleEnabled,
  activeDays,
  onToggleDay,
  selectedDay,
  onSelectDay,
  exercisesByDay,
  onUpdateExercise,
  onRemoveExercise,
  onAddExercise,
  onReorderExercises,
  onSave,
  onCancel,
  isSaving = false
}: ProtocolBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const currentDayExercises = exercisesByDay[selectedDay] || [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = currentDayExercises.findIndex(item => item.id === active.id);
    const newIndex = currentDayExercises.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(currentDayExercises, oldIndex, newIndex);
      onReorderExercises(selectedDay, reordered);
    }
  };

  const handleSelectFromPicker = (ex: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }) => {
    onAddExercise(selectedDay, ex);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header do Construtor */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase text-foreground tracking-tight leading-tight truncate">
              Construtor de Treino
            </h2>
            <p className="text-xs text-muted-foreground font-medium truncate">
              Configure a divisão semanal e exercícios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
            className="h-10 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-muted-foreground"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving || !protocolName.trim()}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl font-black text-xs uppercase tracking-wider bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center gap-2 active:scale-95"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Protocolo</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Card de Configurações Básicas do Protocolo */}
      <Card className="border-border/60 bg-card rounded-2xl shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Nome do Protocolo
              </label>
              <Input
                type="text"
                placeholder="Ex: ABC Hipertrofia 2x, Upper / Lower..."
                value={protocolName}
                onChange={(e) => onChangeName(e.target.value)}
                className="h-12 rounded-xl bg-background border-border/50 text-base font-bold text-foreground"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 sm:pt-4 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-xs font-bold text-foreground block">
                  Protocolo Ativo
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Visível no Dashboard
                </span>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggleEnabled}
              />
            </div>
          </div>

          {/* Seletor de Dias de Treino da Semana */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <CalendarDays className="w-3.5 h-3.5" />
              Dias da Semana com Treino
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((day) => {
                const isActive = activeDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onToggleDay(day.key)}
                    className={`h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/40 font-black'
                        : 'bg-muted/30 hover:bg-muted text-muted-foreground/60 border border-transparent'
                    }`}
                  >
                    <span>{day.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Dia Ativo no Editor */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {WEEK_DAYS.filter(d => activeDays.includes(d.key)).map((day) => {
          const isSelected = selectedDay === day.key;
          const count = (exercisesByDay[day.key] || []).length;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDay(day.key)}
              className={`min-h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border border-border/40'
              }`}
            >
              <span>{day.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                isSelected ? 'bg-black/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de Exercícios com Drag-and-Drop */}
      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentDayExercises.map(ex => ex.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {currentDayExercises.map((ex, idx) => (
                <DraggableExerciseCard
                  key={ex.id}
                  ex={ex}
                  idx={idx}
                  day={selectedDay}
                  onUpdate={onUpdateExercise}
                  onRemove={onRemoveExercise}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {currentDayExercises.length === 0 && (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto">
              <Dumbbell className="w-6 h-6" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Nenhum exercício cadastrado para este dia.
            </p>
          </div>
        )}

        {/* Botão de Adicionar Exercício */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          className="w-full h-12 rounded-2xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar Exercício ao Dia
        </Button>
      </div>

      {/* Modal de Escolha de Exercício */}
      <ExercisePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectFromPicker}
      />
    </div>
  );
}
