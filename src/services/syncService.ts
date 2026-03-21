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
    date: 'date',
    isEnabled: 'is_enabled',
    daysOfWeek: 'days_of_week',
    updatedAt: 'updated_at',
    dayOfWeek: 'day_of_week',
    isArchived: 'is_archived'
  };
  const newObj: any = {};
  for (const key in obj) {
    if (key === 'isSynced') continue;
    
    let value = obj[key];
    // Converter timestamps de número (Dexie) para ISO String (Supabase timestamptz)
    if (['createdAt', 'finishedAt', 'timestamp', 'date', 'updatedAt'].includes(key) && typeof value === 'number') {
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
    date: 'date',
    is_enabled: 'isEnabled',
    days_of_week: 'daysOfWeek',
    updated_at: 'updatedAt',
    day_of_week: 'dayOfWeek',
    is_archived: 'isArchived'
  };
  const newObj: any = {};
  for (const key in obj) {
    let value = obj[key];
    // Força todos os campos de data para number (timestamp em ms)
    if ([
      'created_at', 'finished_at', 'timestamp', 'date', 'updated_at'
    ].includes(key)) {
      if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!isNaN(parsed)) value = parsed;
        else if (!isNaN(Number(value))) value = Number(value);
      } else if (typeof value === 'bigint' || typeof value === 'number') {
        value = Number(value);
      }
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
    // Pegar apenas itens NÃO sincronizados (dirty)
    const protocolsLocal = await db.protocols.where('userId').equals(user.id).and(p => !p.isSynced).toArray();
    const workoutsLocal = await db.workouts.where('userId').equals(user.id).and(w => !w.isSynced).toArray();
    const exercisesLocal = await db.exercises.toCollection().filter(e => !e.isSynced).toArray();
    const workoutSetsLocal = await db.workoutSets.toCollection().filter(s => !s.isSynced).toArray();
    const bodyWeightsLocal = await db.bodyWeights.where('userId').equals(user.id).and(b => !b.isSynced).toArray();

    if (protocolsLocal.length === 0 && workoutsLocal.length === 0 && exercisesLocal.length === 0 && workoutSetsLocal.length === 0 && bodyWeightsLocal.length === 0) {
      console.log('[Sync] Nada para subir (PUSH).');
      setSyncStatus('synced');
      return { success: true };
    }

    console.log(`[Sync] PUSH - User: ${user.id}, Encontrados no Local: BW(${bodyWeightsLocal.length}), Protocols(${protocolsLocal.length}), Exercises(${exercisesLocal.length})`);

    const protocols = protocolsLocal.map(toSnake);
    const workouts = workoutsLocal.map(toSnake);
    const exercises = exercisesLocal.map(ex => ({ ...ex, userId: user.id })).map(toSnake);
    const workoutSets = workoutSetsLocal.map(set => ({ ...set, userId: user.id })).map(toSnake);
    const bodyWeights = bodyWeightsLocal.map(toSnake);

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
    
    const [pRes, eRes, wRes, sRes, bwRes] = await Promise.all([
      supabase.from('protocols').select('*').eq('user_id', user.id),
      supabase.from('exercises').select('*').eq('user_id', user.id),
      supabase.from('workouts').select('*').eq('user_id', user.id),
      supabase.from('workout_sets').select('*').eq('user_id', user.id),
      supabase.from('body_weights').select('*').eq('user_id', user.id)
    ]);

    if (pRes.error || eRes.error || wRes.error || sRes.error || bwRes.error) {
      throw pRes.error || eRes.error || wRes.error || sRes.error || bwRes.error;
    }

    const remoteP = pRes.data || [];
    const remoteE = eRes.data || [];
    const remoteW = wRes.data || [];
    const remoteS = sRes.data || [];
    const remoteBW = bwRes.data || [];

    console.log(`[Sync] PULL - Recebidos do Supabase: BW(${remoteBW.length}), P(${remoteP.length}), ...`);

    await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
      // 1. Limpeza Inteligente
      // Deletamos apenas o que já FOI sincronizado anteriormente mas não está mais na nuvem
      const remotePIds = remoteP.map(p => p.id);
      const remoteWIds = remoteW.map(w => w.id);
      const remoteEIds = remoteE.map(e => e.id);
      const remoteSIds = remoteS.map(s => s.id);
      const remoteBWIds = remoteBW.map(b => b.id);

      // Remover locais que eram "synced" mas sumiram da nuvem (foi deletado em outro device)
      // MAS mantemos se estiver arquivado localmente (proteção extra)
      await db.protocols.where('userId').equals(user.id).and(p => p.isSynced === true && !p.isArchived && !remotePIds.includes(p.id)).delete();
      await db.workouts.where('userId').equals(user.id).and(w => w.isSynced === true && !remoteWIds.includes(w.id)).delete();
      await db.bodyWeights.where('userId').equals(user.id).and(b => b.isSynced === true && !remoteBWIds.includes(b.id)).delete();
      
      // Para exercises e sets, usamos filter() pois eles não têm userId indexado no Dexie
      await db.exercises.toCollection().filter(e => e.isSynced === true && !e.isArchived && !remoteEIds.includes(e.id)).delete();
      await db.workoutSets.toCollection().filter(s => s.isSynced === true && !remoteSIds.includes(s.id)).delete();

      // 2. Mapeamento e Persistência
      // Importante: NÃO sobrescrevemos itens que estão locais e "sujos" (isSynced: false)
      for (const item of remoteP) {
        const camel = toCamel(item);
        const local = await db.protocols.get(camel.id);
        if (!local || local.isSynced) {
          await db.protocols.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      for (const item of remoteE) {
        const camel = toCamel(item);
        const local = await db.exercises.get(camel.id);
        if (!local || local.isSynced) {
          await db.exercises.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      for (const item of remoteW) {
        const camel = toCamel(item);
        const local = await db.workouts.get(camel.id);
        if (!local || local.isSynced) {
          await db.workouts.put({ ...camel, userId: user.id, isSynced: true });
        }
      }

      for (const item of remoteS) {
        const camel = toCamel(item);
        const local = await db.workoutSets.get(camel.id);
        if (!local || local.isSynced) {
          await db.workoutSets.put({ ...camel, userId: user.id, isSynced: true });
        }
      }
      
      for (const item of remoteBW) {
        const camel = toCamel(item);
        const local = await db.bodyWeights.get(camel.id);
        if (!local || local.isSynced) {
          await db.bodyWeights.put({ ...camel, userId: user.id, isSynced: true });
        }
      }
      
      console.log('[Sync] PULL - Mirror local atualizado (Merge Inteligente).');
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

export async function deleteExercisesByProtocol(protocolId: string) {
  const { user } = useAuthStore.getState();
  if (!user) return;

  try {
    console.log(`[Sync] DELETE Exercises - Protocol: ${protocolId}`);
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('protocol_id', protocolId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (err: any) {
    console.error(`[Sync] Erro ao deletar exercícios do protocolo (${protocolId}):`, err.message || err);
    throw err;
  }
}

export async function fullSync() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    console.log('[Sync] Ciclo Completo: Início (PUSH -> PULL)');
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
