import { db } from './workoutDB';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import { syncEventBus } from './eventBus';
import type { Protocol, Exercise, Workout, WorkoutSet, BodyWeight } from '../types';

// ============================================================================
// HELPERS DE FORMATAÇÃO E SANITIZAÇÃO DE DADOS
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: unknown): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export function toSafeISOString(val: unknown): string {
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } else if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export function toNullableSafeISOString(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    if (val <= 0) return null;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } else if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

// ============================================================================
// RETENTATIVA COM EXPONENTIAL BACKOFF & JITTER
// ============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 800
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      const jitter = Math.random() * 200;
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + jitter, 5000);
      console.warn(`[Sync] Falha transitória (tentativa ${attempt}/${maxRetries}), aguardando ${Math.round(delay)}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// ============================================================================
// SANITIZADORES ESTRITOS (WHITELISTING POSTGRESQL + TOMBSTONES)
// ============================================================================

export function sanitizeProtocolForRemote(p: Protocol, userId: string): Record<string, unknown> {
  return {
    id: p.id,
    user_id: userId,
    name: (p.name || 'Protocolo Sem Nome').trim(),
    description: p.description || null,
    is_enabled: p.isEnabled !== undefined ? Boolean(p.isEnabled) : true,
    days_of_week: Array.isArray(p.daysOfWeek) ? p.daysOfWeek : [],
    is_archived: Boolean(p.isArchived),
    is_deleted: Boolean(p.isDeleted),
    deleted_at: toNullableSafeISOString(p.deletedAt),
    created_at: toSafeISOString(p.createdAt),
    updated_at: toSafeISOString(p.updatedAt || Date.now())
  };
}

export function sanitizeExerciseForRemote(ex: Exercise, userId: string): Record<string, unknown> {
  const day = ex.dayOfWeek || 'Segunda';
  return {
    id: ex.id,
    user_id: userId,
    protocol_id: ex.protocolId,
    name: (ex.name || 'Exercício').trim(),
    order: typeof ex.order === 'number' && !isNaN(ex.order) ? ex.order : 0,
    muscle_group: ex.muscleGroup || 'Outros',
    category: ex.category || 'weight',
    multiplier: typeof ex.multiplier === 'number' && !isNaN(ex.multiplier) ? ex.multiplier : 1.0,
    day_of_week: day,
    day: day,
    sets: typeof ex.sets === 'number' && !isNaN(ex.sets) ? ex.sets : 3,
    reps: typeof ex.reps === 'number' && !isNaN(ex.reps) ? ex.reps : 10,
    last_weight: typeof ex.lastWeight === 'number' && !isNaN(ex.lastWeight) ? ex.lastWeight : 0,
    last_reps: typeof ex.lastReps === 'number' && !isNaN(ex.lastReps) ? ex.lastReps : 0,
    is_session_only: Boolean(ex.isSessionOnly),
    is_archived: Boolean(ex.isArchived),
    is_deleted: Boolean(ex.isDeleted),
    deleted_at: toNullableSafeISOString(ex.deletedAt),
    created_at: toSafeISOString(ex.createdAt || Date.now()),
    updated_at: toSafeISOString(ex.updatedAt || Date.now())
  };
}

export function sanitizeWorkoutForRemote(
  w: Workout,
  userId: string
): Record<string, unknown> {
  let moodVal: string | number | null = null;
  const rawMood = w.mood as unknown;
  if (typeof rawMood === 'number' && !isNaN(rawMood)) moodVal = rawMood;
  else if (typeof rawMood === 'string' && (rawMood as string).trim().length > 0) {
    const parsed = parseInt(rawMood as string, 10);
    moodVal = isNaN(parsed) ? rawMood : parsed;
  }

  const isoDate = toSafeISOString(w.date);

  const payload: Record<string, unknown> = {
    id: w.id,
    user_id: userId,
    date: isoDate,
    date_key: isoDate.slice(0, 10),
    status: w.status || 'completed',
    is_deleted: Boolean(w.isDeleted),
    deleted_at: toNullableSafeISOString(w.deletedAt),
    created_at: toSafeISOString(w.createdAt || w.date),
    updated_at: toSafeISOString(w.updatedAt || w.finishedAt || w.date)
  };

  if (w.protocolId && isValidUUID(w.protocolId)) payload.protocol_id = w.protocolId;
  if (w.finishedAt) payload.finished_at = toNullableSafeISOString(w.finishedAt);
  if (moodVal !== null) payload.mood = moodVal;
  if (typeof w.sleepQuality === 'number' && !isNaN(w.sleepQuality)) payload.sleep_quality = w.sleepQuality;
  if (typeof w.stressLevel === 'number' && !isNaN(w.stressLevel)) payload.stress_level = w.stressLevel;
  if (w.recovery) payload.recovery = w.recovery;
  if (w.notes) payload.notes = w.notes;

  return payload;
}

export function sanitizeWorkoutSetForRemote(
  set: WorkoutSet,
  userId: string
): Record<string, unknown> {
  const isoTimestamp = toSafeISOString(set.timestamp);

  const payload: Record<string, unknown> = {
    id: set.id,
    user_id: userId,
    workout_id: set.workoutId,
    exercise_id: set.exerciseId && isValidUUID(set.exerciseId) ? set.exerciseId : null,
    date_key: isoTimestamp.slice(0, 10),
    set_index: typeof set.setIndex === 'number' && !isNaN(set.setIndex) ? set.setIndex : 0,
    weight: typeof set.weight === 'number' && !isNaN(set.weight) ? set.weight : 0,
    reps: typeof set.reps === 'number' && !isNaN(set.reps) ? set.reps : 0,
    completed: set.completed !== undefined ? Boolean(set.completed) : true,
    timestamp: isoTimestamp,
    is_deleted: Boolean(set.isDeleted),
    deleted_at: toNullableSafeISOString(set.deletedAt),
    created_at: toSafeISOString(set.createdAt || set.timestamp),
    updated_at: toSafeISOString(set.updatedAt || set.timestamp)
  };

  if (set.type) payload.type = set.type;
  if (set.notes) payload.notes = set.notes;
  if (typeof set.timeInSeconds === 'number' && !isNaN(set.timeInSeconds)) payload.time_in_seconds = set.timeInSeconds;
  if (typeof set.rpe === 'number' && !isNaN(set.rpe)) payload.rpe = set.rpe;

  return payload;
}

export function sanitizeBodyWeightForRemote(bw: BodyWeight, userId: string): Record<string, unknown> {
  const isoDate = toSafeISOString(bw.date);
  return {
    id: bw.id,
    user_id: userId,
    weight: typeof bw.weight === 'number' && !isNaN(bw.weight) ? bw.weight : 70,
    date: isoDate,
    date_key: isoDate.slice(0, 10),
    is_deleted: Boolean(bw.isDeleted),
    deleted_at: toNullableSafeISOString(bw.deletedAt),
    created_at: toSafeISOString(bw.createdAt || bw.date),
    updated_at: toSafeISOString(bw.updatedAt || bw.date)
  };
}

// ============================================================================
// UPSERT EM CHUNKS COM RETENTATIVAS
// ============================================================================

async function batchUpsert(
  table: string, 
  items: Record<string, unknown>[], 
  chunkSize = 100
): Promise<void> {
  if (items.length === 0) return;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    await withRetry(async () => {
      const res = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
      if (res.error) {
        throw new Error(`[Sync] Falha no upsert em ${table}: ${res.error.message}`);
      }
    });
  }
}

// ============================================================================
// CONVERSOR CAMELCASE (SUPABASE -> DEXIE)
// ============================================================================

const toCamel = <T = Record<string, unknown>>(obj: Record<string, unknown>): T => {
  const mapping: Record<string, string> = {
    user_id: 'userId',
    protocol_id: 'protocolId',
    exercise_id: 'exerciseId',
    workout_id: 'workoutId',
    set_index: 'setIndex',
    created_at: 'createdAt',
    finished_at: 'finishedAt',
    muscle_group: 'muscleGroup',
    last_weight: 'lastWeight',
    last_reps: 'lastReps',
    sleep_quality: 'sleepQuality',
    stress_level: 'stressLevel',
    timestamp: 'timestamp',
    date: 'date',
    is_enabled: 'isEnabled',
    days_of_week: 'daysOfWeek',
    updated_at: 'updatedAt',
    day_of_week: 'dayOfWeek',
    day: 'dayOfWeek',
    is_archived: 'isArchived',
    is_deleted: 'isDeleted',
    deleted_at: 'deletedAt',
    category: 'category',
    multiplier: 'multiplier',
    is_session_only: 'isSessionOnly',
    time_in_seconds: 'timeInSeconds',
    date_key: 'dateKey'
  };
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    let value = obj[key];
    // Converter ISO string para timestamps numéricos no Dexie
    if (['created_at', 'finished_at', 'timestamp', 'date', 'updated_at', 'deleted_at'].includes(key) && typeof value === 'string') {
      const parsed = new Date(value).getTime();
      if (!isNaN(parsed)) value = parsed;
    }
    newObj[mapping[key] || key] = value;
  }
  return newObj as T;
};

// ============================================================================
// ESTADO DE SINCRONIZAÇÃO & CONTROLE DE CONCORRÊNCIA
// ============================================================================

let isSyncing = false;

export const setSyncStatus = (status: 'pending' | 'syncing' | 'synced' | 'error') => {
  useAuthStore.getState().setSyncStatus(status);
};

// ============================================================================
// PUSH PIPELINE (OUTBOX PATTERN TOPOLÓGICO)
// ============================================================================

/**
 * Envia todas as alterações pendentes locais (isSynced === false) para o Supabase
 * em ordem topológica garantida: protocols -> exercises -> workouts -> workout_sets -> body_weights.
 */
export async function syncData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    // 1. Coleta itens locais não sincronizados
    const unsyncedProtocols = await db.protocols
      .where('userId')
      .equals(user.id)
      .and(p => !p.isSynced)
      .toArray();

    const unsyncedWorkouts = await db.workouts
      .where('userId')
      .equals(user.id)
      .and(w => !w.isSynced)
      .toArray();

    const unsyncedSets = await db.workoutSets
      .filter(s => (s.userId === user.id || !s.userId) && !s.isSynced)
      .toArray();

    const unsyncedExercises = await db.exercises
      .filter(ex => (ex.userId === user.id || !ex.userId) && !ex.isSynced)
      .toArray();

    const unsyncedWeights = await db.bodyWeights
      .where('userId')
      .equals(user.id)
      .and(b => !b.isSynced)
      .toArray();

    if (
      unsyncedProtocols.length === 0 &&
      unsyncedExercises.length === 0 &&
      unsyncedWorkouts.length === 0 &&
      unsyncedSets.length === 0 &&
      unsyncedWeights.length === 0
    ) {
      setSyncStatus('synced');
      return { success: true };
    }

    // 2. Garantir integridade topológica: incluir exercícios pai referenciados por séries não sincronizadas
    const referencedExerciseIds = new Set(unsyncedSets.map(s => s.exerciseId).filter(Boolean));
    const parentExercisesToSend = await db.exercises.where('id').anyOf(Array.from(referencedExerciseIds)).toArray();
    const exercisesMap = new Map<string, Exercise>();
    for (const ex of [...unsyncedExercises, ...parentExercisesToSend]) {
      exercisesMap.set(ex.id, ex);
    }
    const finalExercises = Array.from(exercisesMap.values());

    // 3. Garantir integridade topológica: incluir protocolos pai referenciados por treinos ou exercícios
    const referencedProtocolIds = new Set([
      ...finalExercises.map(e => e.protocolId).filter(Boolean),
      ...unsyncedWorkouts.map(w => w.protocolId).filter(Boolean)
    ]);
    const parentProtocolsToSend = await db.protocols.where('id').anyOf(Array.from(referencedProtocolIds)).toArray();
    const protocolsMap = new Map<string, Protocol>();
    for (const p of [...unsyncedProtocols, ...parentProtocolsToSend]) {
      protocolsMap.set(p.id, p);
    }
    const finalProtocols = Array.from(protocolsMap.values());

    // 4. Executar Push Topológico Sequencial
    // Passo 1: Protocols
    if (finalProtocols.length > 0) {
      const payload = finalProtocols.map(p => sanitizeProtocolForRemote(p, user.id));
      await batchUpsert('protocols', payload, 100);
      const idsToMark = unsyncedProtocols.map(p => p.id);
      if (idsToMark.length > 0) {
        await db.protocols.where('id').anyOf(idsToMark).modify({ isSynced: true });
      }
    }

    // Passo 2: Exercises
    if (finalExercises.length > 0) {
      const payload = finalExercises.map(ex => sanitizeExerciseForRemote(ex, user.id));
      await batchUpsert('exercises', payload, 100);
      const idsToMark = unsyncedExercises.map(ex => ex.id);
      if (idsToMark.length > 0) {
        await db.exercises.where('id').anyOf(idsToMark).modify({ isSynced: true });
      }
    }

    // Passo 3: Workouts
    if (unsyncedWorkouts.length > 0) {
      const payload = unsyncedWorkouts.map(w => sanitizeWorkoutForRemote(w, user.id));
      await batchUpsert('workouts', payload, 100);
      await db.workouts.where('id').anyOf(unsyncedWorkouts.map(w => w.id)).modify({ isSynced: true });
    }

    // Passo 4: Workout Sets
    if (unsyncedSets.length > 0) {
      const payload = unsyncedSets.map(s => sanitizeWorkoutSetForRemote(s, user.id));
      await batchUpsert('workout_sets', payload, 100);
      await db.workoutSets.where('id').anyOf(unsyncedSets.map(s => s.id)).modify({ isSynced: true });
    }

    // Passo 5: Body Weights
    if (unsyncedWeights.length > 0) {
      const payload = unsyncedWeights.map(b => sanitizeBodyWeightForRemote(b, user.id));
      await batchUpsert('body_weights', payload, 100);
      await db.bodyWeights.where('id').anyOf(unsyncedWeights.map(b => b.id)).modify({ isSynced: true });
    }

    setSyncStatus('synced');
    return { success: true };
  } catch (err: unknown) {
    setSyncStatus('error');
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Sync] Erro no PUSH topológico:', msg);
    throw err;
  }
}

// ============================================================================
// PULL PIPELINE (DELTA FETCH COM CURSOR & LWW)
// ============================================================================

async function fetchDeltaRows<T = Record<string, unknown>>(
  table: string,
  userId: string,
  sinceISO: string
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', sinceISO);

  if (error) {
    throw new Error(`[Sync] PULL Delta ${table}: ${error.message}`);
  }
  return (data || []) as T[];
}

/**
 * Puxa alterações remotas incrementais a partir do cursor `last_pulled_at`
 * e reconcilia via Last-Write-Wins (LWW) preservando tombstones.
 */
export async function pullData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    const cursorKey = `sync_last_pulled_at_${user.id}`;
    const storedCursor = typeof localStorage !== 'undefined' ? localStorage.getItem(cursorKey) : null;
    
    // Buffer de segurança para clock skew (5 segundos)
    let safeCursorISO = '1970-01-01T00:00:00.000Z';
    if (storedCursor) {
      const ts = parseInt(storedCursor, 10);
      if (!isNaN(ts) && ts > 0) {
        safeCursorISO = new Date(Math.max(0, ts - 5000)).toISOString();
      }
    }

    const [remoteP, remoteE, remoteW, remoteS, remoteBW] = await Promise.all([
      withRetry(() => fetchDeltaRows('protocols', user.id, safeCursorISO)),
      withRetry(() => fetchDeltaRows('exercises', user.id, safeCursorISO)),
      withRetry(() => fetchDeltaRows('workouts', user.id, safeCursorISO)),
      withRetry(() => fetchDeltaRows('workout_sets', user.id, safeCursorISO)),
      withRetry(() => fetchDeltaRows('body_weights', user.id, safeCursorISO))
    ]);

    const pullTimestamp = Date.now();

    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
      // 1. Reconciliação de PROTOCOLS
      for (const item of remoteP) {
        const camel = toCamel<Protocol>(item);
        const local = await db.protocols.get(camel.id);
        const remoteUpdated = Number(camel.updatedAt) || Number(camel.createdAt) || 0;
        const localUpdated = Number(local?.updatedAt) || Number(local?.createdAt) || 0;

        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.protocols.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      // 2. Reconciliação de EXERCISES
      for (const item of remoteE) {
        const camel = toCamel<Exercise>(item);
        const local = await db.exercises.get(camel.id);
        const remoteUpdated = Number(camel.updatedAt) || Number(camel.createdAt) || 0;
        const localUpdated = Number(local?.updatedAt) || Number(local?.createdAt) || 0;

        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.exercises.put({
            ...camel,
            userId: user.id,
            dayOfWeek: camel.dayOfWeek || (item as Record<string, unknown>).day as string || 'Segunda',
            pinnedNotes: camel.pinnedNotes || local?.pinnedNotes,
            supersetGroupId: camel.supersetGroupId || local?.supersetGroupId,
            isSynced: true
          });
        }
      }

      // 3. Reconciliação de WORKOUTS
      for (const item of remoteW) {
        const camel = toCamel<Workout>(item);
        const local = await db.workouts.get(camel.id);
        const remoteUpdated = Number(camel.updatedAt) || Number(camel.date) || 0;
        const localUpdated = Number(local?.updatedAt) || Number(local?.date) || 0;

        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.workouts.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      // 4. Reconciliação de WORKOUT_SETS
      for (const item of remoteS) {
        const camel = toCamel<WorkoutSet>(item);
        const local = await db.workoutSets.get(camel.id);
        const remoteUpdated = Number(camel.updatedAt) || Number(camel.timestamp) || 0;
        const localUpdated = Number(local?.updatedAt) || Number(local?.timestamp) || 0;

        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.workoutSets.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      // 5. Reconciliação de BODY_WEIGHTS
      for (const item of remoteBW) {
        const camel = toCamel<BodyWeight>(item);
        const local = await db.bodyWeights.get(camel.id);
        const remoteUpdated = Number(camel.updatedAt) || Number(camel.date) || 0;
        const localUpdated = Number(local?.updatedAt) || Number(local?.date) || 0;

        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.bodyWeights.put({ ...camel, userId: user.id, isSynced: true });
        }
      }
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(cursorKey, pullTimestamp.toString());
    }

    setSyncStatus('synced');
    syncEventBus.emitSyncCompleted();
    return { success: true };
  } catch (err: unknown) {
    setSyncStatus('error');
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Sync] Erro no PULL Delta:', msg);
    throw err;
  }
}

// ============================================================================
// EXCLUSÕES REMOTAS DIRETAS
// ============================================================================

export async function deleteRemoteItem(table: string, id: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    await supabase.from(table).update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', id).eq('user_id', user.id);
  } catch (err) {
    console.warn(`[Sync] Falha não bloqueante ao marcar soft-delete remoto (${table}:${id}):`, err);
  }
}

export async function deleteExercisesByProtocol(protocolId: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    await supabase.from('exercises').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('protocol_id', protocolId).eq('user_id', user.id);
  } catch (err) {
    console.warn(`[Sync] Falha não bloqueante ao marcar exercícios como deletados (${protocolId}):`, err);
  }
}

export async function deleteWorkoutFromCloud(workoutId: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    const now = new Date().toISOString();
    await supabase.from('workout_sets').update({ is_deleted: true, deleted_at: now, updated_at: now }).eq('workout_id', workoutId).eq('user_id', user.id);
    await supabase.from('workouts').update({ is_deleted: true, deleted_at: now, updated_at: now }).eq('id', workoutId).eq('user_id', user.id);
  } catch (err) {
    console.warn(`[Sync] Falha ao marcar treino como deletado (${workoutId}):`, err);
  }
}

// ============================================================================
// CICLO COMPLETO DE SINCRONIZAÇÃO (PUSH + PULL COM MUTEX)
// ============================================================================

async function executeFullSync(): Promise<{ success: boolean } | undefined> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session?.user && refreshData.session.access_token) {
        const u = refreshData.session.user;
        useAuthStore.getState().login({
          id: u.id,
          email: u.email || ''
        }, refreshData.session.access_token);
      }
    }

    await syncData();
    await pullData();
    return { success: true };
  } catch (err) {
    console.error('[Sync] Erro no Ciclo Completo:', err);
    throw err;
  } finally {
    isSyncing = false;
  }
}

export async function fullSync(): Promise<{ success: boolean } | undefined> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks?.request) {
    return await navigator.locks.request('workout_sync_mutex', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log('[Sync] Sincronização concorrente ignorada: outra aba já está em sincronização.');
        return { success: true };
      }
      return await executeFullSync();
    });
  }

  return await executeFullSync();
}
