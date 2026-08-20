import Dexie, { type Table } from 'dexie';
import { getExerciseInfo } from '../utils/exerciseDictionary';
import type {
  Protocol,
  Exercise,
  Workout,
  WorkoutSet,
  BodyWeight,
  UniqueExercise
} from '../types';

export type { Protocol, Exercise, Workout, WorkoutSet, BodyWeight, UniqueExercise };

class WorkoutDB extends Dexie {
  protocols!: Table<Protocol, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  workoutSets!: Table<WorkoutSet, string>;
  bodyWeights!: Table<BodyWeight, string>;

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
  }
}

export const db = new WorkoutDB();

// Protocol Services
export async function createProtocol(protocol: Omit<Protocol, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.protocols.add({ ...protocol, id, createdAt: now, updatedAt: now, isSynced: false });
  return id;
}

export async function getProtocolsByUser(userId: string): Promise<Protocol[]> {
  return db.protocols.where('userId').equals(userId).toArray();
}

export async function updateProtocol(id: string, updates: Partial<Protocol>): Promise<void> {
  await db.protocols.update(id, { ...updates, updatedAt: Date.now(), isSynced: false });
}

export async function deleteProtocol(id: string): Promise<void> {
  const workoutsCount = await db.workouts.where('protocolId').equals(id).count();
  
  if (workoutsCount > 0) {
    // Soft-delete: manter no banco mas ocultar
    await db.protocols.update(id, { isArchived: true, isEnabled: false, isSynced: false });
    // Soft-delete exercícios também
    await db.exercises.where('protocolId').equals(id).modify({ isArchived: true, isSynced: false });
  } else {
    // Deleção física se for seguro (não tem histórico)
    await db.exercises.where('protocolId').equals(id).delete();
    await db.protocols.delete(id);
  }
}

export async function duplicateProtocol(protocolId: string, userId: string, customName?: string): Promise<string> {
  const original = await db.protocols.get(protocolId);
  if (!original) throw new Error('Protocolo original não encontrado.');

  const newProtocolId = crypto.randomUUID();
  const now = Date.now();
  const newName = customName || `${original.name} (Cópia)`;

  // Obter todos os exercícios do protocolo original
  const exercises = await db.exercises.where('protocolId').equals(protocolId).toArray();

  await db.transaction('rw', [db.protocols, db.exercises], async () => {
    await db.protocols.add({
      ...original,
      id: newProtocolId,
      userId,
      name: newName,
      createdAt: now,
      updatedAt: now,
      isSynced: false
    });

    for (const ex of exercises) {
      if (ex.isArchived || ex.isSessionOnly) continue;
      const newExId = crypto.randomUUID();
      await db.exercises.add({
        ...ex,
        id: newExId,
        protocolId: newProtocolId,
        isSynced: false
      });
    }
  });

  return newProtocolId;
}

// Body Weight Services
export async function addBodyWeight(entry: Omit<BodyWeight, 'id' | 'isSynced'>): Promise<string> {
  const id = crypto.randomUUID();
  await db.bodyWeights.put({ ...entry, id, isSynced: false });
  return id;
}

export async function getBodyWeightsByUser(userId: string): Promise<BodyWeight[]> {
  return db.bodyWeights.where('userId').equals(userId).sortBy('date');
}

export async function updateBodyWeight(id: string, updates: Partial<BodyWeight>): Promise<void> {
  await db.bodyWeights.update(id, { ...updates, isSynced: false });
}

export async function deleteBodyWeight(id: string): Promise<void> {
  await db.bodyWeights.delete(id);
}

// Exercise Services
export async function addExercise(exercise: Omit<Exercise, 'id'>): Promise<string> {
  const id = crypto.randomUUID();
  await db.exercises.add({ ...exercise, id, isSynced: false });
  return id;
}

export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, { ...updates, isSynced: false });
}

