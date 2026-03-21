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
  muscleBreakdown: { name: string; value: number; avgWeight: number }[];
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

  // 4. Pre-fetch dependencies for calculations
  const exerciseIds = [...new Set(allSets.map(s => s.exerciseId))];
  const allExercises = await db.exercises.where('id').anyOf(exerciseIds).toArray();
  const exerciseMap = new Map(allExercises.map(e => [e.id, e]));

  const bwHistory = await getBodyWeightsByUser(userId);
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

  // Build bodyWeightProgressionMap early
  const bodyWeightProgressionMap: Record<string, number> = {};
  bwHistory.forEach(bw => {
    if (bw.date >= startDate) {
      const dateKey = dayjs(bw.date).format('DD/MM');
      bodyWeightProgressionMap[dateKey] = bw.weight;
    }
  });

  const bodyWeightProgression = Object.entries(bodyWeightProgressionMap)
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => dayjs(a.date, 'DD/MM').unix() - dayjs(b.date, 'DD/MM').unix());

  // 5. Enhance Sets with calculated Volume and eqWeight
  const enhancedSets = allSets.map(set => {
    const workout = workouts.find(w => w.id === set.workoutId);
    const date = workout ? workout.date : 0;
    const ex = exerciseMap.get(set.exerciseId);
    const info = getExerciseInfo(ex?.name || '');
    
    const cat = ex?.category || info.category || 'weight';
    const k = ex?.multiplier || info.multiplier || 1;
    const userWeight = getWeightAtDate(date);
    
    let eqWeight = 0;
    let volume = 0;

    if (cat === 'time') {
      eqWeight = (userWeight * k) + set.weight;
      // Normalização: Cada 10 segundos equivalem a 1 repetição teórica para evitar inflação de volume
      const theoreticalReps = set.reps / 10; 
      volume = eqWeight * theoreticalReps;
    } else if (cat === 'bodyweight') {
      eqWeight = (userWeight * k) + set.weight;
      volume = eqWeight * set.reps;
    } else {
      eqWeight = set.weight;
      volume = eqWeight * set.reps;
    }

    return {
      ...set,
      dateKey: workout ? dayjs(workout.date).format('DD/MM') : '',
      timestamp: date,
      protocolId: workout ? workout.protocolId : '',
      eqWeight,
      volume,
      cat,
      exName: info.canonicalName,
      muscleGroup: info.muscleGroup,
      userWeightAtTime: userWeight
    };
  }).filter(s => s.dateKey);

  // 6. Calculate Aggregates
  const totalVolume = enhancedSets.reduce((sum, set) => sum + set.volume, 0);
  const frequency = workouts.length;

  const volumeByDay: Record<string, number> = {};
  for (let i = 9; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day').format('DD/MM');
    volumeByDay[d] = 0;
  }
  enhancedSets.forEach(set => {
    if (volumeByDay[set.dateKey] !== undefined) {
      volumeByDay[set.dateKey] += set.volume;
    }
  });

  const breakdown: Record<string, number> = {};
  if (!protocolId) {
    enhancedSets.forEach(set => {
      const pName = userProtocols.find(p => p.id === set.protocolId)?.name || 'Outros';
      breakdown[pName] = (breakdown[pName] || 0) + set.volume;
    });
  }

  const progressData = Object.entries(volumeByDay).map(([date, volume]) => ({ date, volume }));
  const protocolBreakdown = Object.entries(breakdown).map(([name, volume]) => ({ name, volume }));

  // 7. Exercise Progression
  const exerciseGroups: Record<string, Record<string, { weight: number; volume: number; e1rm: number; relativeStrength?: number }>> = {};
  enhancedSets.forEach(set => {
    const exName = set.exName;
    if (!exerciseGroups[exName]) exerciseGroups[exName] = {};
    const current = exerciseGroups[exName][set.dateKey] || { weight: 0, volume: 0, e1rm: 0, relativeStrength: 0 };
    
    // e1rm calculation
    const e1rm = set.cat === 'time' ? 0 : set.eqWeight * (1 + set.reps / 30);
    const relativeStrength = set.userWeightAtTime > 0 && e1rm > 0 ? (e1rm / set.userWeightAtTime) : 0;

    exerciseGroups[exName][set.dateKey] = {
      weight: Math.max(current.weight, set.eqWeight), // track max equivalent weight
      volume: current.volume + set.volume,
      e1rm: Math.max(current.e1rm, e1rm),
      relativeStrength: Math.max(current.relativeStrength || 0, relativeStrength)
    };
  });

  const exerciseProgression = Object.entries(exerciseGroups).map(([name, dates]) => ({
    name,
    data: Object.entries(dates)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => dayjs(a.date, 'DD/MM').unix() - dayjs(b.date, 'DD/MM').unix())
  }));

  // 8. Muscle Breakdown & Progression
  const muscleGroupsVolume: Record<string, number> = {};
  const muscleGroupsWeight: Record<string, { total: number, count: number }> = {};
  const muscleGroupsTimeline: Record<string, Record<string, { volume: number }>> = {};
  
  enhancedSets.forEach(set => {
    const bg = set.muscleGroup;
    muscleGroupsVolume[bg] = (muscleGroupsVolume[bg] || 0) + set.volume;

    if (!muscleGroupsWeight[bg]) muscleGroupsWeight[bg] = { total: 0, count: 0 };
    muscleGroupsWeight[bg].total += set.eqWeight;
    muscleGroupsWeight[bg].count += 1;
    
    if (!muscleGroupsTimeline[bg]) muscleGroupsTimeline[bg] = {};
    const current = muscleGroupsTimeline[bg][set.dateKey] || { volume: 0 };
    muscleGroupsTimeline[bg][set.dateKey] = { volume: current.volume + set.volume };
  });

  const muscleBreakdown = Object.entries(muscleGroupsVolume).map(([name, volume]) => {
    const weights = muscleGroupsWeight[name];
    const avgWeight = weights && weights.count > 0 ? (weights.total / weights.count) : 0;
    return { name: name.toUpperCase(), value: volume, avgWeight };
  }).sort((a, b) => b.value - a.value);

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
