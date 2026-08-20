import { db } from './workoutDB';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import type { Protocol, Exercise, Workout, WorkoutSet, BodyWeight } from '../types';

// ============================================================================
// HELPERS DE FORMATAÇÃO E SANITIZAÇÃO DE DADOS
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: unknown): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function toSafeISOString(val: unknown): string {
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } else if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function toNullableSafeISOString(val: unknown): string | null {
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
// SANITIZADORES ESTRITOS POR TABELA (WHITELISTING PARA O SUPABASE POSTGRESQL)
// Evita envio de colunas não mapeadas como pinnedNotes, supersetGroupId, etc.
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
    created_at: toSafeISOString(p.createdAt),
    updated_at: toSafeISOString(p.updatedAt)
  };
}

export function sanitizeExerciseForRemote(ex: Exercise, userId: string): Record<string, unknown> {
  const rawEx = ex as unknown as Record<string, unknown>;
  const day = (ex.dayOfWeek || rawEx.day || 'Segunda') as string;
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
    sets: typeof ex.sets === 'number' && !isNaN(ex.sets) ? ex.sets : 3,
    reps: typeof ex.reps === 'number' && !isNaN(ex.reps) ? ex.reps : 10,
    last_weight: typeof ex.lastWeight === 'number' && !isNaN(ex.lastWeight) ? ex.lastWeight : 0,
    last_reps: typeof ex.lastReps === 'number' && !isNaN(ex.lastReps) ? ex.lastReps : 0,
    is_session_only: Boolean(ex.isSessionOnly),
    is_archived: Boolean(ex.isArchived),
    created_at: toSafeISOString(rawEx.createdAt),
    updated_at: toSafeISOString(rawEx.updatedAt)
  };
}

export function sanitizeWorkoutForRemote(
  w: Workout,
  userId: string,
  defaultProtocolId?: string
): Record<string, unknown> {
  let moodVal: string | number | null = null;
  const rawMood = w.mood as unknown;
  if (typeof rawMood === 'number' && !isNaN(rawMood)) moodVal = rawMood;
  else if (typeof rawMood === 'string' && rawMood.trim().length > 0) {
    const parsed = parseInt(rawMood, 10);
    moodVal = isNaN(parsed) ? rawMood : parsed;
  }

  const protocolId = w.protocolId && isValidUUID(w.protocolId)
    ? w.protocolId
    : (defaultProtocolId && isValidUUID(defaultProtocolId) ? defaultProtocolId : null);

  const isoDate = toSafeISOString(w.date);

  const payload: Record<string, unknown> = {
    id: w.id,
    user_id: userId,
    date: isoDate,
    date_key: isoDate.slice(0, 10),
    status: w.status || 'completed'
  };

  if (protocolId) payload.protocol_id = protocolId;
  if (w.finishedAt) payload.finished_at = toNullableSafeISOString(w.finishedAt);
  if (moodVal !== null) payload.mood = moodVal;
  if (typeof w.sleepQuality === 'number' && !isNaN(w.sleepQuality)) payload.sleep_quality = w.sleepQuality;
  if (typeof w.stressLevel === 'number' && !isNaN(w.stressLevel)) payload.stress_level = w.stressLevel;
  if (w.recovery) payload.recovery = w.recovery;
  if (w.notes) payload.notes = w.notes;
  const rawDuration = (w as unknown as Record<string, unknown>).duration;
  if (typeof rawDuration === 'number' && !isNaN(rawDuration)) payload.duration = rawDuration;
  payload.created_at = isoDate;
  payload.updated_at = toSafeISOString(w.finishedAt || w.date);

  return payload;
}

