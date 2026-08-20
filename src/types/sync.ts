export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  error?: string | null;
}

export type SyncableEntity = 'protocols' | 'exercises' | 'workouts' | 'workout_sets' | 'body_weights';

export interface SyncPayload<T = Record<string, unknown>> {
  table: SyncableEntity;
  action: 'insert' | 'update' | 'delete';
  data: T;
}

export interface PendingDeletion {
  id: string;
  userId: string;
  table: SyncableEntity;
  recordId: string;
  timestamp: number;
}

