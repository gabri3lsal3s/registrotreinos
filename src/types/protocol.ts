import type { Exercise } from './workout';

export interface Protocol {
  id: string; // UUID
  userId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  daysOfWeek: string[];
  isSynced?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProtocolWithExercises extends Protocol {
  exercises: Exercise[];
}

export interface ProtocolDay {
  day: string;
  label: string;
  shortLabel: string;
}
