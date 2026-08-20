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
    day: day,
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

export function sanitizeWorkoutForRemote(w: Workout, userId: string): Record<string, unknown> {
  return {
    id: w.id,
    user_id: userId,
    protocol_id: w.protocolId && isValidUUID(w.protocolId) ? w.protocolId : null,
    date: toSafeISOString(w.date),
    status: w.status || 'completed',
    finished_at: toNullableSafeISOString(w.finishedAt),
    mood: w.mood !== undefined && w.mood !== null ? String(w.mood) : null,
    sleep_quality: typeof w.sleepQuality === 'number' && !isNaN(w.sleepQuality) ? w.sleepQuality : null,
    stress_level: typeof w.stressLevel === 'number' && !isNaN(w.stressLevel) ? w.stressLevel : null,
    recovery: w.recovery || null,
    notes: w.notes || null,
    created_at: toSafeISOString(w.date),
    updated_at: toSafeISOString(w.finishedAt || w.date)
  };
}

export function sanitizeWorkoutSetForRemote(
  set: WorkoutSet,
  userId: string,
  validExerciseIds: Set<string>
): Record<string, unknown> {
  return {
    id: set.id,
    user_id: userId,
    workout_id: set.workoutId,
    exercise_id: set.exerciseId && validExerciseIds.has(set.exerciseId) ? set.exerciseId : null,
    set_index: typeof set.setIndex === 'number' && !isNaN(set.setIndex) ? set.setIndex : 0,
    weight: typeof set.weight === 'number' && !isNaN(set.weight) ? set.weight : 0,
    reps: typeof set.reps === 'number' && !isNaN(set.reps) ? set.reps : 0,
    type: set.type || 'normal',
    notes: set.notes || null,
    time_in_seconds: typeof set.timeInSeconds === 'number' && !isNaN(set.timeInSeconds) ? set.timeInSeconds : null,
    rpe: typeof set.rpe === 'number' && !isNaN(set.rpe) ? set.rpe : null,
    completed: Boolean(set.completed),
    timestamp: toSafeISOString(set.timestamp),
    created_at: toSafeISOString(set.timestamp),
    updated_at: toSafeISOString(set.timestamp)
  };
}

export function sanitizeBodyWeightForRemote(bw: BodyWeight, userId: string): Record<string, unknown> {
  return {
    id: bw.id,
    user_id: userId,
    weight: typeof bw.weight === 'number' && !isNaN(bw.weight) ? bw.weight : 70,
    date: toSafeISOString(bw.date),
    created_at: toSafeISOString(bw.date),
    updated_at: toSafeISOString(bw.date)
  };
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
 * Envia todas as alterações pendentes locais (isSynced === false) para o Supabase.
 */
export async function syncData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    // 1. Coleta dados locais não sincronizados com escopo de usuário
    const protocolsLocal = await db.protocols.where('userId').equals(user.id).and(p => !p.isSynced).toArray();
    const workoutsLocal = await db.workouts.where('userId').equals(user.id).and(w => !w.isSynced).toArray();
    
    // Obter todos os protocolos do usuário para garantir isolamento e FKs
    const userProtocols = await db.protocols.where('userId').equals(user.id).toArray();
    const userProtocolIds = new Set(userProtocols.map(p => p.id));
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

    // Obter todos os IDs de exercícios para validar FK em workoutSets
    const allUserExercises = await db.exercises.filter(ex => userProtocolIds.has(ex.protocolId)).toArray();
    const validExerciseIds = new Set(allUserExercises.map(e => e.id));

    // 2. Sanitização estrita (apenas colunas permitidas no schema Supabase)
    const protocols = protocolsLocal.map(p => sanitizeProtocolForRemote(p, user.id));
    const exercises = exercisesLocal.map(e => sanitizeExerciseForRemote(e, user.id));
    const workouts = workoutsLocal.map(w => sanitizeWorkoutForRemote(w, user.id));
    const workoutSets = workoutSetsLocal.map(s => sanitizeWorkoutSetForRemote(s, user.id, validExerciseIds));
    const bodyWeights = bodyWeightsLocal.map(b => sanitizeBodyWeightForRemote(b, user.id));

    // 3. PUSH sequencial respeitando integridade de chaves estrangeiras
    if (protocols.length > 0) {
      const { error } = await supabase.from('protocols').upsert(protocols);
      if (error) throw new Error(`Erro ao subir protocolos: ${error.message}`);
    }
    
    if (exercises.length > 0) {
      const { error } = await supabase.from('exercises').upsert(exercises);
      if (error) throw new Error(`Erro ao subir exercícios: ${error.message}`);
    }
    
    if (workouts.length > 0) {
      const { error } = await supabase.from('workouts').upsert(workouts);
      if (error) throw new Error(`Erro ao subir treinos: ${error.message}`);
    }
    
    if (workoutSets.length > 0) {
      const { error } = await supabase.from('workout_sets').upsert(workoutSets);
      if (error) throw new Error(`Erro ao subir séries: ${error.message}`);
    }

    if (bodyWeights.length > 0) {
      const { error } = await supabase.from('body_weights').upsert(bodyWeights);
      if (error) throw new Error(`Erro ao subir peso corporal: ${error.message}`);
    }

    // 4. Marcar localmente como sincronizado com transação atômica
    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
      if (protocolsLocal.length > 0) {
        await db.protocols.where('id').anyOf(protocolsLocal.map(p => p.id)).modify({ isSynced: true });
      }
      if (exercisesLocal.length > 0) {
        await db.exercises.where('id').anyOf(exercisesLocal.map(e => e.id)).modify({ isSynced: true });
      }
      if (workoutsLocal.length > 0) {
        await db.workouts.where('id').anyOf(workoutsLocal.map(w => w.id)).modify({ isSynced: true });
      }
      if (workoutSetsLocal.length > 0) {
        await db.workoutSets.where('id').anyOf(workoutSetsLocal.map(s => s.id)).modify({ isSynced: true });
      }
      if (bodyWeightsLocal.length > 0) {
        await db.bodyWeights.where('id').anyOf(bodyWeightsLocal.map(b => b.id)).modify({ isSynced: true });
      }
    });

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
 * Busca dados remotos do usuário e atualiza a base local no Dexie preservando metadados locais.
 */
