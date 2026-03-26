import { db, getBodyWeightsByUser } from './workoutDB';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { getExerciseInfo } from '../utils/exerciseDictionary';

dayjs.locale('pt-br');

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
    strengthIncrease: number; // Percent increase vs baseline period
    baselineAvgVolume: number;
    baselineAvgStrength: number;
    data: { date: string; volume: number; avgRelativeStrength?: number }[];
  }[];
  bodyWeightProgression: {
    date: string;
    weight: number;
  }[];
  muscleBreakdown: { name: string; value: number; avgWeight: number }[];
  radarData: {
    axis: string;
    start: number;
    atual: number;
    change: number;
    fullLabel?: string;
  }[];
  hasEnoughRadarData: boolean;
}

/**
 * Calculates analysis metrics for a user over a specific period.
 */
export async function getAnalysisSummary(
  userId: string, 
  period: 'week' | 'month' | 'year' | 'all' = 'month'
): Promise<AnalysisSummary> {
  const daysMap = { week: 7, month: 30, year: 365, all: 99999 };
  const days = daysMap[period];
  const startDate = period === 'all' ? 0 : dayjs().subtract(days, 'day').startOf('day').valueOf();
  const baselineStartDate = period === 'all' ? 0 : dayjs().subtract(days * 2, 'day').startOf('day').valueOf();
  
  const formatDateLabel = (dateStr: string) => {
    const d = dayjs(dateStr);
    if (period === 'year' || period === 'all') return d.format('DD/MM');
    const label = d.format('ddd (DD/MM)');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const userProtocols = await db.protocols.where('userId').equals(userId).toArray();
  const workouts = await db.workouts.where('userId').equals(userId)
    .filter(w => w.status === 'completed' && w.date >= (period === 'all' ? 0 : baselineStartDate))
    .toArray();

  const workoutIds = workouts.map(w => w.id);
  const allSets = await db.workoutSets.where('workoutId').anyOf(workoutIds).toArray();
  const exerciseIds = [...new Set(allSets.map(s => s.exerciseId))];
  const allExercises = await db.exercises.where('id').anyOf(exerciseIds).toArray();
  const exerciseMap = new Map(allExercises.map(e => [e.id, e]));
  const bwHistory = await getBodyWeightsByUser(userId);

  const getWeightAtDate = (timestamp: number) => {
    let closestWeight = 0;
    for (const bw of bwHistory) {
      if (bw.date <= timestamp) closestWeight = bw.weight;
      else break;
    }
    return closestWeight || 75;
  };

  const enhancedSets = allSets.map(set => {
    const workout = workouts.find(w => w.id === set.workoutId);
    if (!workout) return null;
    const info = getExerciseInfo(exerciseMap.get(set.exerciseId)?.name || '');
    const userWeight = getWeightAtDate(workout.date);
    const cat = exerciseMap.get(set.exerciseId)?.category || info.category || 'weight';
    const k = exerciseMap.get(set.exerciseId)?.multiplier || info.multiplier || 1;
    
    let eqWeight = set.weight;
    let volume = set.weight * set.reps;
    if (cat === 'time') {
      eqWeight = (userWeight * k) + set.weight;
      volume = eqWeight * (set.reps / 10);
    } else if (cat === 'bodyweight') {
      eqWeight = (userWeight * k) + set.weight;
      volume = eqWeight * set.reps;
    }

    const e1rm = cat === 'time' ? 0 : eqWeight * (1 + set.reps / 30);
    const relStrength = userWeight > 0 && e1rm > 0 ? (e1rm / userWeight) : 0;

    return {
      ...set,
      dateKey: dayjs(workout.date).format('YYYY-MM-DD'),
      timestamp: workout.date,
      protocolId: workout.protocolId,
      eqWeight,
      volume,
      cat,
      exName: info.canonicalName,
      muscleGroup: info.muscleGroup,
      relStrength
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  // Aggregates for CURRENT period only
  const currentWorkouts = workouts.filter(w => w.date >= startDate);
  const currentSets = enhancedSets.filter(s => s.timestamp >= startDate);
  
  const totalVolume = currentSets.reduce((sum, s) => sum + s.volume, 0);
  const frequency = currentWorkouts.length;

  const volumeByDay: Record<string, number> = {};
  currentSets.forEach(s => volumeByDay[s.dateKey] = (volumeByDay[s.dateKey] || 0) + s.volume);

  const progressData = Object.entries(volumeByDay)
    .map(([date, vol]) => ({ date: formatDateLabel(date), volume: vol, rawDate: date }))
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    .map(({ date, volume }) => ({ date, volume }));

  const protocolBreakdownMap: Record<string, number> = {};
  currentSets.forEach(s => {
    const pName = userProtocols.find(p => p.id === s.protocolId)?.name || 'Outros';
    protocolBreakdownMap[pName] = (protocolBreakdownMap[pName] || 0) + s.volume;
  });
  const protocolBreakdown = Object.entries(protocolBreakdownMap).map(([name, volume]) => ({ name, volume }));

  // Exercise Progression (Current Period)
  const exerciseGroups: Record<string, Record<string, any>> = {};
  currentSets.forEach(s => {
    if (!exerciseGroups[s.exName]) exerciseGroups[s.exName] = {};
    const curr = exerciseGroups[s.exName][s.dateKey] || { weight: 0, volume: 0, e1rm: 0, relativeStrength: 0 };
    const e1rm = s.cat === 'time' ? 0 : s.eqWeight * (1 + s.reps / 30);
    exerciseGroups[s.exName][s.dateKey] = {
      weight: Math.max(curr.weight, s.eqWeight),
      volume: curr.volume + s.volume,
      e1rm: Math.max(curr.e1rm, e1rm),
      relativeStrength: Math.max(curr.relativeStrength, s.relStrength)
    };
  });
  const exerciseProgression = Object.entries(exerciseGroups).map(([name, dates]) => ({
    name,
    data: Object.entries(dates).map(([date, vals]) => ({ date: formatDateLabel(date), ...vals, rawDate: date }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .map(({rawDate, ...rest}) => rest)
  }));

  // Muscle Groups (Timeline & Baseline)
  const muscleGroupsTimeline: Record<string, Record<string, any>> = {};
  enhancedSets.forEach(s => {
    const mg = s.muscleGroup;
    if (!muscleGroupsTimeline[mg]) muscleGroupsTimeline[mg] = {};
    const curr = muscleGroupsTimeline[mg][s.dateKey] || { volume: 0, relStrengthSum: 0, relStrengthCount: 0 };
    muscleGroupsTimeline[mg][s.dateKey] = {
      volume: curr.volume + s.volume,
      relStrengthSum: curr.relStrengthSum + s.relStrength,
      relStrengthCount: curr.relStrengthCount + (s.relStrength > 0 ? 1 : 0)
    };
  });

  const muscleGroupProgression = Object.entries(muscleGroupsTimeline).map(([name, dates]) => {
    const groupSets = enhancedSets.filter(s => s.muscleGroup === name);
    let bSets: typeof enhancedSets = [];
    let cSets: typeof enhancedSets = [];

    if (period === 'all') {
      const sorted = [...groupSets].sort((a,b) => a.timestamp - b.timestamp);
      const firstDate = sorted.length > 0 ? sorted[0].timestamp : 0;
      const ms30Days = 30 * 24 * 60 * 60 * 1000;
      
      bSets = sorted.filter(s => s.timestamp <= firstDate + ms30Days);
      cSets = sorted.filter(s => s.timestamp >= Date.now() - ms30Days);
    } else {
      bSets = groupSets.filter(s => s.timestamp >= baselineStartDate && s.timestamp < startDate);
      cSets = groupSets.filter(s => s.timestamp >= startDate);
    }

    const getMetrics = (sets: typeof enhancedSets) => {
      if (sets.length === 0) return { vol: 0, str: 0, score: 0 };
      
      const totalVol = sets.reduce((sum, s) => sum + s.volume, 0);
      // Normalização: Para 'all' comparamos janelas de 30 dias. Para outros, usamos o 'days' do intervalo.
      const dayWindow = period === 'all' ? 30 : days;
      const weeks = Math.max(dayWindow / 7, 1);
      
      const avgVol = totalVol / weeks;
      const avgStr = sets.reduce((sum, s) => sum + s.relStrength, 0) / sets.length;
      
      return { vol: avgVol, str: avgStr, score: avgVol * (1 + avgStr) };
    };

    const baseline = getMetrics(bSets);
    const current = getMetrics(cSets);
    
    const chartData = Object.entries(dates)
      .filter(([date]) => dayjs(date).valueOf() >= startDate)
      .map(([date, vals]) => ({
        date: formatDateLabel(date),
        volume: vals.volume,
        avgRelativeStrength: vals.relStrengthCount > 0 ? vals.relStrengthSum / vals.relStrengthCount : 0,
        rawDate: date
      })).sort((a,b) => a.rawDate.localeCompare(b.rawDate));

    return {
      name: name.toUpperCase(),
      strengthIncrease: baseline.score > 0 ? ((current.score / baseline.score) - 1) * 100 : (current.score > 0 ? 100 : 0),
      baselineAvgVolume: baseline.vol,
      baselineAvgStrength: baseline.str,
      data: chartData
    };
  });

  const muscleBreakdown = Object.entries(muscleGroupsTimeline).map(([name, dates]) => {
    const currentDates = Object.entries(dates).filter(([d]) => dayjs(d).valueOf() >= startDate);
    const volume = currentDates.reduce((s, [_, v]) => s + v.volume, 0);
    // Avg weight in period
    const groupSets = currentSets.filter(s => s.muscleGroup === name);
    const avgWeight = groupSets.length > 0 ? groupSets.reduce((s, x) => s + x.eqWeight, 0) / groupSets.length : 0;
    return { name: name.toUpperCase(), value: volume, avgWeight };
  }).filter(m => m.value > 0).sort((a, b) => b.value - a.value);

    const { radarData, hasEnoughRadarData } = (() => {
    const isUpper = (mg: string) => ['PEITO', 'COSTAS', 'OMBROS', 'BÍCEPS', 'TRÍCEPS', 'CORE'].includes(mg.toUpperCase());
    const isLower = (mg: string) => ['QUADRÍCEPS', 'GLÚTEOS', 'ISQUIOTIBIAIS', 'PANTURRILHA'].includes(mg.toUpperCase());

    // Fatores de Normalização usando o Máximo de Todo o Tempo
    // Assim o gráfico sempre representa quão perto do seu "pico" você está
    const getPerf = (sets: typeof enhancedSets, pWorkouts: typeof workouts, weeks: number) => {
      const u = sets.filter(s => isUpper(s.muscleGroup));
      const l = sets.filter(s => isLower(s.muscleGroup));
      
      const vU = u.reduce((s, x) => s + x.volume, 0) / weeks;
      const sU = u.length > 0 ? u.reduce((s, x) => s + x.relStrength, 0) / u.length : 0;
      const vL = l.reduce((s, x) => s + x.volume, 0) / weeks;
      const sL = l.length > 0 ? l.reduce((s, x) => s + x.relStrength, 0) / l.length : 0;
      
      const freq = pWorkouts.length / weeks;

      return { 
        rawU: vU * (1 + sU),
        rawL: vL * (1 + sL),
        rawF: freq
      };
    };

    let bSets = enhancedSets.filter(s => s.timestamp >= baselineStartDate && s.timestamp < startDate);
    let cSets = enhancedSets.filter(s => s.timestamp >= startDate);
    let bWorkouts = workouts.filter(w => w.date >= baselineStartDate && w.date < startDate);
    let cWorkouts = workouts.filter(w => w.date >= startDate);

    let weeksB = Math.max(days / 7, 1);
    let weeksC = Math.max(days / 7, 1);

    if (period === 'all') {
      const firstWorkoutDate = workouts.length > 0 ? workouts[0].date : (enhancedSets[0]?.timestamp || Date.now());
      const ms30Days = 30 * 24 * 60 * 60 * 1000;
      const bEndDate = firstWorkoutDate + ms30Days;
      const cStartDate = Date.now() - ms30Days;

      bSets = enhancedSets.filter(s => s.timestamp >= firstWorkoutDate && s.timestamp <= bEndDate);
      cSets = enhancedSets.filter(s => s.timestamp >= cStartDate);
      bWorkouts = workouts.filter(w => w.date >= firstWorkoutDate && w.date <= bEndDate);
      cWorkouts = workouts.filter(w => w.date >= cStartDate);
      
      weeksB = 30 / 7;
      weeksC = 30 / 7;
    }

    const start = getPerf(bSets, bWorkouts, weeksB);
    const end = getPerf(cSets, cWorkouts, weeksC);
    
    // Validamos se há dados nos dois períodos para justificar o gráfico de radar
    let hasEnoughRadarData = false;
    if (period === 'all') {
      const firstWorkoutDate = workouts.length > 0 ? workouts[0].date : 0;
      const ms30Days = 30 * 24 * 60 * 60 * 1000;
      // Para exibir radar "Desde o início", o usuário deve ter treinado há mais de 30 dias pelo menos e ter registros.
      hasEnoughRadarData = (Date.now() - firstWorkoutDate > ms30Days) && bSets.length > 0 && cSets.length > 0;
    } else {
      hasEnoughRadarData = bSets.length > 0 && cSets.length > 0;
    }
    
    // Normalização relativa ao pico do período para otimizar o espaço visual do Radar Chart
    const maxU = Math.max(start.rawU, end.rawU, 1) * 1.2;
    const maxL = Math.max(start.rawL, end.rawL, 1) * 1.2;
    const maxF = Math.max(start.rawF, end.rawF, 1) * 1.2;

    const wStart = getWeightAtDate(bSets.length > 0 ? bSets[0].timestamp : (enhancedSets[0]?.timestamp || 0));
    const wEnd = getWeightAtDate(cSets.length > 0 ? cSets[cSets.length-1].timestamp : (enhancedSets[enhancedSets.length-1]?.timestamp || 0));
    const maxW = Math.max(wStart, wEnd, 1) * 1.2;

    const calcChange = (s: number, e: number) => s > 0 ? ((e - s) / s) * 100 : (e > 0 ? 100 : 0);

    return {
      hasEnoughRadarData,
      radarData: [
        { axis: 'Sup.', fullLabel: 'Superiores', start: (start.rawU / maxU) * 100, atual: (end.rawU / maxU) * 100, change: calcChange(start.rawU, end.rawU) },
        { axis: 'Inf.', fullLabel: 'Inferiores', start: (start.rawL / maxL) * 100, atual: (end.rawL / maxL) * 100, change: calcChange(start.rawL, end.rawL) },
        { axis: 'Peso', fullLabel: 'Peso Corporal', start: (wStart / maxW) * 100, atual: (wEnd / maxW) * 100, change: calcChange(wStart, wEnd) },
        { axis: 'Cons.', fullLabel: 'Consistência', start: (start.rawF / maxF) * 100, atual: (end.rawF / maxF) * 100, change: calcChange(start.rawF, end.rawF) },
      ]
    };
  })();

  const bodyWeightProgression = bwHistory.filter(bw => bw.date >= startDate)
    .map(bw => ({ date: formatDateLabel(bw.date.toString()), weight: bw.weight }));

  const activeProtocolIds = new Set(workouts.filter(w => w.date >= startDate).map(w => w.protocolId));
  const protocols = userProtocols.filter(p => activeProtocolIds.has(p.id) || p.isEnabled)
    .sort((a, b) => {
      if (a.isEnabled === b.isEnabled) return 0;
      return a.isEnabled ? -1 : 1;
    })
    .map(p => ({ id: p.id, name: p.name }));

  return {
    totalVolume,
    frequency,
    progressData,
    protocolBreakdown,
    protocols,
    exerciseProgression,
    muscleGroupProgression,
    bodyWeightProgression,
    muscleBreakdown,
    radarData,
    hasEnoughRadarData
  };
}
