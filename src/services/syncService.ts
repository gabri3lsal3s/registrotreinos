import { db } from './workoutDB';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';

const toSnake = (obj: any) => {
  const mapping: Record<string, string> = {
    userId: 'user_id',
    protocolId: 'protocol_id',
    exerciseId: 'exercise_id',
    workoutId: 'workout_id',
    createdAt: 'created_at',
    finishedAt: 'finished_at',
    muscleGroup: 'muscle_group',
    lastWeight: 'last_weight',
    lastReps: 'last_reps',
    sleepQuality: 'sleep_quality',
    stressLevel: 'stress_level',
    timestamp: 'timestamp',
    date: 'date'
  };
  const newObj: any = {};
  for (const key in obj) {
    let value = obj[key];
    // Converter timestamps de número (Dexie) para ISO String (Supabase timestamptz)
    if (['createdAt', 'finishedAt', 'timestamp', 'date'].includes(key) && typeof value === 'number') {
      value = new Date(value).toISOString();
    }
    newObj[mapping[key] || key] = value;
  }
  return newObj;
};

const toCamel = (obj: any) => {
  const mapping: Record<string, string> = {
    user_id: 'userId',
    protocol_id: 'protocolId',
    exercise_id: 'exerciseId',
    workout_id: 'workoutId',
    created_at: 'createdAt',
    finished_at: 'finishedAt',
    muscle_group: 'muscleGroup',
    last_weight: 'lastWeight',
    last_reps: 'lastReps',
    sleep_quality: 'sleepQuality',
    stress_level: 'stressLevel',
    timestamp: 'timestamp',
    date: 'date'
  };
  const newObj: any = {};
  for (const key in obj) {
    let value = obj[key];
    if (['created_at', 'finished_at', 'timestamp', 'date'].includes(key) && value && typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) value = parsed;
    }
    newObj[mapping[key] || key] = value;
  }
  return newObj;
};

let isSyncing = false;

export async function syncData() {
  const { user, setSyncStatus } = useAuthStore.getState();
  if (!user) throw new Error('Usuário não autenticado');

  setSyncStatus('syncing');

  try {
    const protocolsLocal = await db.protocols.where('userId').equals(user.id).toArray();
    const workoutsLocal = await db.workouts.where('userId').equals(user.id).toArray();
    
    const protocolIds = protocolsLocal.map(p => p.id);
    const exercisesLocal = await db.exercises.where('protocolId').anyOf(protocolIds).toArray();
    
    const workoutIds = workoutsLocal.map(w => w.id);
    const workoutSetsLocal = await db.workoutSets.where('workoutId').anyOf(workoutIds).toArray();

    console.log(`[Sync] PUSH - User: ${user.id}, Encontrados no Local: Protocols(${protocolsLocal.length}), Exercises(${exercisesLocal.length})`);

    const protocols = protocolsLocal.map(toSnake);
    const workouts = workoutsLocal.map(toSnake);
    const exercises = exercisesLocal.map(ex => ({ ...ex, userId: user.id })).map(toSnake);
    const workoutSets = workoutSetsLocal.map(set => ({ ...set, userId: user.id })).map(toSnake);

    if (protocols.length > 0) await supabase.from('protocols').upsert(protocols);
    if (exercises.length > 0) await supabase.from('exercises').upsert(exercises);
    if (workouts.length > 0) await supabase.from('workouts').upsert(workouts);
    if (workoutSets.length > 0) await supabase.from('workout_sets').upsert(workoutSets);

    console.log('[Sync] PUSH finalizado com sucesso.');
    setSyncStatus('synced');
    return { success: true };
  } catch (err: any) {
    setSyncStatus('error');
    console.error('[Sync] Erro no PUSH:', err.message || err);
    throw err;
  }
}

export async function pullData() {
  const { user, setSyncStatus } = useAuthStore.getState();
  if (!user) return;

  setSyncStatus('syncing');

  try {
    console.log(`[Sync] PULL - Iniciando para: ${user.id}`);
    
    const [pRes, eRes, wRes, sRes] = await Promise.all([
      supabase.from('protocols').select('*').eq('user_id', user.id),
      supabase.from('exercises').select('*').eq('user_id', user.id),
      supabase.from('workouts').select('*').eq('user_id', user.id),
      supabase.from('workout_sets').select('*').eq('user_id', user.id)
    ]);

    if (pRes.error || eRes.error || wRes.error || sRes.error) {
      throw pRes.error || eRes.error || wRes.error || sRes.error;
    }

    const remoteP = pRes.data || [];
    const remoteE = eRes.data || [];
    const remoteW = wRes.data || [];
    const remoteS = sRes.data || [];

    console.log(`[Sync] PULL - Recebidos do Supabase: P(${remoteP.length}), E(${remoteE.length}), W(${remoteW.length}), S(${remoteS.length})`);

    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets], async () => {
      // 1. Limpeza Radical
      // Deletamos TUDO que pertence a este usuário no local antes de persistir o que veio da nuvem
      const localP = await db.protocols.where('userId').equals(user.id).toArray();
      const localW = await db.workouts.where('userId').equals(user.id).toArray();
      const pIds = localP.map(p => p.id);
      const wIds = localW.map(w => w.id);

      if (pIds.length > 0) await db.exercises.where('protocolId').anyOf(pIds).delete();
      if (wIds.length > 0) await db.workoutSets.where('workoutId').anyOf(wIds).delete();
      await db.protocols.where('userId').equals(user.id).delete();
      await db.workouts.where('userId').equals(user.id).delete();

      // 2. Mapeamento e Persistência
      // FORÇAMOS o userId igual ao logado para garantir que as queries locais funcionem
      const format = (item: any) => ({ ...toCamel(item), userId: user.id });

      if (remoteP.length > 0) await db.protocols.bulkPut(remoteP.map(format));
      if (remoteE.length > 0) await db.exercises.bulkPut(remoteE.map(format));
      if (remoteW.length > 0) await db.workouts.bulkPut(remoteW.map(format));
      if (remoteS.length > 0) await db.workoutSets.bulkPut(remoteS.map(format));
      
      console.log('[Sync] PULL - Mirror local atualizado com sucesso.');
    });

    setSyncStatus('synced');
    return { success: true };
  } catch (err: any) {
    setSyncStatus('error');
    console.error('[Sync] Erro no PULL:', err.message || err);
    throw err;
  }
}

export async function deleteRemoteItem(table: string, id: string) {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    console.log(`[Sync] DELETE - Tabela: ${table}, ID: ${id}`);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (err: any) {
    console.error(`[Sync] Erro ao deletar no Supabase (${table}):`, err.message || err);
    throw err;
  }
}

export async function fullSync() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    console.log('[Sync] Ciclo Completo: Início');
    await syncData();
    await pullData();
    console.log('[Sync] Ciclo Completo: Sucesso');
    return { success: true };
  } catch (err) {
    console.error('[Sync] Erro no Ciclo Completo:', err);
    throw err;
  } finally {
    isSyncing = false;
  }
}
