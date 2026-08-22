import Dexie, { type Table } from 'dexie';
import { getExerciseInfo } from '../utils/exerciseDictionary';
import { toTimestamp } from '../utils/workoutMath';
import { useAuthStore } from './authStore';
import type {
  Protocol,
  Exercise,
  Workout,
  WorkoutSet,
  BodyWeight,
  UniqueExercise,
  PendingDeletion
} from '../types';

export type { Protocol, Exercise, Workout, WorkoutSet, BodyWeight, UniqueExercise, PendingDeletion };

class WorkoutDB extends Dexie {
  protocols!: Table<Protocol, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  workoutSets!: Table<WorkoutSet, string>;
  bodyWeights!: Table<BodyWeight, string>;
  pendingDeletions!: Table<PendingDeletion, string>;

  constructor() {
    super('WorkoutDB');
    this.version(1).stores({
      protocols: 'id, userId, name',
      exercises: 'id, protocolId, name, order',
      workouts: 'id, userId, protocolId, date',
      workoutSets: 'id, workoutId, exerciseId',
    });
    
    this.version(4).stores({
      protocols: 'id, userId, name, isEnabled, [userId+isEnabled]',
      workouts: 'id, userId, protocolId, date, status, [userId+protocolId+status], [userId+status]',
      workoutSets: 'id, workoutId, exerciseId, [workoutId+exerciseId]',
    });
    
    this.version(5).stores({
      bodyWeights: 'id, userId, date, [userId+date]',
    });

    this.version(6).stores({
      workoutSets: 'id, workoutId, exerciseId, setIndex, [workoutId+exerciseId], [workoutId+exerciseId+setIndex]',
    });

    this.version(7).stores({
      protocols: 'id, userId, name, isEnabled, isSynced, [userId+isEnabled], [userId+isSynced]',
      exercises: 'id, userId, protocolId, name, order, isSynced, [protocolId+isSynced]',
      workouts: 'id, userId, protocolId, date, status, isSynced, [userId+protocolId+status], [userId+status], [userId+isSynced]',
      workoutSets: 'id, userId, workoutId, exerciseId, setIndex, isSynced, [workoutId+exerciseId], [workoutId+exerciseId+setIndex], [workoutId+isSynced]',
      bodyWeights: 'id, userId, date, isSynced, [userId+date], [userId+isSynced]',
    });

    this.version(8).stores({
      pendingDeletions: 'id, userId, table, recordId, timestamp, [userId+table]',
    });

    this.version(9).stores({
      protocols: 'id, userId, name, isEnabled, isSynced, isDeleted, updatedAt, [userId+isEnabled], [userId+isSynced], [userId+isDeleted]',
      exercises: 'id, userId, protocolId, name, order, isSynced, isDeleted, updatedAt, [protocolId+isSynced], [protocolId+isDeleted], [userId+isDeleted]',
      workouts: 'id, userId, protocolId, date, status, isSynced, isDeleted, updatedAt, [userId+status], [userId+isSynced], [userId+isDeleted], [userId+date]',
      workoutSets: 'id, userId, workoutId, exerciseId, setIndex, isSynced, isDeleted, updatedAt, [workoutId+exerciseId], [workoutId+exerciseId+setIndex], [workoutId+isSynced], [workoutId+isDeleted], [userId+isDeleted]',
      bodyWeights: 'id, userId, date, isSynced, isDeleted, updatedAt, [userId+date], [userId+isSynced], [userId+isDeleted]',
      pendingDeletions: 'id, userId, table, recordId, timestamp, [userId+table]'
    });
  }
}

export const db = new WorkoutDB();

function getActiveUserId(): string {
  return useAuthStore.getState().user?.id || '';
}

/**
 * Enfileira uma deleção pendente (Tombstone) para retrocompatibilidade
 */