export async function getExercisesByProtocol(
  protocolId: string, 
  includeArchived = false, 
  activeWorkoutId?: string
): Promise<Exercise[]> {
  const collection = db.exercises.where('protocolId').equals(protocolId);
  const data = await collection.toArray();
  
  let results = data;

  if (activeWorkoutId) {
    // Pegar IDs de exercícios que têm séries NESTE treino ativo
    const sets = await db.workoutSets.where('workoutId').equals(activeWorkoutId).toArray();
    const sessionExerciseIds = new Set(sets.map(s => s.exerciseId));
    
    // Filtro: manter se não arquivado OU se for parte deste treino ativo
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
  const setsCount = await db.workoutSets.where('exerciseId').equals(id).count();
  
  if (setsCount > 0) {
    // Soft-delete: arquivar para preservar histórico
    await db.exercises.update(id, { isArchived: true, isSynced: false });
  } else {
    await db.exercises.delete(id);
  }
}

// Workout Services
export async function startWorkout(workout: Omit<Workout, 'id' | 'date' | 'status'>): Promise<string> {
  const id = crypto.randomUUID();
  const date = Date.now();
  await db.workouts.add({ ...workout, id, date, status: 'active', isSynced: false });
  return id;
}

export async function finishActiveWorkout(id: string, updates: Partial<Workout> = {}): Promise<void> {
  const finishedAt = Date.now();
  await db.workouts.update(id, { ...updates, status: 'completed', finishedAt, isSynced: false });
}

export async function cancelActiveWorkout(id: string): Promise<void> {
  return deleteWorkout(id);
}

export async function getActiveWorkout(userId: string, protocolId?: string): Promise<Workout | undefined> {
  if (protocolId) {
    return db.workouts
      .where({ userId, protocolId, status: 'active' })
      .first();
  }
  return db.workouts
    .where({ userId, status: 'active' })
    .first();
}

export async function addWorkoutSet(set: Omit<WorkoutSet, 'id' | 'timestamp'>): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  await db.workoutSets.add({ ...set, id, timestamp, isSynced: false });
  return id;
}

export async function updateWorkoutSet(id: string, updates: Partial<WorkoutSet>): Promise<void> {
  await db.workoutSets.update(id, { ...updates, isSynced: false });
}

export async function deleteWorkoutSet(id: string): Promise<void> {
  await db.workoutSets.delete(id);
}

export async function upsertWorkoutSet(set: Omit<WorkoutSet, 'id' | 'timestamp'>): Promise<string> {
  const existing = await db.workoutSets
    .where({ workoutId: set.workoutId, exerciseId: set.exerciseId, setIndex: set.setIndex })
    .first();
  
  if (existing) {
    await db.workoutSets.update(existing.id, { ...set, isSynced: false });
    return existing.id;
  } else {
    return addWorkoutSet(set);
  }
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  return db.workoutSets.where('workoutId').equals(workoutId).toArray();
}

export async function getWorkoutHistory(userId: string): Promise<Workout[]> {
  return db.workouts
    .where('userId').equals(userId)
    .filter(w => w.status === 'completed')
    .reverse()
    .sortBy('date');
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  return db.transaction('rw', [db.workouts, db.workoutSets], async () => {
    await db.workoutSets.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
}

export async function clearAllData(userId: string): Promise<void> {
  await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
    // 1. Obter todos os protocolos do usuário
    const protocols = await db.protocols.where('userId').equals(userId).toArray();
    const protocolIds = protocols.map(p => p.id);

    // 2. Obter todos os treinos do usuário
    const workouts = await db.workouts.where('userId').equals(userId).toArray();
    const workoutIds = workouts.map(w => w.id);

    // 3. Deletar com integridade referencial atômica
    if (workoutIds.length > 0) {
      await db.workoutSets.where('workoutId').anyOf(workoutIds).delete();
    }
    await db.workouts.where('userId').equals(userId).delete();
    if (protocolIds.length > 0) {
      await db.exercises.where('protocolId').anyOf(protocolIds).delete();
    }
    await db.protocols.where('userId').equals(userId).delete();
    await db.bodyWeights.where('userId').equals(userId).delete();
  });
}

