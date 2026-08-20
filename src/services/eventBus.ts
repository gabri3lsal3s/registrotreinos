// ==============================================================================
// REGISTRO DE TREINOS - BARRAMENTO REATIVO CENTRALIZADO DE EVENTOS (EVENT BUS)
// ==============================================================================

export type SyncEventType = 'DATA_MUTATED' | 'SYNC_COMPLETED' | 'ANALYSIS_INVALIDATED';

export interface DataMutatedPayload {
  table: 'protocols' | 'exercises' | 'workouts' | 'workout_sets' | 'body_weights';
  action: 'create' | 'update' | 'delete';
  recordId?: string;
}

type EventCallback<T = unknown> = (payload: T) => void;

class SyncEventBus {
  private listeners: Map<SyncEventType, Set<EventCallback<unknown>>> = new Map();

  constructor() {
    this.listeners.set('DATA_MUTATED', new Set());
    this.listeners.set('SYNC_COMPLETED', new Set());
    this.listeners.set('ANALYSIS_INVALIDATED', new Set());
  }

  public subscribe<T = unknown>(event: SyncEventType, callback: EventCallback<T>): () => void {
    const set = this.listeners.get(event);
    if (set) {
      set.add(callback as EventCallback<unknown>);
    }
    return () => {
      const currentSet = this.listeners.get(event);
      if (currentSet) {
        currentSet.delete(callback as EventCallback<unknown>);
      }
    };
  }

  public emitDataMutated(payload: DataMutatedPayload): void {
    const set = this.listeners.get('DATA_MUTATED');
    if (set) {
      set.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error('[EventBus] Erro ao processar listener DATA_MUTATED:', err);
        }
      });
    }
    // Dispara também para o window para retrocompatibilidade
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workout-data-mutated', { detail: payload }));
      window.dispatchEvent(new Event('refresh-analysis'));
      window.dispatchEvent(new Event('refresh-workout-data'));
    }
  }

  public emitSyncCompleted(): void {
    const set = this.listeners.get('SYNC_COMPLETED');
    if (set) {
      set.forEach(cb => {
        try {
          cb({ timestamp: Date.now() });
        } catch (err) {
          console.error('[EventBus] Erro ao processar listener SYNC_COMPLETED:', err);
        }
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refresh-analysis'));
      window.dispatchEvent(new Event('refresh-workout-data'));
    }
  }

  public emitAnalysisInvalidated(): void {
    const set = this.listeners.get('ANALYSIS_INVALIDATED');
    if (set) {
      set.forEach(cb => {
        try {
          cb({ timestamp: Date.now() });
        } catch (err) {
          console.error('[EventBus] Erro ao processar listener ANALYSIS_INVALIDATED:', err);
        }
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refresh-analysis'));
    }
  }
}

export const syncEventBus = new SyncEventBus();