export async function queuePendingDeletion(
  table: PendingDeletion['table'],
  recordId: string,
  userId: string
): Promise<void> {
  if (!userId || !recordId) return;
  try {
    const id = `${table}_${recordId}`;
    await db.pendingDeletions.put({
      id,
      userId,
      table,
      recordId,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[DB] Falha ao enfileirar deleção pendente:', err);
  }
}

// ============================================================================
// PROTOCOL SERVICES
// ============================================================================

export async function createProtocol(protocol: Omit<Protocol, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.protocols.add({
    ...protocol,
    id,
    createdAt: now,
    updatedAt: now,
    isSynced: false,
    isDeleted: false
  });
  return id;
}

export async function getProtocolsByUser(userId: string): Promise<Protocol[]> {
  return db.protocols
    .where('userId')
    .equals(userId)
    .filter(p => !p.isDeleted)
    .toArray();
}

export async function updateProtocol(id: string, updates: Partial<Protocol>): Promise<void> {
  await db.protocols.update(id, {
    ...updates,
    updatedAt: Date.now(),
    isSynced: false
  });
}

export async function deleteProtocol(id: string): Promise<void> {
  const protocol = await db.protocols.get(id);
  const userId = protocol?.userId || getActiveUserId();
  const now = Date.now();
  
  if (userId) {
    await queuePendingDeletion('protocols', id, userId);
  }

  await db.transaction('rw', [db.protocols, db.exercises], async () => {
    // Soft-delete: marca tombstone no protocolo
    await db.protocols.update(id, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isEnabled: false,
      isSynced: false
    });

    // Soft-delete em cascata para todos os exercícios vinculados
    await db.exercises.where('protocolId').equals(id).modify({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isSynced: false
    });
  });
}

export async function duplicateProtocol(protocolId: string, userId: string, customName?: string): Promise<string> {
  const original = await db.protocols.get(protocolId);
  if (!original) throw new Error('Protocolo original não encontrado.');

  const newProtocolId = crypto.randomUUID();
  const now = Date.now();
  const newName = customName || `${original.name} (Cópia)`;

  // Obter todos os exercícios ativos do protocolo original
  const exercises = await db.exercises
    .where('protocolId')
    .equals(protocolId)
    .filter(ex => !ex.isDeleted)
    .toArray();

  await db.transaction('rw', [db.protocols, db.exercises], async () => {
    await db.protocols.add({
      ...original,
      id: newProtocolId,
      userId,
      name: newName,
      createdAt: now,
      updatedAt: now,
      isSynced: false,
      isDeleted: false
    });

    for (const ex of exercises) {
      if (ex.isArchived || ex.isSessionOnly || ex.isDeleted) continue;
      const newExId = crypto.randomUUID();
      await db.exercises.add({
        ...ex,
        id: newExId,
        protocolId: newProtocolId,
        userId,
        createdAt: now,
        updatedAt: now,
        isSynced: false,
        isDeleted: false
      });
    }
  });

  return newProtocolId;
}

// ============================================================================
// BODY WEIGHT SERVICES
// ============================================================================

export async function addBodyWeight(entry: Omit<BodyWeight, 'id' | 'isSynced'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.bodyWeights.put({
    ...entry,
    id,
    createdAt: entry.createdAt || now,
    updatedAt: now,
    isSynced: false,
    isDeleted: false
  });
  return id;
}

export async function getBodyWeightsByUser(userId: string): Promise<BodyWeight[]> {
  const list = await db.bodyWeights
    .where('userId')
    .equals(userId)
    .filter(b => !b.isDeleted)
    .sortBy('date');
  return list;
}

export async function updateBodyWeight(id: string, updates: Partial<BodyWeight>): Promise<void> {
  await db.bodyWeights.update(id, {
    ...updates,
    updatedAt: Date.now(),
    isSynced: false
  });
}

export async function deleteBodyWeight(id: string): Promise<void> {
  const item = await db.bodyWeights.get(id);
  const userId = item?.userId || getActiveUserId();
  const now = Date.now();

  if (userId) {
    await queuePendingDeletion('body_weights', id, userId);
  }

  await db.bodyWeights.update(id, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    isSynced: false
  });
}

// ============================================================================
// EXERCISE SERVICES
// ============================================================================

export async function addExercise(exercise: Omit<Exercise, 'id'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const userId = exercise.userId || getActiveUserId();

  await db.exercises.add({
    ...exercise,
    id,
    userId,
    createdAt: now,
    updatedAt: now,
    isSynced: false,
    isDeleted: false
  });
  return id;
}

export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, {
    ...updates,
    updatedAt: Date.now(),
    isSynced: false
  });
}

