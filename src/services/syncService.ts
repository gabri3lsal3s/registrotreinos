import { db } from './workoutDB';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import type { Protocol, Exercise, Workout, WorkoutSet, BodyWeight } from '../types';

const toSnake = (obj: Record<string, unknown>): Record<string, unknown> => {
  const mapping: Record<string, string> = {
    userId: 'user_id',
    protocolId: 'protocol_id',
    exerciseId: 'exercise_id',
    workoutId: 'workout_id',
    setIndex: 'set_index',
    createdAt: 'created_at',
    finishedAt: 'finished_at',
    muscleGroup: 'muscle_group',
    lastWeight: 'last_weight',
    lastReps: 'last_reps',
    sleepQuality: 'sleep_quality',
    stressLevel: 'stress_level',
    timestamp: 'timestamp',
    date: 'date',
    isEnabled: 'is_enabled',
    daysOfWeek: 'days_of_week',
    updatedAt: 'updated_at',
    dayOfWeek: 'day_of_week',
    day: 'day',
    isArchived: 'is_archived',
    category: 'category',
    multiplier: 'multiplier',
    isSessionOnly: 'is_session_only'
  };
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (key === 'isSynced' || key === 'baseline') continue;
    
    let value = obj[key];
    // Converter timestamps de número (Dexie) para ISO String (Supabase timestamptz)
    if (['createdAt', 'finishedAt', 'timestamp', 'date', 'updatedAt'].includes(key) && typeof value === 'number') {
      value = new Date(value).toISOString();
    }
    newObj[mapping[key] || key] = value;
  }

  // Garantir redundância de dia para exercises
  if (obj.dayOfWeek || obj.day) {
    const dayVal = (obj.dayOfWeek || obj.day) as string;
    newObj.day_of_week = dayVal;
    newObj.day = dayVal;
  }

  return newObj;
};

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
    is_session_only: 'isSessionOnly'
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

export async function syncData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    // 1. Coleta e sanitização de dados locais não sincronizados COM ESCOPO DE USUÁRIO
    const protocolsLocal = await db.protocols.where('userId').equals(user.id).and(p => !p.isSynced).toArray();
    const workoutsLocal = await db.workouts.where('userId').equals(user.id).and(w => !w.isSynced).toArray();
    
    // Obter IDs dos protocolos do usuário para garantir isolamento em exercises
    const userProtocols = await db.protocols.where('userId').equals(user.id).toArray();
    const userProtocolIds = new Set(userProtocols.map(p => p.id));
    const exercisesLocal = await db.exercises.filter(ex => userProtocolIds.has(ex.protocolId) && !ex.isSynced).toArray();

    // Obter IDs dos treinos do usuário para garantir isolamento em workoutSets
    const userWorkouts = await db.workouts.where('userId').equals(user.id).toArray();
    const userWorkoutIds = new Set(userWorkouts.map(w => w.id));
    const workoutSetsLocal = await db.workoutSets.filter(set => userWorkoutIds.has(set.workoutId) && !set.isSynced).toArray();
    
    const bodyWeightsLocal = await db.bodyWeights.where('userId').equals(user.id).and(b => !b.isSynced).toArray();

    if (protocolsLocal.length === 0 && workoutsLocal.length === 0 && exercisesLocal.length === 0 && workoutSetsLocal.length === 0 && bodyWeightsLocal.length === 0) {
      setSyncStatus('synced');
      return { success: true };
    }

    const protocols = protocolsLocal.map(p => toSnake(p as unknown as Record<string, unknown>));
    const workouts = workoutsLocal.map(w => toSnake(w as unknown as Record<string, unknown>));
    const exercises = exercisesLocal.map(ex => ({ ...ex, userId: user.id })).map(e => toSnake(e as unknown as Record<string, unknown>));
    const workoutSets = workoutSetsLocal.map(set => ({ ...set, userId: user.id })).map(s => toSnake(s as unknown as Record<string, unknown>));
    const bodyWeights = bodyWeightsLocal.map(b => toSnake(b as unknown as Record<string, unknown>));

    // Enviar para o Supabase e CHECAR ERROS
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

    // Marcar como sincronizado localmente APENAS se o PUSH funcionou
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

export async function pullData(): Promise<{ success: boolean }> {
  const { user } = useAuthStore.getState();
  if (!user) return { success: false };

  setSyncStatus('syncing');

  try {
    // 1. Buscar tudo do Supabase para ESTE usuário específico
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

      // 2. Mapeamento e Persistência
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

export async function deleteRemoteItem(table: string, id: string): Promise<void> {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Erro ao deletar no Supabase (${table}):`, message);
    throw err;
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

    if (error) throw error;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Erro ao deletar exercícios do protocolo (${protocolId}):`, message);
    throw err;
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
    console.error(`[Sync] Erro ao deletar treino no cloud (${workoutId}):`, message);
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