export function sanitizeWorkoutSetForRemote(
  set: WorkoutSet,
  userId: string,
  validExerciseIds: Set<string>,
  defaultExerciseId?: string
): Record<string, unknown> {
  const exerciseId = set.exerciseId && validExerciseIds.has(set.exerciseId)
    ? set.exerciseId
    : (defaultExerciseId && validExerciseIds.has(defaultExerciseId) ? defaultExerciseId : null);

  const isoTimestamp = toSafeISOString(set.timestamp);

  const payload: Record<string, unknown> = {
    id: set.id,
    user_id: userId,
    workout_id: set.workoutId,
    date_key: isoTimestamp.slice(0, 10),
    set_index: typeof set.setIndex === 'number' && !isNaN(set.setIndex) ? set.setIndex : 0,
    weight: typeof set.weight === 'number' && !isNaN(set.weight) ? set.weight : 0,
    reps: typeof set.reps === 'number' && !isNaN(set.reps) ? set.reps : 0,
    completed: set.completed !== undefined ? Boolean(set.completed) : true,
    timestamp: isoTimestamp,
    created_at: isoTimestamp,
    updated_at: isoTimestamp
  };

  if (exerciseId) payload.exercise_id = exerciseId;
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
    created_at: isoDate,
    updated_at: isoDate
  };
}

// ============================================================================
// UPSERT AUTO-REPARÁVEL EM CHUNKS (PARTICIONAMENTO E AUTO-HEALING DE SCHEMA)
// ============================================================================

async function batchUpsert(
  table: string, 
  items: Record<string, unknown>[], 
  chunkSize = 100,
  fallbackIds?: { defaultProtocolId?: string; defaultExerciseId?: string }
): Promise<void> {
  if (items.length === 0) return;

  for (let i = 0; i < items.length; i += chunkSize) {
    let chunk = items.slice(i, i + chunkSize);
    
    await withRetry(async () => {
      let attempts = 15;
      while (attempts > 0) {
        attempts--;
        const res = await supabase.from(table).upsert(chunk);

        if (!res.error) {
          return; // Sucesso absoluto!
        }

        const msg = res.error.message || '';

        // 1. Tratamento de colunas ausentes no banco remoto (PostgREST schema mismatch)
        const missingColumnMatch = msg.match(/Could not find the '([^']+)' column/) ||
                                   msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/);
        if (missingColumnMatch && missingColumnMatch[1]) {
          const badCol = missingColumnMatch[1];
          console.warn(`[Sync] Coluna '${badCol}' não existe no Supabase para '${table}'. Auto-reparando e tentando novamente...`);
          chunk = chunk.map(item => {
            const copy = { ...item };
            delete copy[badCol];
            return copy;
          });
          continue; // Retenta o upsert imediatamente sem a coluna incompatível
        }

        // 2. Tratamento de date_key not-null constraint
        if (msg.includes('date_key') && (msg.includes('not-null') || msg.includes('null value'))) {
          console.warn(`[Sync] Preenchendo date_key para contornar restrição not-null...`);
          chunk = chunk.map(item => ({
            ...item,
            date_key: typeof item.date === 'string' 
              ? (item.date as string).slice(0, 10) 
              : (typeof item.timestamp === 'string' ? (item.timestamp as string).slice(0, 10) : new Date().toISOString().slice(0, 10))
          }));
          continue;
        }

        // 3. Tratamento de chave estrangeira / not-null em workout_sets
        if (table === 'workout_sets' && (msg.includes('foreign key constraint') || msg.includes('violates foreign key') || msg.includes('exercise_id'))) {
          console.warn(`[Sync] Ajustando exercise_id em workout_sets para contornar restrição de FK/not-null...`);
          const fallbackEx = fallbackIds?.defaultExerciseId || null;
          chunk = chunk.map(item => ({
            ...item,
            exercise_id: fallbackEx
          }));
          continue;
        }

        // 4. Tratamento de chave estrangeira / not-null em workouts
        if (table === 'workouts' && (msg.includes('foreign key constraint') || msg.includes('violates foreign key') || msg.includes('protocol_id'))) {
          console.warn(`[Sync] Ajustando protocol_id em workouts para contornar restrição de FK/not-null...`);
          const fallbackProt = fallbackIds?.defaultProtocolId || null;
          chunk = chunk.map(item => ({
            ...item,
            protocol_id: fallbackProt
          }));
          continue;
        }

        // Se for outro tipo de erro irrecuperável, lança para o withRetry
        throw new Error(`Erro ao subir ${table} (lote ${Math.floor(i / chunkSize) + 1}): ${msg}`);
      }
    });
  }
}

// ============================================================================
// PROCESSADOR DE FILA DE DELEÇÕES PENDENTES (TOMBSTONES COM HIERARQUIA REVERSA)
// ============================================================================