export async function getExercisesByProtocol(
  protocolId: string, 
  includeArchived = false, 
  activeWorkoutId?: string
): Promise<Exercise[]> {
  const collection = db.exercises.where('protocolId').equals(protocolId);
  const data = await collection.filter(ex => !ex.isDeleted).toArray();
  
  let results = data;

  if (activeWorkoutId) {
    // Pegar IDs de exercícios que têm séries ativas neste treino
    const sets = await db.workoutSets
      .where('workoutId')
      .equals(activeWorkoutId)
      .filter(s => !s.isDeleted)
      .toArray();
    const sessionExerciseIds = new Set(sets.map(s => s.exerciseId));
    
    results = data.filter(ex => {
      const isPartOfSession = sessionExerciseIds.has(ex.id);
      if (includeArchived) return true;
      return (!ex.isArchived && !ex.isSessionOnly) || isPartOfSession;
    });
  } else {
    if (!includeArchived) {
      results = data.filter(ex => !ex.isArchived && !ex.isSessionOnly);
    }
  }

  return results.sort((a, b) => a.order - b.order);
}

export async function deleteExercise(id: string): Promise<void> {
  const exercise = await db.exercises.get(id);
  const protocol = exercise?.protocolId ? await db.protocols.get(exercise.protocolId) : undefined;
  const userId = exercise?.userId || protocol?.userId || getActiveUserId();
  const now = Date.now();

  if (userId) {
    await queuePendingDeletion('exercises', id, userId);
  }

  // Soft-delete sempre para integridade histórica de treinos passados
  await db.exercises.update(id, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    isArchived: true,
    isSynced: false
  });
}

// ============================================================================
// WORKOUT SERVICES
// ============================================================================

export async function startWorkout(workout: Omit<Workout, 'id' | 'date' | 'status'>): Promise<string> {
  const userId = workout.userId || getActiveUserId();
  
  // Idempotência: Se já houver um treino ativo para este usuário e protocolo, reutiliza o ID existente
  if (workout.protocolId && userId) {
    const existing = await db.workouts
      .where('userId')
      .equals(userId)
      .filter(w => !w.isDeleted && w.protocolId === workout.protocolId && w.status === 'active')
      .first();
    if (existing) {
      return existing.id;
    }
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.workouts.add({
    ...workout,
    userId,
    id,
    date: now,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    isSynced: false,
    isDeleted: false
  });
  return id;
}

export async function finishActiveWorkout(id: string, updates: Partial<Workout> = {}): Promise<void> {
  const finishedAt = Date.now();
  await db.workouts.update(id, {
    ...updates,
    status: 'completed',
    finishedAt,
    updatedAt: finishedAt,
    isSynced: false
  });
}

export async function cancelActiveWorkout(id: string): Promise<void> {
  return deleteWorkout(id);
}

export async function getActiveWorkout(userId: string, protocolId?: string): Promise<Workout | undefined> {
  if (protocolId) {
    return db.workouts
      .where('userId')
      .equals(userId)
      .filter(w => !w.isDeleted && w.protocolId === protocolId && w.status === 'active')
      .first();
  }
  return db.workouts
    .where('userId')
    .equals(userId)
    .filter(w => !w.isDeleted && w.status === 'active')
    .first();
}

export async function addWorkoutSet(set: Omit<WorkoutSet, 'id' | 'timestamp'>): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  const userId = set.userId || getActiveUserId();

  await db.workoutSets.add({
    ...set,
    id,
    userId,
    timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    isSynced: false,
    isDeleted: false
  });
  return id;
}

export async function updateWorkoutSet(id: string, updates: Partial<WorkoutSet>): Promise<void> {
  await db.workoutSets.update(id, {
    ...updates,
    updatedAt: Date.now(),
    isSynced: false
  });
}

export async function deleteWorkoutSet(id: string): Promise<void> {
  const set = await db.workoutSets.get(id);
  const workout = set?.workoutId ? await db.workouts.get(set.workoutId) : undefined;
  const userId = set?.userId || workout?.userId || getActiveUserId();
  const now = Date.now();

  if (userId) {
    await queuePendingDeletion('workout_sets', id, userId);
  }

  await db.workoutSets.update(id, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    isSynced: false
  });
}

export async function upsertWorkoutSet(set: Omit<WorkoutSet, 'id' | 'timestamp'>): Promise<string> {
  const userId = set.userId || getActiveUserId();
  const existing = await db.workoutSets
    .where('workoutId')
    .equals(set.workoutId)
    .filter(s => s.exerciseId === set.exerciseId && s.setIndex === set.setIndex)
    .first();
  
  if (existing) {
    await db.workoutSets.update(existing.id, {
      ...set,
      userId: existing.userId || userId,
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
      isSynced: false
    });
    return existing.id;
  } else {
    return addWorkoutSet({ ...set, userId });
  }
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  return db.workoutSets
    .where('workoutId')
    .equals(workoutId)
    .filter(s => !s.isDeleted)
    .toArray();
}

