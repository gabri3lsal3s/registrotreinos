export type ExerciseCategory = 'weight' | 'bodyweight' | 'time';

export interface Exercise {
  id: string;
  userId?: string;
  protocolId: string;
  name: string;
  muscleGroup?: string;
  category?: ExerciseCategory;
  multiplier?: number; // Fator multiplicador base K para calistenia/tempo
  order: number;
  sets?: number;
  reps?: number;
  dayOfWeek?: string;
  lastWeight?: number;
  lastReps?: number;
  pinnedNotes?: string; // Notas fixas de regulagem de aparelho, pegada, etc.
  supersetGroupId?: string; // Agrupamento em Bi-set / Super-série (ex: 'A', 'B')
  isSynced?: boolean;
  isArchived?: boolean;
  isSessionOnly?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export type WorkoutStatus = 'active' | 'completed' | 'cancelled';

export interface Workout {
  id: string;
  userId: string;
  protocolId: string;
  date: number;
  status: WorkoutStatus;
  finishedAt?: number;
  mood?: number; // 1-5
  sleepQuality?: number; // 1-5
  stressLevel?: number; // 1-5
  recovery?: string;
  notes?: string;
  isSynced?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export type WorkoutSetType = 'normal' | 'warmup' | 'feeder' | 'top' | 'drop';

export interface WorkoutSet {
  id: string;
  userId?: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  type?: WorkoutSetType;
  notes?: string;
  timeInSeconds?: number;
  rpe?: number;
  completed: boolean;
  timestamp: number;
  isSynced?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface BodyWeight {
  id: string;
  userId: string;
  weight: number;
  date: number;
  isSynced?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface UniqueExercise {
  name: string;
  muscleGroup?: string;
  category?: ExerciseCategory;
  multiplier?: number;
}
