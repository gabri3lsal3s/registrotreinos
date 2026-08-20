import { getExerciseInfo } from '../utils/exerciseDictionary';
import { WEEK_DAYS } from '../utils/constants';
import type { ExerciseCategory } from '../types';

export interface ParsedExerciseItem {
  id: string; // ID temporário para manipulação na UI
  name: string;
  muscleGroup: string;
  category: ExerciseCategory;
  multiplier?: number;
  sets: number;
  reps: number;
  dayKey: string;
  dayLabel: string;
  pinnedNotes?: string;
  rawLine?: string;
  hasWarning?: boolean;
}

export interface ParsedProtocolData {
  name: string;
  description?: string;
  daysOfWeek: string[];
  exercisesByDay: Record<string, ParsedExerciseItem[]>;
  totalExercises: number;
  sourceType: 'json-app' | 'json-backup' | 'csv' | 'markdown-table' | 'text-ai';
  warnings: string[];
}

export interface ExportedProtocolData {
  format: 'registrotreinos-protocol';
  version: 1;
  exportedAt: string;
  appName: string;
  protocol: {
    name: string;
    description?: string;
    isEnabled?: boolean;
    daysOfWeek: string[];
    exercises: Array<{
      name: string;
      muscleGroup?: string;
      category?: ExerciseCategory;
      multiplier?: number;
      order: number;
      sets?: number;
      reps?: number;
      dayOfWeek?: string;
      lastWeight?: number;
      lastReps?: number;
      pinnedNotes?: string;
    }>;
  };
}

/**
 * Remove formatação Markdown (negrito, itálico, marcadores de lista, numeração inicial)
 */