const TABLE_DELETE_ORDER: Record<string, number> = {
  workout_sets: 1,
  workouts: 2,
  exercises: 3,
  protocols: 4,
  body_weights: 5
};

async function recordRemoteTombstone(userId: string, table: string, recordId: string): Promise<void> {
  try {
    await supabase.from('deleted_records').upsert({
      user_id: userId,
      table_name: table,
      record_id: recordId,
      deleted_at: new Date().toISOString()
    });
  } catch {
    // Ignora silenciosamente se tabela não existir
  }
}

async function fetchAllPaginated<T = Record<string, unknown>>(
  table: string,
  userId: string,
  chunkSize = 1000
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + chunkSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, to);

    if (error) throw new Error(`PULL ${table} (${from}-${to}): ${error.message}`);
    const rows = (data || []) as T[];
    allRows = allRows.concat(rows);

    if (rows.length < chunkSize) {
      hasMore = false;
    } else {
      from += chunkSize;
    }
  }

  return allRows;
}

async function fetchDeletedRecords(userId: string): Promise<{ table_name: string; record_id: string }[]> {
  try {
    const res = await supabase
      .from('deleted_records')
      .select('table_name, record_id')
      .eq('user_id', userId)
      .gte('deleted_at', new Date(Date.now() - 60 * 86400000).toISOString());
    return (res.data || []) as { table_name: string; record_id: string }[];
  } catch {
    return [];
  }
}

async function flushPendingDeletions(userId: string): Promise<void> {
  const pending = await db.pendingDeletions.where('userId').equals(userId).toArray();
  if (pending.length === 0) return;

  // Ordenar exclusões na ordem inversa de FK para nunca violar integridade relacional
  pending.sort((a, b) => (TABLE_DELETE_ORDER[a.table] || 99) - (TABLE_DELETE_ORDER[b.table] || 99));

  const successfulIds: string[] = [];

  for (const item of pending) {
    try {
      // Se for workout, garantir que as séries vinculadas sejam deletadas primeiro
      if (item.table === 'workouts') {
        await supabase
          .from('workout_sets')
          .delete()
          .eq('workout_id', item.recordId)
          .eq('user_id', userId);
      }

      // Se for protocol, deletar exercícios vinculados antes
      if (item.table === 'protocols') {
        await supabase
          .from('exercises')
          .delete()
          .eq('protocol_id', item.recordId)
          .eq('user_id', userId);
      }

      const { error } = await supabase
        .from(item.table)
        .delete()
        .eq('id', item.recordId)
        .eq('user_id', userId);

      if (!error || error.code === 'PGRST116' || error.message.includes('not found')) {
        successfulIds.push(item.id);

        // Registrar na tabela de tombstones remotos para propagação multi-dispositivo
        recordRemoteTombstone(userId, item.table, item.recordId);
      }
    } catch (err) {
      console.warn(`[Sync] Falha ao processar deleção remota (${item.table}:${item.recordId}):`, err);
    }
  }

  if (successfulIds.length > 0) {
    await db.pendingDeletions.where('id').anyOf(successfulIds).delete();
  }
}

// ============================================================================
// CONVERSOR CAMELCASE (DO SUPABASE PARA O DEXIE LOCAL)
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
    category: 'category',
    multiplier: 'multiplier',
    is_session_only: 'isSessionOnly',
    time_in_seconds: 'timeInSeconds',
    date_key: 'dateKey'
  };
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    let value = obj[key];
    // Converter ISO string para timestamps numéricos (Dexie)
    if (['created_at', 'finished_at', 'timestamp', 'date', 'updated_at'].includes(key) && typeof value === 'string') {
      const parsed = new Date(value).getTime();
      if (!isNaN(parsed)) value = parsed;
    }
    newObj[mapping[key] || key] = value;
  }
  return newObj as T;
};

let isSyncing = false;

export const setSyncStatus = (status: 'pending' | 'syncing' | 'synced' | 'error') => {
  useAuthStore.getState().setSyncStatus(status);
};

/**
 * Envia todas as alterações pendentes locais (isSynced === false) para o Supabase
 * e despacha tombstones pendentes.
 */
