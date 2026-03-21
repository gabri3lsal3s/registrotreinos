import { db, getBodyWeightsByUser } from './workoutDB';
import dayjs from 'dayjs';
import { getExerciseInfo } from '../utils/exerciseDictionary';

export interface AnalysisSummary {
  totalVolume: number;
  frequency: number;
  progressData: { date: string; volume: number }[];
  protocolBreakdown: { name: string; volume: number }[];
  protocols: { id: string; name: string }[];
  exerciseProgression: {
    name: string;
    data: { date: string; weight: number; volume: number; e1rm: number; relativeStrength?: number }[];
  }[];
  muscleGroupProgression: {
    name: string;
    data: { date: string; volume: number }[];
  }[];
  bodyWeightProgression: {
    date: string;
    weight: number;
  }[];
  muscleBreakdown: { name: string; value: number }[];
}

/**
 * Calculates analysis metrics for a user over a specific period.
 * @param userId User's ID
 * @param protocolId Optional protocol ID to filter
 * @param days Period in days (default 30)
 */
export async function getAnalysisSummary(
  userId: string, 
  protocolId?: string, 
  days: number = 30
): Promise<AnalysisSummary> {
  const startDate = dayjs().subtract(days, 'day').startOf('day').valueOf();

  // 1. Get all protocols for context and selection
  const userProtocols = await db.protocols.where('userId').equals(userId).toArray();

  // 2. Get workouts in the period
  let workoutQuery = db.workouts.where('userId').equals(userId);

  // Filtra apenas sessões finalizadas (status 'completed'), igual ao histórico
  const workouts = await workoutQuery
    .filter(w => {
      const matchDate = w.date >= startDate;
      const matchProtocol = protocolId ? w.protocolId === protocolId : true;
      const isCompleted = w.status === 'completed';
      return matchDate && matchProtocol && isCompleted;
    })
    .toArray();

  const workoutIds = workouts.map(w => w.id);

  // 3. Get all sets for these workouts
  const allSets = await db.workoutSets
    .where('workoutId')
    .anyOf(workoutIds)
    .toArray();

  // 4. Calculate Total Volume
  const totalVolume = allSets.reduce((sum, set) => sum + (set.weight * set.reps), 0);

  // 5. Calculate Frequency
  const frequency = workouts.length;

  // 6. Build Progress Data (Volume per day)
  const volumeByDay: Record<string, number> = {};
  for (let i = 9; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day').format('DD/MM');
    volumeByDay[d] = 0;
  }

  allSets.forEach(set => {
    const workout = workouts.find(w => w.id === set.workoutId);
    if (workout) {
      const dateKey = dayjs(workout.date).format('DD/MM');
      if (volumeByDay[dateKey] !== undefined) {
        volumeByDay[dateKey] += (set.weight * set.reps);
      }
    }
  });

  // 7. Protocol Breakdown (only for "All Protocols" view)
  const breakdown: Record<string, number> = {};
  
  if (!protocolId) {
    allSets.forEach(set => {
      const workout = workouts.find(w => w.id === set.workoutId);
      if (workout) {
        const pName = userProtocols.find(p => p.id === workout.protocolId)?.name || 'Outros';
        breakdown[pName] = (breakdown[pName] || 0) + (set.weight * set.reps);
      }
    });
  }

  const progressData = Object.entries(volumeByDay).map(([date, volume]) => ({
    date,
    volume
  }));

  const protocolBreakdown = Object.entries(breakdown).map(([name, volume]) => ({
    name,
    volume
  }));

  // 8. Body Weight History & Helper
  const bwHistory = await getBodyWeightsByUser(userId);
  const bodyWeightProgressionMap: Record<string, number> = {};
  
  bwHistory.forEach(bw => {
    if (bw.date >= startDate) {
      const dateKey = dayjs(bw.date).format('DD/MM');
      // Overwrite with latest weight of the day
      bodyWeightProgressionMap[dateKey] = bw.weight;
    }
  });
  
  const bodyWeightProgression = Object.entries(bodyWeightProgressionMap)
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => dayjs(a.date, 'DD/MM').unix() - dayjs(b.date, 'DD/MM').unix());

  const getWeightAtDate = (timestamp: number) => {
    let closestWeight = 0;
    for (const bw of bwHistory) {
      if (bw.date <= timestamp) {
        closestWeight = bw.weight;
      } else {
        break;
      }
    }
    return closestWeight;
  };

  // 9. Exercise Progression
  // First, get all exercise names for the workout sets
  const exerciseIds = [...new Set(allSets.map(s => s.exerciseId))];
  const allExercises = await db.exercises.where('id').anyOf(exerciseIds).toArray();
  const exerciseNameMap = new Map(allExercises.map(e => [e.id, e.name]));

  const exerciseGroups: Record<string, Record<string, { weight: number; volume: number; e1rm: number; relativeStrength?: number }>> = {};
  
  allSets.forEach(set => {
    const workout = workouts.find(w => w.id === set.workoutId);
    if (workout) {
      const dateKey = dayjs(workout.date).format('DD/MM');
      const rawExName = exerciseNameMap.get(set.exerciseId) || 'Exercício Removido';
      const exInfo = getExerciseInfo(rawExName);
      const exName = exInfo.canonicalName;
      
      if (!exerciseGroups[exName]) exerciseGroups[exName] = {};
      
      const current = exerciseGroups[exName][dateKey] || { weight: 0, volume: 0, e1rm: 0, relativeStrength: 0 };
      
      // Calculate Estimated 1RM: weight * (1 + reps/30)
      const e1rm = set.weight * (1 + set.reps / 30);
      
      // Relative Strength Metric
      const userWeightAtTime = getWeightAtDate(workout.date);
      const relativeStrength = userWeightAtTime > 0 ? (e1rm / userWeightAtTime) : 0;

      exerciseGroups[exName][dateKey] = {
        weight: Math.max(current.weight, set.weight),
        volume: current.volume + (set.weight * set.reps),
        e1rm: Math.max(current.e1rm, e1rm),
        relativeStrength: Math.max(current.relativeStrength || 0, relativeStrength)
      };
    }
  });

  const exerciseProgression = Object.entries(exerciseGroups).map(([name, dates]) => ({
    name,
    data: Object.entries(dates)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => {
        // Simple string comparison for DD/MM is not enough for year turnover, 
        // but since we filter by last 30 days, we can find the workout and compare dates properly
        return dayjs(a.date, 'DD/MM').unix() - dayjs(b.date, 'DD/MM').unix();
      })
  }));

  // 9. Muscle Breakdown & Progression
  const muscleGroupsVolume: Record<string, number> = {};
  const muscleGroupsTimeline: Record<string, Record<string, { volume: number }>> = {};
  
  allSets.forEach(set => {
    const workout = workouts.find(w => w.id === set.workoutId);
    if (workout) {
      const dateKey = dayjs(workout.date).format('DD/MM');
      const exercise = allExercises.find(e => e.id === set.exerciseId);
      
      let muscleGroup = 'Outros';
      if (exercise) {
        const exInfo = getExerciseInfo(exercise.name, exercise.muscleGroup);
        muscleGroup = exInfo.muscleGroup;
      }
      
      // Breakdown summary
      muscleGroupsVolume[muscleGroup] = (muscleGroupsVolume[muscleGroup] || 0) + (set.weight * set.reps);
      
      // Progression summary
      if (!muscleGroupsTimeline[muscleGroup]) muscleGroupsTimeline[muscleGroup] = {};
      const current = muscleGroupsTimeline[muscleGroup][dateKey] || { volume: 0 };
      muscleGroupsTimeline[muscleGroup][dateKey] = {
        volume: current.volume + (set.weight * set.reps)
      };
    }
  });

  const muscleBreakdown = Object.entries(muscleGroupsVolume)
    .map(([name, value]) => ({ name: name.toUpperCase(), value }))
    .sort((a, b) => b.value - a.value);

  const muscleGroupProgression = Object.entries(muscleGroupsTimeline).map(([name, dates]) => ({
    name: name.toUpperCase(),
    data: Object.entries(dates)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => dayjs(a.date, 'DD/MM').unix() - dayjs(b.date, 'DD/MM').unix())
  }));

  const allUserCompletedWorkouts = await db.workouts
    .where('userId').equals(userId)
    .filter(w => w.status === 'completed')
    .toArray();
    
  const validProtocolIds = new Set(allUserCompletedWorkouts.map(w => w.protocolId));
  
  const filteredAndSortedProtocols = userProtocols
    .filter(p => validProtocolIds.has(p.id))
    .sort((a, b) => {
      if (a.isEnabled === b.isEnabled) return b.updatedAt - a.updatedAt;
      return a.isEnabled ? -1 : 1;
    });

  return {
    totalVolume,
    frequency,
    progressData,
    protocolBreakdown,
    exerciseProgression,
    muscleGroupProgression,
    bodyWeightProgression,
    muscleBreakdown,
    protocols: filteredAndSortedProtocols.map(p => ({ id: p.id, name: p.name }))
  };
}
