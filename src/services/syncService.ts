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
    stressLevel: 'stress_level'
  };
  const newObj: any = {};
  for (const key in obj) {
    newObj[mapping[key] || key] = obj[key];
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
    stress_level: 'stressLevel'
  };
  const newObj: any = {};
  for (const key in obj) {
    newObj[mapping[key] || key] = obj[key];
  }
  return newObj;
};

export async function syncData() {
  const { user, setSyncStatus } = useAuthStore.getState();
  if (!user) throw new Error('Usuário não autenticado para sincronização');

  setSyncStatus('syncing');

  // 1. Coleta e mapeia dados locais
  const protocols = (await db.protocols.where('userId').equals(user.id).toArray()).map(toSnake);
  const workouts = (await db.workouts.where('userId').equals(user.id).toArray()).map(toSnake);
  
  const protocolIds = (await db.protocols.where('userId').equals(user.id).toArray()).map(p => p.id);
  const exercises = (await db.exercises.where('protocolId').anyOf(protocolIds).toArray()).map(toSnake);
  
  const workoutIds = (await db.workouts.where('userId').equals(user.id).toArray()).map(w => w.id);
  const workoutSets = (await db.workoutSets.where('workoutId').anyOf(workoutIds).toArray()).map(toSnake);

  try {
    // 2. Sincronização via Supabase
    if (protocols.length > 0) {
      const { error } = await supabase.from('protocols').upsert(protocols);
      if (error) throw error;
    }

    if (exercises.length > 0) {
      const { error } = await supabase.from('exercises').upsert(exercises);
      if (error) throw error;
    }

    if (workouts.length > 0) {
      const { error } = await supabase.from('workouts').upsert(workouts);
      if (error) throw error;
    }

    if (workoutSets.length > 0) {
      const { error } = await supabase.from('workout_sets').upsert(workoutSets);
      if (error) throw error;
    }

    setSyncStatus('synced');
    return { success: true, message: 'Dados enviados!' };
  } catch (err: any) {
    setSyncStatus('error');
    console.error('Erro na sincronização:', err);
    throw err;
  }
}

export async function pullData() {
  const { user, setSyncStatus } = useAuthStore.getState();
  if (!user) return;

  setSyncStatus('syncing');

  try {
    // 1. Fetch from Supabase
    const protocolKeys = await db.protocols.where('userId').equals(user.id).primaryKeys();
    const workoutKeys = await db.workouts.where('userId').equals(user.id).primaryKeys();

    const [protocolsRes, exercisesRes, workoutsRes, setsRes] = await Promise.all([
      supabase.from('protocols').select('*').eq('user_id', user.id),
      protocolKeys.length > 0 
        ? supabase.from('exercises').select('*').in('protocol_id', protocolKeys)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('workouts').select('*').eq('user_id', user.id),
      workoutKeys.length > 0
        ? supabase.from('workout_sets').select('*').in('workout_id', workoutKeys)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (protocolsRes.error) throw protocolsRes.error;
    if (exercisesRes.error) throw exercisesRes.error;
    if (workoutsRes.error) throw workoutsRes.error;
    if (setsRes.error) throw setsRes.error;

    // 2. Transforma de volta para camelCase e salva no Dexie
    // ESTRATÉGIA DE ESPELHAMENTO: Limpa dados locais do usuário antes de inserir os da nuvem
    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets], async () => {
      // Deletar apenas dados pertencentes ao usuário ou referenciados por seus protocolos
      await db.protocols.where('userId').equals(user.id).delete();
      await db.exercises.where('protocolId').anyOf(protocolKeys).delete();
      await db.workouts.where('userId').equals(user.id).delete();
      await db.workoutSets.where('workoutId').anyOf(workoutKeys).delete();

      if (protocolsRes.data) await db.protocols.bulkPut(protocolsRes.data.map(toCamel));
      if (exercisesRes.data) await db.exercises.bulkPut(exercisesRes.data.map(toCamel));
      if (workoutsRes.data) await db.workouts.bulkPut(workoutsRes.data.map(toCamel));
      if (setsRes.data) await db.workoutSets.bulkPut(setsRes.data.map(toCamel));
    });

    setSyncStatus('synced');
    return { success: true, message: 'Dados baixados da nuvem!' };
  } catch (err: any) {
    setSyncStatus('error');
    console.error('Erro no pull de dados:', err);
    throw err;
  }
}
