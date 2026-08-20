import type { ExerciseCategory } from '../types';

/**
 * Calcula o peso equivalente considerado na fórmula de volume/1RM.
 * Suporta peso livre, calistenia (peso corporal * K + carga adicional) e tempo.
 */
export function calculateEquivalentWeight(
  weight: number,
  category: ExerciseCategory,
  userWeight: number,
  multiplier?: number
): number {
  if (category === 'bodyweight' || category === 'time') {
    const k = multiplier !== undefined && multiplier > 0 ? multiplier : 1.0;
    const baseWeight = userWeight > 0 ? userWeight : 70;
    return (baseWeight * k) + (weight || 0);
  }
  return weight || 0;
}

/**
 * Calcula o volume de uma série baseado em carga, reps/tempo, categoria e peso corporal.
 * - weight: peso * reps
 * - bodyweight: ((pesoCorporal * K) + cargaAdicional) * reps
 * - time: ((pesoCorporal * K) + cargaAdicional) * (tempo_s / 10)
 */
export function calculateVolume(
  weight: number,
  repsOrTime: number,
  category: ExerciseCategory = 'weight',
  userWeight: number = 0,
  multiplier?: number
): number {
  const eqWeight = calculateEquivalentWeight(weight, category, userWeight, multiplier);

  if (category === 'time') {
    return eqWeight * (repsOrTime / 10);
  }
  return eqWeight * repsOrTime;
}

/**
 * Estima o 1RM (One Rep Max) pela fórmula de Epley.
 * e1RM = CargaEquivalente * (1 + reps / 30)
 */
export function calculate1RM(
  weight: number,
  reps: number,
  category: ExerciseCategory = 'weight',
  userWeight: number = 0,
  multiplier?: number
): number {
  if (category === 'time' || reps <= 0) return 0;
  const eqWeight = calculateEquivalentWeight(weight, category, userWeight, multiplier);
  if (reps === 1) return eqWeight;
  return eqWeight * (1 + reps / 30);
}

/**
 * Calcula a força relativa baseada no 1RM estimado dividido pelo peso corporal.
 */
export function calculateRelativeStrength(e1rm: number, userWeight: number): number {
  if (!userWeight || userWeight <= 0 || !e1rm || e1rm <= 0) return 0;
  return Number((e1rm / userWeight).toFixed(2));
}

/**
 * Converte strings numéricas em formato brasileiro (com vírgula) ou internacional (com ponto)
 * para number de forma segura. Previne NaN e corrupção de dados.
 */
export function parseLocaleNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') {
    return isNaN(value) ? fallback : value;
  }
  const str = String(value).trim().replace(',', '.');
  if (str === '') return fallback;
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}
