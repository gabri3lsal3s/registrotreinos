import React from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle } from 'lucide-react';
import type { ExerciseCategory, WorkoutSetType } from '../../types';
import { triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';

export interface SetInputData {
  weight: string;
  reps: string;
  type?: WorkoutSetType;
  notes?: string;
}

interface WorkoutSetRowProps {
  setIdx: number;
  setData: SetInputData;
  isCompleted: boolean;
  category?: ExerciseCategory;
  onToggleSet: (setIdx: number) => void;
  onUpdateSetData: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  onUpdateSetType?: (setIdx: number, type: WorkoutSetType) => void;
}

const SET_TYPES: { type: WorkoutSetType; label: string; bg: string; text: string; name: string }[] = [
  { type: 'normal', label: 'N', bg: 'bg-muted/60', text: 'text-muted-foreground', name: 'Normal' },
  { type: 'warmup', label: 'W', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-500', name: 'Aquecimento' },
  { type: 'feeder', label: 'F', bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-500', name: 'Preparatória' },
  { type: 'top', label: 'T', bg: 'bg-purple-500/20 border-purple-500/40', text: 'text-purple-500', name: 'Top Set' },
  { type: 'drop', label: 'D', bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-500', name: 'Drop Set' }
];

export const WorkoutSetRow: React.FC<WorkoutSetRowProps> = ({
  setIdx,
  setData,
  isCompleted,
  category,
  onToggleSet,
  onUpdateSetData,
  onUpdateSetType
}) => {
  const currentSetType = setData.type || 'normal';

  const handleAdjustWeight = (delta: number) => {
    triggerHaptic('light');
    if (delta > 0) {
      playAudioCue('increment');
    } else {
      playAudioCue('decrement');
    }
    const current = parseFloat(setData.weight || '0') || 0;
    const next = Math.max(0, current + delta);
    onUpdateSetData(setIdx, 'weight', String(next));
  };

  const handleAdjustReps = (delta: number) => {
    triggerHaptic('light');
    if (delta > 0) {
      playAudioCue('increment');
    } else {
      playAudioCue('decrement');
    }
    const current = parseInt(setData.reps || '0', 10) || 0;
    const next = Math.max(0, current + delta);
    onUpdateSetData(setIdx, 'reps', String(next));
  };

  // Alterna ciclicamente entre os tipos de série ao tocar no badge
  const handleCycleSetType = () => {
    if (!onUpdateSetType) return;
    triggerHaptic('medium');
    playAudioCue('click');
    const currentIndex = SET_TYPES.findIndex(st => st.type === currentSetType);
    const nextType = SET_TYPES[(currentIndex + 1) % SET_TYPES.length].type;
    onUpdateSetType(setIdx, nextType);
  };

  const handleToggleClick = () => {
    if (!isCompleted) {
      triggerHaptic('success');
      playAudioCue('set_complete');
    } else {
      triggerHaptic('light');
      playAudioCue('set_uncomplete');
    }
    onToggleSet(setIdx);
  };

  const currentTypeConfig = SET_TYPES.find(st => st.type === currentSetType) || SET_TYPES[0];

  return (
    <motion.div
      layout
      transition={{ duration: 0.15 }}
      className={`flex items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl border transition-colors duration-200 ${
        isCompleted
          ? 'bg-primary/5 border-primary/30 text-foreground'
          : 'bg-card border-border/40 hover:border-border/70'
      }`}
    >
      {/* 1. Número da Série & Badge Clicável de Tipo */}
      <div className="flex flex-col items-center justify-center shrink-0 w-10 sm:w-12">
        <span className="font-mono font-bold text-xs text-foreground leading-none mb-1">
          #{setIdx + 1}
        </span>
        {onUpdateSetType && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={handleCycleSetType}
            className={`w-6 h-5 rounded-md text-[10px] font-black uppercase flex items-center justify-center border transition-all ${currentTypeConfig.bg} ${currentTypeConfig.text}`}
            title={`Tipo: ${currentTypeConfig.name} (Toque para alternar)`}
          >
            {currentTypeConfig.label}
          </motion.button>
        )}
      </div>

      {/* 2. Campo de Carga (kg) + Micro-Incrementos */}
      <div className="flex-1 min-w-0 max-w-[130px] flex flex-col items-center">
        <Input
          type="text"
          inputMode="decimal"
          value={setData.weight}
          onChange={(e) => onUpdateSetData(setIdx, 'weight', e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          className="h-10 sm:h-11 w-full text-center font-bold text-sm sm:text-base rounded-xl bg-background border-border/60 focus-visible:ring-primary select-all px-1 transition-all"
        />
        <div className="flex items-center justify-center gap-1 mt-1 w-full">
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={() => handleAdjustWeight(-1)}
            className="flex-1 h-5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground font-bold transition-colors"
            title="-1kg"
          >
            -1
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={() => handleAdjustWeight(1)}
            className="flex-1 h-5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground font-bold transition-colors"
            title="+1kg"
          >
            +1
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={() => handleAdjustWeight(2)}
            className="flex-1 h-5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground font-bold transition-colors"
            title="+2kg"
          >
            +2
          </motion.button>
        </div>
      </div>

      {/* 3. Campo de Repetições / Tempo + Micro-Incrementos */}
      <div className="flex-1 min-w-0 max-w-[110px] flex flex-col items-center">
        <Input
          type="text"
          inputMode="numeric"
          value={setData.reps}
          onChange={(e) => onUpdateSetData(setIdx, 'reps', e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder={category === 'time' ? '0s' : '0'}
          className="h-10 sm:h-11 w-full text-center font-bold text-sm sm:text-base rounded-xl bg-background border-border/60 focus-visible:ring-primary select-all px-1 transition-all"
        />
        <div className="flex items-center justify-center gap-1 mt-1 w-full">
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={() => handleAdjustReps(-1)}
            className="flex-1 h-5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground font-bold transition-colors"
            title="-1 rep"
          >
            -1
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={() => handleAdjustReps(1)}
            className="flex-1 h-5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground font-bold transition-colors"
            title="+1 rep"
          >
            +1
          </motion.button>
        </div>
      </div>

      {/* 4. Botão de Conclusão da Série com Spring Bounce */}
      <div className="flex items-center justify-center shrink-0 pl-0.5">
        <motion.button
          whileTap={{ scale: 0.78 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          type="button"
          onClick={handleToggleClick}
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center transition-colors duration-200 ${
            isCompleted
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
              : 'bg-muted/40 text-muted-foreground/50 hover:text-foreground hover:bg-muted/80'
          }`}
          title={isCompleted ? 'Marcar como não concluída' : 'Concluir série'}
        >
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </motion.div>
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