export async function pullData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    const [pRes, eRes, wRes, sRes, bwRes] = await Promise.all([
      supabase.from('protocols').select('*').eq('user_id', user.id),
      supabase.from('exercises').select('*').eq('user_id', user.id),
      supabase.from('workouts').select('*').eq('user_id', user.id),
      supabase.from('workout_sets').select('*').eq('user_id', user.id),
      supabase.from('body_weights').select('*').eq('user_id', user.id),
    ]);

    if (pRes.error) throw new Error(`PULL Protocols: ${pRes.error.message}`);
    if (eRes.error) throw new Error(`PULL Exercises: ${eRes.error.message}`);
    if (wRes.error) throw new Error(`PULL Workouts: ${wRes.error.message}`);
    if (sRes.error) throw new Error(`PULL WorkoutSets: ${sRes.error.message}`);
    if (bwRes.error) throw new Error(`PULL BodyWeights: ${bwRes.error.message}`);

    const remoteP = pRes.data || [];
    const remoteE = eRes.data || [];
    const remoteW = wRes.data || [];
    const remoteS = sRes.data || [];
    const remoteBW = bwRes.data || [];

    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
      // 1. Limpeza Inteligente com Isolamento de Usuário
      const remotePIds = remoteP.map(p => p.id);
      const remoteWIds = remoteW.map(w => w.id);
      const remoteEIds = remoteE.map(e => e.id);
      const remoteSIds = remoteS.map(s => s.id);
      const remoteBWIds = remoteBW.map(b => b.id);

      // Obter IDs locais dos protocolos e treinos do usuário logado
      const localProtocols = await db.protocols.where('userId').equals(user.id).toArray();
      const localProtocolIds = new Set(localProtocols.map(p => p.id));
      const localWorkouts = await db.workouts.where('userId').equals(user.id).toArray();
      const localWorkoutIds = new Set(localWorkouts.map(w => w.id));

      // Remover locais que eram "synced" mas sumiram da nuvem
      await db.protocols.where('userId').equals(user.id).and(p => p.isSynced === true && !p.isArchived && !remotePIds.includes(p.id)).delete();
      await db.workouts.where('userId').equals(user.id).and(w => w.isSynced === true && !remoteWIds.includes(w.id)).delete();
      await db.bodyWeights.where('userId').equals(user.id).and(b => b.isSynced === true && !remoteBWIds.includes(b.id)).delete();
      
      // Para exercises e sets, filtrar estritamente pelos protocolos e treinos do usuário logado
      await db.exercises.toCollection().filter(e => localProtocolIds.has(e.protocolId) && e.isSynced === true && !e.isArchived && !remoteEIds.includes(e.id)).delete();
      await db.workoutSets.toCollection().filter(s => localWorkoutIds.has(s.workoutId) && s.isSynced === true && !remoteSIds.includes(s.id)).delete();

      // 2. Mapeamento e Persistência preservando metadados locais
      for (const item of remoteP) {
        const camel = toCamel<Protocol>(item);
        const local = await db.protocols.get(camel.id);
        if (!local || local.isSynced) {
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
            // Preservar notas fixas e grupo de bi-set locais se não existirem no payload remoto
            pinnedNotes: camel.pinnedNotes || local?.pinnedNotes,
            supersetGroupId: camel.supersetGroupId || local?.supersetGroupId,
            isSynced: true
          });
        }
      }

      for (const item of remoteW) {
        const camel = toCamel<Workout>(item);
        const local = await db.workouts.get(camel.id);
        if (!local || local.isSynced) {
          await db.workouts.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      for (const item of remoteS) {
        const camel = toCamel<WorkoutSet>(item);
        const local = await db.workoutSets.get(camel.id);
        if (!local || local.isSynced) {
          await db.workoutSets.put({ ...camel, isSynced: true });
        }
      }

      for (const item of remoteBW) {
        const camel = toCamel<BodyWeight>(item);
        const local = await db.bodyWeights.get(camel.id);
        if (!local || local.isSynced) {
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
 * Exclui registro no Supabase de forma resiliente e não-bloqueante.
 */
export async function deleteRemoteItem(table: string, id: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.warn(`[Sync] Aviso ao deletar remoto (${table}:${id}):`, error.message);
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Sync] Falha não bloqueante ao deletar treino (${workoutId}):`, message);
  }
}

export async function fullSync(): Promise<{ success: boolean } | undefined> {
  if (isSyncing) return;
  isSyncing = true;
  try {
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

