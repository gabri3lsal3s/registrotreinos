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

// Exercise Services
export async function addExercise(exercise: Omit<Exercise, 'id'>) {
  const id = crypto.randomUUID();
  await db.exercises.add({ ...exercise, id });
  return id;
}

export async function getExercisesByProtocol(protocolId: string) {
  return db.exercises.where('protocolId').equals(protocolId).sortBy('order');
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

export async function getWorkoutHistory(userId: string) {
  return db.workouts.where('userId').equals(userId).reverse().sortBy('date');
}
