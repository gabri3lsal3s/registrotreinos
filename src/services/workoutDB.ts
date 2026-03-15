import Dexie, { type Table } from 'dexie';

export interface Protocol {
  id: string; // UUID
  userId: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Exercise {
  id: string;
  protocolId: string;
  name: string;
  muscleGroup?: string;
  order: number;
  lastWeight?: number;
  lastReps?: number;
}

export interface Workout {
  id: string;
  userId: string;
  protocolId: string;
  date: number;
  mood?: number; // 1-5
  sleepQuality?: number; // 1-5
  stressLevel?: number; // 1-5
  recovery?: string;
  notes?: string;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  timestamp: number;
}

class WorkoutDB extends Dexie {
  protocols!: Table<Protocol, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  workoutSets!: Table<WorkoutSet, string>;

  constructor() {
    super('WorkoutDB');
    this.version(1).stores({
      protocols: 'id, userId, name',
      exercises: 'id, protocolId, name, order',
      workouts: 'id, userId, protocolId, date',
      workoutSets: 'id, workoutId, exerciseId',
    });
  }
}

export const db = new WorkoutDB();

// Protocol Services
export async function createProtocol(protocol: Omit<Protocol, 'id' | 'createdAt'>) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.protocols.add({ ...protocol, id, createdAt });
  return id;
}

export async function getProtocolsByUser(userId: string) {
  return db.protocols.where('userId').equals(userId).toArray();
}

export async function deleteProtocol(id: string) {
  await db.protocols.delete(id);
  // Optional: delete associated exercises and workouts
  await db.exercises.where('protocolId').equals(id).delete();
}

// Exercise Services
export async function addExercise(exercise: Omit<Exercise, 'id'>) {
  const id = crypto.randomUUID();
  await db.exercises.add({ ...exercise, id });
  return id;
}

export async function getExercisesByProtocol(protocolId: string) {
  return db.exercises.where('protocolId').equals(protocolId).sortBy('order');
}

export async function deleteExercise(id: string) {
  await db.exercises.delete(id);
}

// Workout Services
export async function startWorkout(workout: Omit<Workout, 'id' | 'date'>) {
  const id = crypto.randomUUID();
  const date = Date.now();
  await db.workouts.add({ ...workout, id, date });
  return id;
}

export async function addWorkoutSet(set: Omit<WorkoutSet, 'id' | 'timestamp'>) {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  await db.workoutSets.add({ ...set, id, timestamp });
  return id;
}

export async function getWorkoutSets(workoutId: string) {
  return db.workoutSets.where('workoutId').equals(workoutId).toArray();
}

export async function getWorkoutHistory(userId: string) {
  return db.workouts.where('userId').equals(userId).reverse().sortBy('date');
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