export async function syncData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    // 1. Processar e expurgar fila de deleções pendentes (Tombstones)
    await flushPendingDeletions(user.id);

    // 2. Coleta dados locais com escopo de usuário
    const protocolsLocal = await db.protocols.where('userId').equals(user.id).and(p => !p.isSynced).toArray();
    const workoutsLocal = await db.workouts.where('userId').equals(user.id).and(w => !w.isSynced).toArray();
    
    // Obter todos os protocolos do usuário para garantir isolamento e integridade de FK
    const userProtocols = await db.protocols.where('userId').equals(user.id).toArray();
    const userProtocolIds = new Set(userProtocols.map(p => p.id));
    const defaultProtocolId = userProtocols[0]?.id;
    const exercisesLocal = await db.exercises.filter(ex => userProtocolIds.has(ex.protocolId) && !ex.isSynced).toArray();

    // Obter todos os treinos do usuário para garantir isolamento de séries
    const userWorkouts = await db.workouts.where('userId').equals(user.id).toArray();
    const userWorkoutIds = new Set(userWorkouts.map(w => w.id));
    const workoutSetsLocal = await db.workoutSets.filter(set => userWorkoutIds.has(set.workoutId) && !set.isSynced).toArray();
    
    const bodyWeightsLocal = await db.bodyWeights.where('userId').equals(user.id).and(b => !b.isSynced).toArray();

    if (protocolsLocal.length === 0 && workoutsLocal.length === 0 && exercisesLocal.length === 0 && workoutSetsLocal.length === 0 && bodyWeightsLocal.length === 0) {
      setSyncStatus('synced');
      return { success: true };
    }

    // Garantir que todos os protocolos referenciados pelos exercícios sejam enviados
    const referencedProtocolIds = new Set(exercisesLocal.map(e => e.protocolId));
    const parentProtocolsToSend = userProtocols.filter(p => referencedProtocolIds.has(p.id));
    const protocolsMap = new Map<string, Protocol>();
    for (const p of [...protocolsLocal, ...parentProtocolsToSend]) {
      protocolsMap.set(p.id, p);
    }
    const finalProtocols = Array.from(protocolsMap.values());

    // Obter todos os IDs de exercícios para validar FK em workoutSets
    const allUserExercises = await db.exercises.filter(ex => userProtocolIds.has(ex.protocolId)).toArray();
    const validExerciseIds = new Set(allUserExercises.map(e => e.id));
    const defaultExerciseId = allUserExercises[0]?.id;

    // Garantir que todos os treinos referenciados pelas séries sejam enviados
    const referencedWorkoutIds = new Set(workoutSetsLocal.map(s => s.workoutId));
    const parentWorkoutsToSend = userWorkouts.filter(w => referencedWorkoutIds.has(w.id));
    const workoutsMap = new Map<string, Workout>();
    for (const w of [...workoutsLocal, ...parentWorkoutsToSend]) {
      workoutsMap.set(w.id, w);
    }
    const finalWorkouts = Array.from(workoutsMap.values());

    // 3. Sanitização estrita (apenas colunas permitidas no schema Supabase)
    const protocolsPayload = finalProtocols.map(p => sanitizeProtocolForRemote(p, user.id));
    const exercisesPayload = exercisesLocal.map(e => sanitizeExerciseForRemote(e, user.id));
    const workoutsPayload = finalWorkouts.map(w => sanitizeWorkoutForRemote(w, user.id, defaultProtocolId));
    const workoutSetsPayload = workoutSetsLocal.map(s => sanitizeWorkoutSetForRemote(s, user.id, validExerciseIds, defaultExerciseId));
    const bodyWeightsPayload = bodyWeightsLocal.map(b => sanitizeBodyWeightForRemote(b, user.id));

    // 4. PUSH sequencial progressivo: cada tabela que sobe é marcada imediatamente como sincronizada
    if (protocolsPayload.length > 0) {
      await batchUpsert('protocols', protocolsPayload, 100);
      if (protocolsLocal.length > 0) {
        await db.protocols.where('id').anyOf(protocolsLocal.map(p => p.id)).modify({ isSynced: true });
      }
    }
    
    if (exercisesPayload.length > 0) {
      await batchUpsert('exercises', exercisesPayload, 100);
      if (exercisesLocal.length > 0) {
        await db.exercises.where('id').anyOf(exercisesLocal.map(e => e.id)).modify({ isSynced: true });
      }
    }
    
    if (workoutsPayload.length > 0) {
      await batchUpsert('workouts', workoutsPayload, 100, { defaultProtocolId });
      if (workoutsLocal.length > 0) {
        await db.workouts.where('id').anyOf(workoutsLocal.map(w => w.id)).modify({ isSynced: true });
      }
    }
    
    if (workoutSetsPayload.length > 0) {
      await batchUpsert('workout_sets', workoutSetsPayload, 100, { defaultExerciseId });
      if (workoutSetsLocal.length > 0) {
        await db.workoutSets.where('id').anyOf(workoutSetsLocal.map(s => s.id)).modify({ isSynced: true });
      }
    }

    if (bodyWeightsPayload.length > 0) {
      await batchUpsert('body_weights', bodyWeightsPayload, 100);
      if (bodyWeightsLocal.length > 0) {
        await db.bodyWeights.where('id').anyOf(bodyWeightsLocal.map(b => b.id)).modify({ isSynced: true });
      }
    }

    setSyncStatus('synced');
    return { success: true };
  } catch (err: unknown) {
    setSyncStatus('error');
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Sync] Erro no PUSH:', message);
    throw err;
  }
}

