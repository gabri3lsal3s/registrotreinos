export type AnalysisPeriod = 'week' | 'month' | 'year' | 'all';

export interface ExerciseProgressionPoint {
  date: string;
  weight: number;
  volume: number;
  e1rm: number;
  relativeStrength?: number;
}

export interface ExerciseProgression {
  name: string;
  data: ExerciseProgressionPoint[];
}

export interface MuscleGroupProgressionPoint {
  date: string;
  volume: number;
  avgRelativeStrength?: number;
}

export interface MuscleGroupProgression {
  name: string;
  strengthIncrease: number; // Aumento percentual em relação ao baseline
  baselineAvgVolume: number;
  baselineAvgStrength: number;
  data: MuscleGroupProgressionPoint[];
}

export interface BodyWeightPoint {
  date: string;
  weight: number;
}

export interface MuscleBreakdownItem {
  name: string;
  value: number;
  avgWeight: number;
}

export interface RadarMetric {
  axis: string;
  start: number;
  atual: number;
  change: number;
  fullLabel?: string;
}

export interface AnalysisSummary {
  totalVolume: number;
  frequency: number;
  progressData: { date: string; volume: number }[];
  protocolBreakdown: { name: string; volume: number }[];
  protocols: { id: string; name: string }[];
  exerciseProgression: ExerciseProgression[];
  muscleGroupProgression: MuscleGroupProgression[];
  bodyWeightProgression: BodyWeightPoint[];
  muscleBreakdown: MuscleBreakdownItem[];
  radarData: RadarMetric[];
  hasEnoughRadarData: boolean;
  allWorkoutDays?: { date: string; volume: number; workoutsCount: number; protocolNames?: string[] }[];
}