function cleanMarkdownAndSpecialChars(text: string): string {
  if (!text) return '';
  return text
    .replace(/^[\s*\-•\d.]+/g, '') // remove marcadores de lista "1. ", "- ", "* "
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove **negrito**
    .replace(/\*(.*?)\*/g, '$1') // remove *itálico*
    .replace(/__(.*?)__/g, '$1') // remove __negrito__
    .replace(/_(.*?)_/g, '$1') // remove _itálico_
    .replace(/`([^`]+)`/g, '$1') // remove `código`
    .replace(/[;,\t]/g, ' ') // normaliza pontuações internas para espaço
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte faixas de números (ex: "8-12", "8 a 12", "12,5", "10") para número final arredondado
 */
function parseNumericRange(val: unknown, fallback: number): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return fallback;

  const str = String(val).trim().replace(',', '.');
  
  // Faixa do tipo "8-12" ou "8 a 12" -> calcula média
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:-|a|to|–)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return Math.round((min + max) / 2);
    }
  }

  // Número simples
  const singleMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch && singleMatch[1]) {
    const num = parseFloat(singleMatch[1]);
    if (!isNaN(num)) return Math.round(num);
  }

  return fallback;
}

/**
 * Tenta extrair séries e repetições de padrões como "4x10", "3 x 8-12", "4 x 10-12 reps"
 */
function extractSetsAndRepsFromText(text: string): { sets: number; reps: number; cleanedName: string } {
  let sets = 3;
  let reps = 10;
  let cleanedName = text;

  // Padrão: 4x10, 4 x 10, 4x8-12, 3X15
  const match = text.match(/(\d+)\s*[xX×]\s*(\d+(?:\s*(?:-|a|–)\s*\d+)?)(?:\s*(?:reps?|repeti[çc][õo]es?|vezes))?/i);
  if (match && match[1] && match[2]) {
    sets = parseNumericRange(match[1], 3);
    reps = parseNumericRange(match[2], 10);
    // Remover a parte "4x10" do nome do exercício
    cleanedName = text.replace(match[0], '').trim();
  }

  return { sets, reps, cleanedName: cleanMarkdownAndSpecialChars(cleanedName) };
}

/**
 * Mapeia termos comuns para as chaves de dias da semana padronizadas ('mon', 'tue', etc.)
 */
export function mapDayToKey(rawDay: string): { key: string; label: string } {
  if (!rawDay) return { key: 'mon', label: 'Segunda-feira' };
  
  const norm = rawDay
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Mapeamento explícito de dias da semana
  if (norm.includes('seg') || norm.includes('mon')) return { key: 'mon', label: 'Segunda-feira' };
  if (norm.includes('ter') || norm.includes('tue')) return { key: 'tue', label: 'Terça-feira' };
  if (norm.includes('qua') || norm.includes('wed')) return { key: 'wed', label: 'Quarta-feira' };
  if (norm.includes('qui') || norm.includes('thu')) return { key: 'thu', label: 'Quinta-feira' };
  if (norm.includes('sex') || norm.includes('fri')) return { key: 'fri', label: 'Sexta-feira' };
  if (norm.includes('sab') || norm.includes('sat')) return { key: 'sat', label: 'Sábado' };
  if (norm.includes('dom') || norm.includes('sun')) return { key: 'sun', label: 'Domingo' };

  // Mapeamento de treinos por letras (Treino A -> Segunda, Treino B -> Terça, etc.)
  if (norm.includes('treino a') || norm.includes('dia 1') || norm.includes('push') || norm.includes('empurrar')) {
    return { key: 'mon', label: 'Segunda-feira' };
  }
  if (norm.includes('treino b') || norm.includes('dia 2') || norm.includes('pull') || norm.includes('puxar')) {
    return { key: 'tue', label: 'Terça-feira' };
  }
  if (norm.includes('treino c') || norm.includes('dia 3') || norm.includes('legs') || norm.includes('pernas')) {
    return { key: 'wed', label: 'Quarta-feira' };
  }
  if (norm.includes('treino d') || norm.includes('dia 4') || norm.includes('upper') || norm.includes('superior')) {
    return { key: 'thu', label: 'Quinta-feira' };
  }
  if (norm.includes('treino e') || norm.includes('dia 5') || norm.includes('lower') || norm.includes('inferior')) {
    return { key: 'fri', label: 'Sexta-feira' };
  }
  if (norm.includes('treino f') || norm.includes('dia 6')) {
    return { key: 'sat', label: 'Sábado' };
  }

  return { key: 'mon', label: 'Segunda-feira' };
}

/**
 * Parser Universal de Protocolos
 */
export function parseUniversalProtocolInput(rawInput: string): ParsedProtocolData {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('O conteúdo fornecido está vazio.');
  }

  // 1. TENTATIVA: JSON (Formato App, Backup ou Genérico)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return parseJSONProtocol(trimmed);
    } catch (e: unknown) {
      // Se for formato de texto iniciado por chave que falhou, continua para os outros parsers
      if (trimmed.startsWith('{') && trimmed.includes('"protocol"')) {
        throw new Error(`JSON inválido: ${e instanceof Error ? e.message : 'Erro de sintaxe'}`);
      }
    }
  }

  // 2. TENTATIVA: Tabela Markdown (delimitada por '|')
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pipeLines = lines.filter(l => l.includes('|'));
  if (pipeLines.length >= 2) {
    try {
      return parseMarkdownTable(lines);
    } catch {
      // Fallback para parser de texto
    }
  }

  // 3. TENTATIVA: Planilha Tabular / CSV / TSV
  const sampleLines = lines.slice(0, 10);
  const semiCount = sampleLines.reduce((acc, l) => acc + (l.split(';').length - 1), 0);
  const commaCount = sampleLines.reduce((acc, l) => acc + (l.split(',').length - 1), 0);
  const tabCount = sampleLines.reduce((acc, l) => acc + (l.split('\t').length - 1), 0);

  if (semiCount > sampleLines.length || commaCount > sampleLines.length || tabCount > sampleLines.length) {
    try {
      const delimiter = semiCount >= commaCount && semiCount >= tabCount ? ';' : (tabCount > commaCount ? '\t' : ',');
      return parseDelimitedTable(lines, delimiter);
    } catch {
      // Fallback para parser de texto livre
    }
  }

  // 4. TENTATIVA: Texto Livre / Gerado por Modelos de IA (ChatGPT, Gemini, etc.)
  return parseFreeTextWorkout(lines);
}

/**
 * Parser de JSON
 */
function parseJSONProtocol(jsonString: string): ParsedProtocolData {
  const parsed = JSON.parse(jsonString);
  const exercisesByDay: Record<string, ParsedExerciseItem[]> = {};
  const activeDaysSet = new Set<string>();
  const warnings: string[] = [];

  // Formato 1: registrotreinos-protocol
  if (parsed.format === 'registrotreinos-protocol' && parsed.protocol) {
    const p = parsed.protocol;
    const protocolName = p.name || 'Protocolo Importado';
    const days: string[] = Array.isArray(p.daysOfWeek) && p.daysOfWeek.length > 0 ? p.daysOfWeek : ['mon'];
    
    days.forEach((d: string) => {
      activeDaysSet.add(d);
      exercisesByDay[d] = [];
    });

    const exercises = Array.isArray(p.exercises) ? p.exercises : [];
    exercises.forEach((ex: { name?: string; muscleGroup?: string; category?: ExerciseCategory; multiplier?: number; sets?: number; reps?: number; dayOfWeek?: string; lastWeight?: number; pinnedNotes?: string }) => {
      if (!ex.name) return;
      const dayKey = ex.dayOfWeek && days.includes(ex.dayOfWeek) ? ex.dayOfWeek : days[0] || 'mon';
      activeDaysSet.add(dayKey);
      if (!exercisesByDay[dayKey]) exercisesByDay[dayKey] = [];

      const info = getExerciseInfo(ex.name, ex.muscleGroup);
      exercisesByDay[dayKey].push({
        id: crypto.randomUUID(),
        name: info.canonicalName,
        muscleGroup: ex.muscleGroup || info.muscleGroup,
        category: ex.category || info.category,
        multiplier: ex.multiplier !== undefined ? ex.multiplier : info.multiplier,
        sets: parseNumericRange(ex.sets, 3),
        reps: parseNumericRange(ex.reps, 10),
        dayKey,
        dayLabel: WEEK_DAYS.find(w => w.key === dayKey)?.label || 'Segunda-feira',
        pinnedNotes: ex.pinnedNotes
      });
    });

    const activeDays = Array.from(activeDaysSet);
    const totalExercises = Object.values(exercisesByDay).reduce((acc, list) => acc + list.length, 0);

    return {
      name: protocolName,
      description: p.description || '',
      daysOfWeek: activeDays.length > 0 ? activeDays : ['mon'],
      exercisesByDay,
      totalExercises,
      sourceType: 'json-app',
      warnings
    };
  }

  // Formato 2: Backup Geral contendo protocols e exercises
  if (Array.isArray(parsed.protocols) && parsed.protocols.length > 0) {
    const p = parsed.protocols[0]; // Pega o primeiro protocolo
    const protocolName = p.name || 'Protocolo Restaurado';
    const days: string[] = Array.isArray(p.daysOfWeek) && p.daysOfWeek.length > 0 ? p.daysOfWeek : ['mon'];
    
    days.forEach((d: string) => {
      activeDaysSet.add(d);
      exercisesByDay[d] = [];
    });

    const allExercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
    const protoExercises = allExercises.filter((e: { protocolId?: string }) => e.protocolId === p.id);

    (protoExercises.length > 0 ? protoExercises : allExercises).forEach((ex: { name?: string; muscleGroup?: string; category?: ExerciseCategory; multiplier?: number; sets?: number; reps?: number; dayOfWeek?: string }) => {
      if (!ex.name) return;
      const dayKey = ex.dayOfWeek && days.includes(ex.dayOfWeek) ? ex.dayOfWeek : days[0] || 'mon';
      activeDaysSet.add(dayKey);
      if (!exercisesByDay[dayKey]) exercisesByDay[dayKey] = [];

      const info = getExerciseInfo(ex.name, ex.muscleGroup);
      exercisesByDay[dayKey].push({
        id: crypto.randomUUID(),
        name: info.canonicalName,
        muscleGroup: ex.muscleGroup || info.muscleGroup,
        category: ex.category || info.category,
        multiplier: ex.multiplier !== undefined ? ex.multiplier : info.multiplier,
        sets: parseNumericRange(ex.sets, 3),
        reps: parseNumericRange(ex.reps, 10),
        dayKey,
        dayLabel: WEEK_DAYS.find(w => w.key === dayKey)?.label || 'Segunda-feira'
      });
    });

    const activeDays = Array.from(activeDaysSet);
    const totalExercises = Object.values(exercisesByDay).reduce((acc, list) => acc + list.length, 0);

    return {
      name: protocolName,
      description: p.description || '',
      daysOfWeek: activeDays.length > 0 ? activeDays : ['mon'],
      exercisesByDay,
      totalExercises,
      sourceType: 'json-backup',
      warnings
    };
  }

  throw new Error('O formato do arquivo JSON não contém um protocolo de treino válido.');
}

/**
 * Parser de Tabelas Markdown (| Coluna 1 | Coluna 2 |)
 */
function parseMarkdownTable(lines: string[]): ParsedProtocolData {
  const tableLines = lines
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && l.endsWith('|'))
    .map(l => l.slice(1, -1).split('|').map(c => c.trim()));

  if (tableLines.length < 2) {
    throw new Error('Tabela Markdown insuficiente.');
  }

  // Identificar índices de cabeçalho
  const rawHeaders = tableLines[0].map(h => cleanMarkdownAndSpecialChars(h).toLowerCase());
  
  let dayIdx = -1;
  let exIdx = -1;
  let setsIdx = -1;
  let repsIdx = -1;
  let muscleIdx = -1;

  rawHeaders.forEach((h, idx) => {
    if (h.includes('dia') || h.includes('treino') || h.includes('day') || h.includes('split') || h.includes('rotina')) dayIdx = idx;
    else if (h.includes('exerc') || h.includes('nome') || h.includes('name') || h.includes('movimento')) exIdx = idx;
    else if (h.includes('ser') || h.includes('set') || h.includes('serie')) setsIdx = idx;
    else if (h.includes('rep') || h.includes('faixa')) repsIdx = idx;
    else if (h.includes('grup') || h.includes('musc') || h.includes('muscle')) muscleIdx = idx;
  });

  // Se não achou a coluna de exercício pelo cabeçalho, tenta inferir
  if (exIdx === -1) {
    exIdx = 0; // Assume a primeira coluna como exercício
  }

  const exercisesByDay: Record<string, ParsedExerciseItem[]> = {};
  const activeDaysSet = new Set<string>();
  const warnings: string[] = [];

  // Pular cabeçalho e divisor "|---|---|"
  for (let i = 1; i < tableLines.length; i++) {
    const cols = tableLines[i];
    if (cols.some(c => c.includes('---'))) continue; // Divisor de tabela

    const rawExName = cols[exIdx] || '';
    if (!rawExName || rawExName.length < 2) continue;

    const { sets: extractedSets, reps: extractedReps, cleanedName } = extractSetsAndRepsFromText(rawExName);
    
    const sets = setsIdx !== -1 ? parseNumericRange(cols[setsIdx], extractedSets) : extractedSets;
    const reps = repsIdx !== -1 ? parseNumericRange(cols[repsIdx], extractedReps) : extractedReps;
    const muscle = muscleIdx !== -1 ? cleanMarkdownAndSpecialChars(cols[muscleIdx]) : undefined;
    const rawDay = dayIdx !== -1 ? cols[dayIdx] : 'mon';

    const { key: dayKey, label: dayLabel } = mapDayToKey(rawDay);
    activeDaysSet.add(dayKey);
    if (!exercisesByDay[dayKey]) exercisesByDay[dayKey] = [];

    const info = getExerciseInfo(cleanedName, muscle);
    exercisesByDay[dayKey].push({
      id: crypto.randomUUID(),
      name: info.canonicalName,
      muscleGroup: muscle || info.muscleGroup,
      category: info.category,
      multiplier: info.multiplier,
      sets: Math.max(1, sets),
      reps: Math.max(1, reps),
      dayKey,
      dayLabel,
      rawLine: tableLines[i].join(' | ')
    });
  }

  const activeDays = Array.from(activeDaysSet);
  const totalExercises = Object.values(exercisesByDay).reduce((acc, list) => acc + list.length, 0);

  if (totalExercises === 0) {
    throw new Error('Nenhum exercício válido encontrado na tabela Markdown.');
  }

  return {
    name: 'Protocolo Importado (Tabela)',
    daysOfWeek: activeDays.length > 0 ? activeDays : ['mon'],
    exercisesByDay,
    totalExercises,
    sourceType: 'markdown-table',
    warnings
  };
}

/**
 * Parser de Planilhas Delimitadas (CSV / TSV)
 */
function parseDelimitedTable(lines: string[], delimiter: string): ParsedProtocolData {
  const rows = lines.map(l => l.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));
  if (rows.length === 0) throw new Error('Planilha vazia.');

  const headers = rows[0].map(h => cleanMarkdownAndSpecialChars(h).toLowerCase());
  
  let dayIdx = -1;
  let exIdx = -1;
  let setsIdx = -1;
  let repsIdx = -1;
  let muscleIdx = -1;

  headers.forEach((h, idx) => {
    if (h.includes('dia') || h.includes('treino') || h.includes('day') || h.includes('split')) dayIdx = idx;
    else if (h.includes('exerc') || h.includes('nome') || h.includes('name')) exIdx = idx;
    else if (h.includes('ser') || h.includes('set')) setsIdx = idx;
    else if (h.includes('rep')) repsIdx = idx;
    else if (h.includes('grup') || h.includes('musc')) muscleIdx = idx;
  });

  const startIndex = (dayIdx !== -1 || exIdx !== -1 || setsIdx !== -1) ? 1 : 0;
  if (exIdx === -1) exIdx = 0;

  const exercisesByDay: Record<string, ParsedExerciseItem[]> = {};
  const activeDaysSet = new Set<string>();

  for (let i = startIndex; i < rows.length; i++) {
    const cols = rows[i];
    const rawExName = cols[exIdx] || '';
    if (!rawExName || rawExName.length < 2) continue;

    const { sets: extractedSets, reps: extractedReps, cleanedName } = extractSetsAndRepsFromText(rawExName);
    
    const sets = setsIdx !== -1 ? parseNumericRange(cols[setsIdx], extractedSets) : extractedSets;
    const reps = repsIdx !== -1 ? parseNumericRange(cols[repsIdx], extractedReps) : extractedReps;
    const muscle = muscleIdx !== -1 ? cleanMarkdownAndSpecialChars(cols[muscleIdx]) : undefined;
    const rawDay = dayIdx !== -1 ? cols[dayIdx] : 'mon';

    const { key: dayKey, label: dayLabel } = mapDayToKey(rawDay);
    activeDaysSet.add(dayKey);
    if (!exercisesByDay[dayKey]) exercisesByDay[dayKey] = [];

    const info = getExerciseInfo(cleanedName, muscle);
    exercisesByDay[dayKey].push({
      id: crypto.randomUUID(),
      name: info.canonicalName,
      muscleGroup: muscle || info.muscleGroup,
      category: info.category,
      multiplier: info.multiplier,
      sets: Math.max(1, sets),
      reps: Math.max(1, reps),
      dayKey,
      dayLabel,
      rawLine: cols.join(delimiter)
    });
  }

  const activeDays = Array.from(activeDaysSet);
  const totalExercises = Object.values(exercisesByDay).reduce((acc, list) => acc + list.length, 0);

  if (totalExercises === 0) {
    throw new Error('Nenhum exercício válido encontrado no arquivo CSV/TSV.');
  }

  return {
    name: 'Protocolo Importado (Planilha)',
    daysOfWeek: activeDays.length > 0 ? activeDays : ['mon'],
    exercisesByDay,
    totalExercises,
    sourceType: 'csv',
    warnings: []
  };
}

/**
 * Parser de Texto Livre / Modelos de IA (ChatGPT, Gemini, etc.)
 */
function parseFreeTextWorkout(lines: string[]): ParsedProtocolData {
  let currentDay = 'mon';
  let currentDayLabel = 'Segunda-feira';
  const exercisesByDay: Record<string, ParsedExerciseItem[]> = {};
  const activeDaysSet = new Set<string>();
  const warnings: string[] = [];

  const protocolName = 'Protocolo Personalizado (IA)';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) continue;

    // Verificar se é título de treino/dia (ex: "Treino A - Peito", "Segunda-feira:", "Push Day:")
    const sectionMatch = trimmed.match(/^(?:treino\s*([a-g])|dia\s*(\d)|segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo|push|pull|legs|superior|inferior|upper|lower)/i);
    const hasColonOrHeader = trimmed.endsWith(':') || trimmed.startsWith('#') || !!sectionMatch;

    if (hasColonOrHeader && !trimmed.match(/\d+\s*[xX×]\s*\d+/)) {
      const { key, label } = mapDayToKey(trimmed);
      currentDay = key;
      currentDayLabel = label;
      activeDaysSet.add(key);
      if (!exercisesByDay[key]) exercisesByDay[key] = [];
      continue;
    }

    // Processar linha como exercício
    const { sets, reps, cleanedName } = extractSetsAndRepsFromText(trimmed);
    if (!cleanedName || cleanedName.length < 2) continue;

    activeDaysSet.add(currentDay);
    if (!exercisesByDay[currentDay]) exercisesByDay[currentDay] = [];

    const info = getExerciseInfo(cleanedName);
    exercisesByDay[currentDay].push({
      id: crypto.randomUUID(),
      name: info.canonicalName,
      muscleGroup: info.muscleGroup,
      category: info.category,
      multiplier: info.multiplier,
      sets: Math.max(1, sets),
      reps: Math.max(1, reps),
      dayKey: currentDay,
      dayLabel: currentDayLabel,
      rawLine: trimmed
    });
  }

  const activeDays = Array.from(activeDaysSet);
  const totalExercises = Object.values(exercisesByDay).reduce((acc, list) => acc + list.length, 0);

  if (totalExercises === 0) {
    throw new Error('Não foi possível identificar exercícios válidos no texto informado. Experimente usar os modelos de exemplo.');
  }

  return {
    name: protocolName,
    daysOfWeek: activeDays.length > 0 ? activeDays : ['mon'],
    exercisesByDay,
    totalExercises,
    sourceType: 'text-ai',
    warnings
  };
}
