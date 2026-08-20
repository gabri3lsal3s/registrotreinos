/**
 * Constantes globais do sistema de treino.
 */

export interface WeekDayOption {
  key: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  label: string;
  fullName: string;
  dayIndex: number;
}

export const WEEK_DAYS: readonly WeekDayOption[] = [
  { key: 'sun', label: 'Dom', fullName: 'Domingo', dayIndex: 0 },
  { key: 'mon', label: 'Seg', fullName: 'Segunda-feira', dayIndex: 1 },
  { key: 'tue', label: 'Ter', fullName: 'Terça-feira', dayIndex: 2 },
  { key: 'wed', label: 'Qua', fullName: 'Quarta-feira', dayIndex: 3 },
  { key: 'thu', label: 'Qui', fullName: 'Quinta-feira', dayIndex: 4 },
  { key: 'fri', label: 'Sex', fullName: 'Sexta-feira', dayIndex: 5 },
  { key: 'sat', label: 'Sáb', fullName: 'Sábado', dayIndex: 6 },
] as const;

export type DayKey = typeof WEEK_DAYS[number]['key'];

/**
 * Retorna a chave do dia da semana (ex: 'mon') a partir de uma data ou índice.
 */
export function getDayKey(dateOrIndex: Date | number): DayKey {
  const dayIndex = typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getDay();
  return WEEK_DAYS[dayIndex]?.key || 'mon';
}

/**
 * Retorna o label abreviado do dia da semana (ex: 'Seg') a partir de uma data ou índice.
 */
export function getDayLabel(dateOrIndex: Date | number): string {
  const dayIndex = typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getDay();
  return WEEK_DAYS[dayIndex]?.label || 'Seg';
}
