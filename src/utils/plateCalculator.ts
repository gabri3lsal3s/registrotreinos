/**
 * Utilitário de Cálculo de Distribuição de Anilhas (Plate Calculator).
 * Resolve de forma determinística e gulosa a montagem da barra por lado.
 */

export interface BarOption {
  id: string;
  name: string;
  weight: number;
}

export const BAR_OPTIONS: BarOption[] = [
  { id: 'olympic_20', name: 'Barra Olímpica Masculina (20kg)', weight: 20 },
  { id: 'olympic_15', name: 'Barra Olímpica Feminina (15kg)', weight: 15 },
  { id: 'standard_10', name: 'Barra Reta Convencional (10kg)', weight: 10 },
  { id: 'ez_8', name: 'Barra W / EZ (8kg)', weight: 8 },
  { id: 'free_0', name: 'Sem Barra / Peso Livre (0kg)', weight: 0 },
];

export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateStyle {
  weight: number;
  bg: string;
  border: string;
  text: string;
  heightClass: string;
}

export const PLATE_STYLES: Record<number, PlateStyle> = {
  25: { weight: 25, bg: 'bg-rose-600', border: 'border-rose-700', text: 'text-white', heightClass: 'h-24' },
  20: { weight: 20, bg: 'bg-blue-600', border: 'border-blue-700', text: 'text-white', heightClass: 'h-22' },
  15: { weight: 15, bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-zinc-950', heightClass: 'h-19' },
  10: { weight: 10, bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'text-white', heightClass: 'h-16' },
  5: { weight: 5, bg: 'bg-slate-300 dark:bg-slate-600', border: 'border-slate-400 dark:border-slate-500', text: 'text-zinc-900 dark:text-white', heightClass: 'h-13' },
  2.5: { weight: 2.5, bg: 'bg-zinc-800 dark:bg-zinc-700', border: 'border-zinc-900 dark:border-zinc-600', text: 'text-white', heightClass: 'h-10' },
  1.25: { weight: 1.25, bg: 'bg-zinc-600 dark:bg-zinc-500', border: 'border-zinc-700 dark:border-zinc-400', text: 'text-white', heightClass: 'h-8' }
};

export interface PlateCalculationResult {
  targetWeight: number;
  barWeight: number;
  weightPerSide: number;
  platesPerSide: number[];
  achievedWeight: number;
  remainder: number;
}

/**
 * Calcula a combinação ideal de anilhas para cada lado da barra.
 */
export function calculatePlates(
  targetWeight: number,
  barWeight = 20,
  availablePlates = DEFAULT_PLATES
): PlateCalculationResult {
  const safeTarget = Math.max(0, targetWeight);
  const safeBar = Math.max(0, barWeight);

  if (safeTarget <= safeBar) {
    return {
      targetWeight: safeTarget,
      barWeight: safeBar,
      weightPerSide: 0,
      platesPerSide: [],
      achievedWeight: safeBar,
      remainder: 0
    };
  }

  const weightToDistribute = safeTarget - safeBar;
  let remainingPerSide = weightToDistribute / 2;
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  const platesPerSide: number[] = [];

  for (const plate of sortedPlates) {
    while (remainingPerSide >= plate - 0.001) {
      platesPerSide.push(plate);
      remainingPerSide -= plate;
    }
  }

  const weightPerSide = platesPerSide.reduce((sum, p) => sum + p, 0);
  const achievedWeight = safeBar + weightPerSide * 2;
  const remainder = Math.round((safeTarget - achievedWeight) * 100) / 100;

  return {
    targetWeight: safeTarget,
    barWeight: safeBar,
    weightPerSide,
    platesPerSide,
    achievedWeight,
    remainder
  };
}