export async function getWorkoutHistory(userId: string): Promise<Workout[]> {
  const list = await db.workouts
    .where('userId')
    .equals(userId)
    .filter(w => !w.isDeleted && (w.status === 'completed' || !w.status))
    .toArray();
  return list.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const workout = await db.workouts.get(workoutId);
  const userId = workout?.userId || getActiveUserId();
  const now = Date.now();

  if (userId) {
    const sets = await db.workoutSets.where('workoutId').equals(workoutId).toArray();
    for (const s of sets) {
      await queuePendingDeletion('workout_sets', s.id, userId);
    }
    await queuePendingDeletion('workouts', workoutId, userId);
  }

  return db.transaction('rw', [db.workouts, db.workoutSets], async () => {
    // Soft delete do treino
    await db.workouts.update(workoutId, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isSynced: false
    });

    // Soft delete em cascata de todas as séries
    await db.workoutSets.where('workoutId').equals(workoutId).modify({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isSynced: false
    });
  });
}

export async function clearAllData(userId: string): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
    const protocols = await db.protocols.where('userId').equals(userId).toArray();
    const protocolIds = protocols.map(p => p.id);

    const workouts = await db.workouts.where('userId').equals(userId).toArray();
    const workoutIds = workouts.map(w => w.id);

    if (workoutIds.length > 0) {
      await db.workoutSets.where('workoutId').anyOf(workoutIds).modify({
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
        isSynced: false
      });
    }

    await db.workouts.where('userId').equals(userId).modify({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isSynced: false
    });

    if (protocolIds.length > 0) {
      await db.exercises.where('protocolId').anyOf(protocolIds).modify({
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
        isSynced: false
      });
    }

    await db.protocols.where('userId').equals(userId).modify({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isSynced: false
    });

    await db.bodyWeights.where('userId').equals(userId).modify({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      isSynced: false
    });
  });
}

export async function getExercisePR(exerciseId: string, userId?: string): Promise<WorkoutSet | null> {
  const currentUserId = userId || getActiveUserId();
  
  // 1. Pegar todos os treinos válidos (não cancelados e não ativos) do usuário
  let workoutsQuery = db.workouts.filter(w => !w.isDeleted && w.status !== 'cancelled' && w.status !== 'active');
  if (currentUserId) {
    workoutsQuery = db.workouts.where('userId').equals(currentUserId).filter(w => !w.isDeleted && w.status !== 'cancelled' && w.status !== 'active');
  }
  const completedWorkouts = await workoutsQuery.toArray();
  const workoutIds = new Set(completedWorkouts.map(w => w.id));

  // 2. Buscar exercício atual para checar nome e categoria
  const exercise = await db.exercises.get(exerciseId);
  const targetName = exercise?.name?.trim().toLowerCase();
  
  // Buscar IDs correspondentes (mesmo ID ou mesmo nome de exercício histórico)
  let allTargetExerciseIds = [exerciseId];
  if (targetName && currentUserId) {
    const sameNameExercises = await db.exercises
      .where('userId')
      .equals(currentUserId)
      .filter(e => e.name.trim().toLowerCase() === targetName)
      .toArray();
    allTargetExerciseIds = [...new Set([...allTargetExerciseIds, ...sameNameExercises.map(e => e.id)])];
  }

  // 3. Pegar todas as séries deste exercício que não estejam deletadas
  const sets = await db.workoutSets
    .where('exerciseId')
    .anyOf(allTargetExerciseIds)
    .filter(s => !s.isDeleted && s.completed && (workoutIds.has(s.workoutId) || s.workoutId !== ''))
    .toArray();

  if (sets.length === 0) return null;

  const category = exercise?.category || 'weight';

  // 4. Encontrar a melhor série considerando a categoria
  return sets.reduce((best, current) => {
    if (category === 'time') {
      if (current.reps > best.reps || (current.reps === best.reps && current.weight > best.weight)) {
        return current;
      }
      return best;
    }

    if (category === 'bodyweight') {
      const scoreCurrent = (75 + current.weight) * (1 + current.reps / 30);
      const scoreBest = (75 + best.weight) * (1 + best.reps / 30);
      if (scoreCurrent > scoreBest) {
        return current;
      }
      return best;
    }

    if (current.weight > best.weight || (current.weight === best.weight && current.reps > best.reps)) {
      return current;
    }
    return best;
  });
}