/**
 * Busca dados remotos do usuário e atualiza a base local no Dexie preservando metadados locais
 * e ignorando itens marcados para deleção pendente.
 */
export async function pullData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    const [rawRemoteP, rawRemoteE, rawRemoteW, rawRemoteS, rawRemoteBW, remoteDeletedList, pendingDeletions] = await Promise.all([
      withRetry(async () => await fetchAllPaginated<Record<string, unknown>>('protocols', user.id)),
      withRetry(async () => await fetchAllPaginated<Record<string, unknown>>('exercises', user.id)),
      withRetry(async () => await fetchAllPaginated<Record<string, unknown>>('workouts', user.id)),
      withRetry(async () => await fetchAllPaginated<Record<string, unknown>>('workout_sets', user.id)),
      withRetry(async () => await fetchAllPaginated<Record<string, unknown>>('body_weights', user.id)),
      fetchDeletedRecords(user.id),
      db.pendingDeletions.where('userId').equals(user.id).toArray()
    ]);

    // Processar deleções remotas propagadas de outros dispositivos
    const remoteDeletedKeys = new Set(remoteDeletedList.map(d => `${d.table_name}_${d.record_id}`));

    // Cria conjunto de chaves de itens que foram deletados localmente
    const pendingDeletionKeys = new Set(pendingDeletions.map((d: { table: string; recordId: string }) => `${d.table}_${d.recordId}`));

    // Aplicar exclusões remotas confirmadas no banco local
    if (remoteDeletedList.length > 0) {
      await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
        for (const item of remoteDeletedList) {
          if (item.table_name === 'protocols') {
            await db.protocols.delete(item.record_id);
            await db.exercises.where('protocolId').equals(item.record_id).delete();
          } else if (item.table_name === 'exercises') {
            await db.exercises.delete(item.record_id);
          } else if (item.table_name === 'workouts') {
            await db.workouts.delete(item.record_id);
            await db.workoutSets.where('workoutId').equals(item.record_id).delete();
          } else if (item.table_name === 'workout_sets') {
            await db.workoutSets.delete(item.record_id);
          } else if (item.table_name === 'body_weights') {
            await db.bodyWeights.delete(item.record_id);
          }
        }
      });
    }

    const isExcluded = (table: string, id: string) => 
      pendingDeletionKeys.has(`${table}_${id}`) || remoteDeletedKeys.has(`${table}_${id}`);

    const remoteP = rawRemoteP.filter(item => !isExcluded('protocols', item.id as string));
    const remoteE = rawRemoteE.filter(item => !isExcluded('exercises', item.id as string));
    const remoteW = rawRemoteW.filter(item => !isExcluded('workouts', item.id as string));
    const remoteS = rawRemoteS.filter(item => !isExcluded('workout_sets', item.id as string));
    const remoteBW = rawRemoteBW.filter(item => !isExcluded('body_weights', item.id as string));

    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
      // Mapeamento e Persistência Não-Destrutiva com Last-Write-Wins (LWW)
      for (const item of remoteP) {
        const camel = toCamel<Protocol>(item);
        const local = await db.protocols.get(camel.id);
        const remoteUpdated = Number(camel.updatedAt) || Number(camel.createdAt) || 0;
        const localUpdated = Number(local?.updatedAt) || Number(local?.createdAt) || 0;
        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.protocols.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      for (const item of remoteE) {
        const camel = toCamel<Exercise>(item);
        const local = await db.exercises.get(camel.id);
        if (!local || local.isSynced) {
          await db.exercises.put({
            ...camel,
            dayOfWeek: camel.dayOfWeek || (item as Record<string, unknown>).day as string || 'Segunda',
            pinnedNotes: camel.pinnedNotes || local?.pinnedNotes,
            supersetGroupId: camel.supersetGroupId || local?.supersetGroupId,
            isSynced: true
          });
        }
      }

      for (const item of remoteW) {
        const camel = toCamel<Workout>(item);
        const local = await db.workouts.get(camel.id);
        const remoteUpdated = Number(camel.date) || 0;
        const localUpdated = Number(local?.date) || 0;
        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.workouts.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      for (const item of remoteS) {
        const camel = toCamel<WorkoutSet>(item);
        const local = await db.workoutSets.get(camel.id);
        const remoteUpdated = Number(camel.timestamp) || 0;
        const localUpdated = Number(local?.timestamp) || 0;
        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.workoutSets.put({ ...camel, isSynced: true });
        }
      }

      for (const item of remoteBW) {
        const camel = toCamel<BodyWeight>(item);
        const local = await db.bodyWeights.get(camel.id);
        const remoteUpdated = Number(camel.date) || 0;
        const localUpdated = Number(local?.date) || 0;
        if (!local || local.isSynced || remoteUpdated >= localUpdated) {
          await db.bodyWeights.put({ ...camel, userId: user.id, isSynced: true });
        }
      }
    });

    setSyncStatus('synced');
    return { success: true };
  } catch (err: unknown) {
    setSyncStatus('error');
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Sync] Erro no PULL:', message);
    throw err;
  }
}

