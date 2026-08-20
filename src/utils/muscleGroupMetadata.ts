import type { LucideIcon } from 'lucide-react';
import {
  Shield,
  Layers,
  Zap,
  Footprints,
  CircleDot,
  TrendingUp,
  Triangle,
  Flame,
  ArrowDown,
  Crosshair,
  Dumbbell
} from 'lucide-react';
import { type MuscleGroup, getExerciseInfo, normalizeExerciseName } from './exerciseDictionary';

export interface MuscleGroupMeta {
  group: MuscleGroup | 'Pernas';
  label: string;
  icon: LucideIcon;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  accentGlow: string;
}

export const MUSCLE_GROUP_METADATA: Record<string, MuscleGroupMeta> = {
  'Peito': {
    group: 'Peito',
    label: 'Peito',
    icon: Shield,
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    accentGlow: 'shadow-sky-500/10'
  },
  'Costas': {
    group: 'Costas',
    label: 'Costas',
    icon: Layers,
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    accentGlow: 'shadow-amber-500/10'
  },
  'Quadríceps': {
    group: 'Quadríceps',
    label: 'Quadríceps',
    icon: Zap,
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    accentGlow: 'shadow-emerald-500/10'
  },
  'Pernas': {
    group: 'Pernas',
    label: 'Pernas',
    icon: Zap,
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    accentGlow: 'shadow-emerald-500/10'
  },
  'Isquiotibiais': {
    group: 'Isquiotibiais',
    label: 'Isquiotibiais',
    icon: Footprints,
    textColor: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/25',
    accentGlow: 'shadow-teal-500/10'
  },
  'Glúteos': {
    group: 'Glúteos',
    label: 'Glúteos',
    icon: CircleDot,
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    accentGlow: 'shadow-rose-500/10'
  },
  'Panturrilhas': {
    group: 'Panturrilhas',
    label: 'Panturrilhas',
    icon: TrendingUp,
    textColor: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/20',
    badgeClass: 'bg-lime-500/10 text-lime-400 border-lime-500/25',
    accentGlow: 'shadow-lime-500/10'
  },
  'Ombros': {
    group: 'Ombros',
    label: 'Ombros',
    icon: Triangle,
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    accentGlow: 'shadow-purple-500/10'
  },
  'Bíceps': {
    group: 'Bíceps',
    label: 'Bíceps',
    icon: Flame,
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/25',
    accentGlow: 'shadow-red-500/10'
  },
  'Tríceps': {
    group: 'Tríceps',
    label: 'Tríceps',
    icon: ArrowDown,
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    accentGlow: 'shadow-orange-500/10'
  },
  'Core': {
    group: 'Core',
    label: 'Core',
    icon: Crosshair,
    textColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
    accentGlow: 'shadow-indigo-500/10'
  },
  'Outros': {
    group: 'Outros',
    label: 'Outros',
    icon: Dumbbell,
    textColor: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/20',
    badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
    accentGlow: 'shadow-zinc-500/10'
  }
};

const DEFAULT_META: MuscleGroupMeta = MUSCLE_GROUP_METADATA['Outros'];

/**
 * Normaliza e busca os metadados de grupo muscular.
 * Pode receber diretamente o nome do grupo ('Peito', 'costas') ou o nome do exercício ('Supino Reto').
 */
export function getMuscleGroupMeta(
  groupOrExerciseName?: string,
  fallbackMuscleGroup?: string
): MuscleGroupMeta {
  if (!groupOrExerciseName) {
    return DEFAULT_META;
  }

  const normalizedInput = normalizeExerciseName(groupOrExerciseName);

  // 1. Tenta correspondência direta com grupos musculares conhecidos
  for (const [groupName, meta] of Object.entries(MUSCLE_GROUP_METADATA)) {
    if (normalizeExerciseName(groupName) === normalizedInput) {
      return meta;
    }
  }

  // 2. Se for um nome de exercício ou grupo em formato livre, busca via getExerciseInfo
  const info = getExerciseInfo(groupOrExerciseName, fallbackMuscleGroup);
  if (info.muscleGroup && MUSCLE_GROUP_METADATA[info.muscleGroup]) {
    return MUSCLE_GROUP_METADATA[info.muscleGroup];
  }

  return DEFAULT_META;
}