export async function getUniqueExercisesLibrary(userId: string): Promise<UniqueExercise[]> {
  const protocols = await getProtocolsByUser(userId);
  const protocolIds = protocols.map(p => p.id);
  
  if (protocolIds.length === 0) return [];

  const exercises = await db.exercises
    .where('protocolId')
    .anyOf(protocolIds)
    .filter(ex => !ex.isDeleted)
    .toArray();

  const unique = new Map<string, UniqueExercise>();
  
  exercises.forEach(ex => {
    const info = getExerciseInfo(ex.name);
    const key = info.canonicalName;
    
    if (!unique.has(key)) {
      unique.set(key, {
        name: info.canonicalName,
        muscleGroup: info.muscleGroup || ex.muscleGroup,
        category: info.category || ex.category || 'weight',
        multiplier: info.multiplier || ex.multiplier
      });
    }
  });

  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExerciseSessionHistoryItem {
  workoutId: string;
  date: number;
  protocolName?: string;
  sets: WorkoutSet[];
  bestWeight: number;
  bestReps: number;
  estimated1RM: number;
  totalVolume: number;
}

/**
 * Retorna as últimas N sessões em que um exercício foi realizado pelo usuário com métricas consolidadas.
 */
export async function getExerciseSessionHistory(
  userId: string,
  exerciseName: string,
  limit = 5,
  exerciseId?: string
): Promise<ExerciseSessionHistoryItem[]> {
  const rawCleanName = exerciseName.split(' (')[0].trim().toLowerCase();
  const canonicalName = getExerciseInfo(exerciseName).canonicalName.toLowerCase();

  // 1. Mapear todos os protocolos do usuário para exibir os nomes
  const allUserProtocols = await db.protocols
    .where('userId')
    .equals(userId)
    .toArray();
  const protocolMap = new Map<string, string>();
  allUserProtocols.forEach(p => protocolMap.set(p.id, p.name));

  // 2. Buscar todos os exercícios do usuário para mapear IDs equivalentes
  const allUserExercises = await db.exercises
    .where('userId')
    .equals(userId)
    .toArray();

  const matchingExerciseIds = new Set<string>();
  if (exerciseId) matchingExerciseIds.add(exerciseId);

  allUserExercises.forEach(ex => {
    const exCleanName = ex.name.split(' (')[0].trim().toLowerCase();
    const exCanonical = getExerciseInfo(ex.name).canonicalName.toLowerCase();
    if (
      exCleanName === rawCleanName ||
      exCanonical === canonicalName ||
      ex.name.toLowerCase().includes(rawCleanName) ||
      rawCleanName.includes(exCleanName)
    ) {
      matchingExerciseIds.add(ex.id);
    }
  });

  if (matchingExerciseIds.size === 0) return [];

  // 3. Buscar todos os treinos concluídos/não-ativos do usuário
  const rawWorkouts = await db.workouts
    .where('userId')
    .equals(userId)
    .filter(w => !w.isDeleted && w.status !== 'cancelled' && w.status !== 'active')
    .toArray();

  rawWorkouts.sort((a, b) => (toTimestamp(b.date) - toTimestamp(a.date)));

  const historyItems: ExerciseSessionHistoryItem[] = [];

  for (const workout of rawWorkouts) {
    if (historyItems.length >= limit) break;

    const rawSets = (await db.workoutSets
      .where('workoutId')
      .equals(workout.id)
      .filter(s => !s.isDeleted && s.completed)
      .toArray());

    const matchingSets = rawSets.filter(s => matchingExerciseIds.has(s.exerciseId));

    if (matchingSets.length > 0) {
      matchingSets.sort((a, b) => a.setIndex - b.setIndex);

      let bestWeight = 0;
      let bestReps = 0;
      let maxE1RM = 0;
      let totalVolume = 0;

      for (const s of matchingSets) {
        if (s.weight > bestWeight || (s.weight === bestWeight && s.reps > bestReps)) {
          bestWeight = s.weight;
          bestReps = s.reps;
        }
        const e1rm = s.weight * (1 + s.reps / 30);
        if (e1rm > maxE1RM) maxE1RM = e1rm;
        totalVolume += (s.weight || 0) * (s.reps || 0);
      }

      historyItems.push({
        workoutId: workout.id,
        date: toTimestamp(workout.date),
        protocolName: protocolMap.get(workout.protocolId) || 'Treino',
        sets: matchingSets,
        bestWeight,
        bestReps,
        estimated1RM: Math.round(maxE1RM * 10) / 10,
        totalVolume
      });
    }
  }

  return historyItems;
}