export async function getExercisePR(exerciseId: string, userId?: string): Promise<WorkoutSet | null> {
  // 1. Pegar IDs de treinos concluídos (filtrando por userId se fornecido)
  let completedWorkoutsQuery = db.workouts.where('status').equals('completed');
  if (userId) {
    completedWorkoutsQuery = completedWorkoutsQuery.and(w => w.userId === userId);
  }
  const completedWorkouts = await completedWorkoutsQuery.toArray();
  
  const workoutIds = new Set(completedWorkouts.map(w => w.id));

  // 2. Pegar todas as séries deste exercício e filtrar apenas treinos concluídos
  const sets = await db.workoutSets
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  const completedSets = sets.filter(s => workoutIds.has(s.workoutId));

  if (completedSets.length === 0) return null;

  const exercise = await db.exercises.get(exerciseId);
  const category = exercise?.category || 'weight';

  // 3. Encontrar a melhor série considerando a categoria do exercício
  return completedSets.reduce((best, current) => {
    if (category === 'time') {
      // Para exercícios de tempo: maior tempo de execução (reps) e maior peso adicional
      if (current.reps > best.reps || (current.reps === best.reps && current.weight > best.weight)) {
        return current;
      }
      return best;
    }

    if (category === 'bodyweight') {
      // Para exercícios de peso corporal: avaliar 1RM equivalente
      const scoreCurrent = (75 + current.weight) * (1 + current.reps / 30);
      const scoreBest = (75 + best.weight) * (1 + best.reps / 30);
      if (scoreCurrent > scoreBest) {
        return current;
      }
      return best;
    }

    // Para pesos livres convencionais: maior carga ou maiores repetições na mesma carga
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
  limit = 5
): Promise<ExerciseSessionHistoryItem[]> {
  // 1. Obter nome canônico
  const canonicalName = getExerciseInfo(exerciseName).canonicalName.toLowerCase();

  // 2. Buscar todos os exercícios com mesmo nome canônico do usuário
  const userProtocols = await db.protocols.where('userId').equals(userId).toArray();
  const protocolMap = new Map<string, string>();
  userProtocols.forEach(p => protocolMap.set(p.id, p.name));
  const protocolIds = Array.from(protocolMap.keys());

  if (protocolIds.length === 0) return [];

  const matchingExercises = await db.exercises
    .where('protocolId')
    .anyOf(protocolIds)
    .toArray();

  const matchingExerciseIds = new Set(
    matchingExercises
      .filter(ex => getExerciseInfo(ex.name).canonicalName.toLowerCase() === canonicalName)
      .map(ex => ex.id)
  );

  if (matchingExerciseIds.size === 0) return [];

  // 3. Buscar todos os treinos concluídos do usuário ordenados por data decrescente
  const completedWorkouts = await db.workouts
    .where('userId')
    .equals(userId)
    .filter(w => w.status === 'completed')
    .reverse()
    .sortBy('date');

  const historyItems: ExerciseSessionHistoryItem[] = [];

  for (const workout of completedWorkouts) {
    if (historyItems.length >= limit) break;

    const sets = await db.workoutSets
      .where('workoutId')
      .equals(workout.id)
      .filter(s => matchingExerciseIds.has(s.exerciseId) && s.completed)
      .toArray();

    if (sets.length > 0) {
      sets.sort((a, b) => a.setIndex - b.setIndex);

      let bestWeight = 0;
      let bestReps = 0;
      let maxE1RM = 0;
      let totalVolume = 0;

      for (const s of sets) {
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
        date: workout.date,
        protocolName: protocolMap.get(workout.protocolId) || 'Treino',
        sets,
        bestWeight,
        bestReps,
        estimated1RM: Math.round(maxE1RM * 10) / 10,
        totalVolume
      });
    }
  }

  return historyItems;
}