/**
 * Exclui registro no Supabase com integridade referencial em cascata.
 */
export async function deleteRemoteItem(table: string, id: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    if (table === 'workouts') {
      await supabase.from('workout_sets').delete().eq('workout_id', id).eq('user_id', user.id);
    } else if (table === 'protocols') {
      await supabase.from('exercises').delete().eq('protocol_id', id).eq('user_id', user.id);
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.warn(`[Sync] Aviso ao deletar remoto (${table}:${id}):`, error.message);
    } else {
      recordRemoteTombstone(user.id, table, id);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Sync] Falha não bloqueante ao deletar no Supabase (${table}):`, message);
  }
}

export async function deleteExercisesByProtocol(protocolId: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('protocol_id', protocolId)
      .eq('user_id', user.id);

    if (error) {
      console.warn(`[Sync] Aviso ao deletar exercícios do protocolo (${protocolId}):`, error.message);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Sync] Falha não bloqueante ao deletar exercícios (${protocolId}):`, message);
  }
}

export async function deleteWorkoutFromCloud(workoutId: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    await supabase.from('workout_sets').delete().eq('workout_id', workoutId).eq('user_id', user.id);
    await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', user.id);
    recordRemoteTombstone(user.id, 'workouts', workoutId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Sync] Falha não bloqueante ao deletar treino (${workoutId}):`, message);
  }
}

async function executeFullSync(): Promise<{ success: boolean } | undefined> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    // Validação e renovação preventiva de sessão Supabase
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

/**
 * Executa o ciclo completo de sincronização protegido por Web Lock entre abas
 */
export async function fullSync(): Promise<{ success: boolean } | undefined> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks?.request) {
    return await navigator.locks.request('workout_sync_mutex', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log('[Sync] Sincronização concorrente evitada: outra aba já está sincronizando.');
        return { success: true };
      }
      return await executeFullSync();
    });
  }

  return await executeFullSync();
}

