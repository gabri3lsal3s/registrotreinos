// Edita um exercício existente (Exercise)
export async function updateExercise(id: string, updates: Partial<Exercise>) {
  await db.exercises.update(id, { ...updates, isSynced: false });
}
// Edita um set de exercício (WorkoutSet)
export async function updateWorkoutSet(id: string, updates: Partial<WorkoutSet>) {
  await db.workoutSets.update(id, { ...updates, isSynced: false });
}

// Exclui um set de exercício (WorkoutSet)
export async function deleteWorkoutSet(id: string) {
  await db.workoutSets.delete(id);
}
import Dexie, { type Table } from 'dexie';

export interface Protocol {
  id: string; // UUID
  userId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  daysOfWeek: string[];
  isSynced?: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Exercise {
  id: string;
  protocolId: string;
  name: string;
  muscleGroup?: string;
  category?: 'weight' | 'bodyweight' | 'time'; // New
  multiplier?: number; // Base multiplier K for bodyweight/time (New)
  order: number;
  sets?: number;
  reps?: number;
  dayOfWeek?: string;
  lastWeight?: number;
  lastReps?: number;
  isSynced?: boolean;
  isArchived?: boolean;
}

export interface Workout {
  id: string;
  userId: string;
  protocolId: string;
  date: number;
  status: 'active' | 'completed' | 'cancelled';
  finishedAt?: number;
  mood?: number; // 1-5
  sleepQuality?: number; // 1-5
  stressLevel?: number; // 1-5
  recovery?: string;
  notes?: string;
  isSynced?: boolean;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  weight: number;
  reps: number; // for time-based, this will store seconds down the line, but we keep the column. Or we can use timeInSeconds.
  timeInSeconds?: number;
  rpe?: number;
  completed: boolean;
  timestamp: number;
  isSynced?: boolean;
}

export interface BodyWeight {
  id: string;
  userId: string;
  weight: number;
  date: number;
  isSynced?: boolean;
}

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
  }
}

export const db = new WorkoutDB();

// Protocol Services
export async function createProtocol(protocol: Omit<Protocol, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.protocols.add({ ...protocol, id, createdAt: now, updatedAt: now, isSynced: false });
  return id;
}

export async function getProtocolsByUser(userId: string) {
  return db.protocols.where('userId').equals(userId).toArray();
}

export async function deleteProtocol(id: string) {
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

// Body Weight Services
export async function addBodyWeight(entry: Omit<BodyWeight, 'id' | 'isSynced'>) {
  const id = crypto.randomUUID();
  await db.bodyWeights.put({ ...entry, id, isSynced: false });
  return id;
}

export async function getBodyWeightsByUser(userId: string) {
  return db.bodyWeights.where('userId').equals(userId).sortBy('date');
}

export async function updateBodyWeight(id: string, updates: Partial<BodyWeight>) {
  await db.bodyWeights.update(id, { ...updates, isSynced: false });
}

export async function deleteBodyWeight(id: string) {
  await db.bodyWeights.delete(id);
}

// Exercise Services
export async function addExercise(exercise: Omit<Exercise, 'id'>) {
  const id = crypto.randomUUID();
  await db.exercises.add({ ...exercise, id, isSynced: false });
  return id;
}

export async function getExercisesByProtocol(protocolId: string, includeArchived = false) {
  const collection = db.exercises.where('protocolId').equals(protocolId);
  if (includeArchived) return collection.sortBy('order');
  return collection.filter(ex => !ex.isArchived).sortBy('order');
}

export async function deleteExercise(id: string) {
  const setsCount = await db.workoutSets.where('exerciseId').equals(id).count();
  
  if (setsCount > 0) {
    // Soft-delete: arquivar para preservar histórico
    await db.exercises.update(id, { isArchived: true, isSynced: false });
  } else {
    await db.exercises.delete(id);
  }
}

// Workout Services
export async function startWorkout(workout: Omit<Workout, 'id' | 'date' | 'status'>) {
  const id = crypto.randomUUID();
  const date = Date.now();
  await db.workouts.add({ ...workout, id, date, status: 'active', isSynced: false });
  return id;
}

export async function finishActiveWorkout(id: string, updates: Partial<Workout> = {}) {
  const finishedAt = Date.now();
  await db.workouts.update(id, { ...updates, status: 'completed', finishedAt, isSynced: false });
}

export async function cancelActiveWorkout(id: string) {
  // Option A: Delete entirely
  // Option B: Mark as cancelled to keep record but ignore in stats
  // User asked for "considered as cancelled workout". Mark as cancelled is better.
  const finishedAt = Date.now();
  await db.workouts.update(id, { status: 'cancelled', finishedAt, isSynced: false });
}

export async function getActiveWorkout(userId: string, protocolId?: string) {
  if (protocolId) {
    return db.workouts
      .where({ userId, protocolId, status: 'active' })
      .first();
  }
  return db.workouts
    .where({ userId, status: 'active' })
    .first();
}

export async function addWorkoutSet(set: Omit<WorkoutSet, 'id' | 'timestamp'>) {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  await db.workoutSets.add({ ...set, id, timestamp, isSynced: false });
  return id;
}

export async function getWorkoutSets(workoutId: string) {
  return db.workoutSets.where('workoutId').equals(workoutId).toArray();
}

export async function getWorkoutHistory(userId: string) {
  return db.workouts
    .where('userId').equals(userId)
    .filter(w => w.status === 'completed')
    .reverse()
    .sortBy('date');
}

export async function deleteWorkout(workoutId: string) {
  return db.transaction('rw', [db.workouts, db.workoutSets], async () => {
    await db.workoutSets.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
}

export async function clearAllData(userId: string) {
  // 1. Get all protocols for the user
  const protocols = await db.protocols.where('userId').equals(userId).toArray();
  const protocolIds = protocols.map(p => p.id);

  // 2. Get all workouts for the user
  const workouts = await db.workouts.where('userId').equals(userId).toArray();
  const workoutIds = workouts.map(w => w.id);

  // 3. Delete based on IDs or userId
  await db.workoutSets.where('workoutId').anyOf(workoutIds).delete();
  await db.workouts.where('userId').equals(userId).delete();
  await db.exercises.where('protocolId').anyOf(protocolIds).delete();
  await db.protocols.where('userId').equals(userId).delete();
}
