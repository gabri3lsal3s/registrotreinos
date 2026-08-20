import { db } from './workoutDB';
import { fullSync } from './syncService';
import type { Protocol, Exercise, Workout, WorkoutSet, BodyWeight } from '../types';
import { calculateVolume, parseLocaleNumber } from '../utils/workoutMath';

export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  userId: string;
  protocols: Protocol[];
  exercises: Exercise[];
  workouts: Workout[];
  workoutSets: WorkoutSet[];
  bodyWeights: BodyWeight[];
}

export interface PendingSyncCounts {
  protocols: number;
  exercises: number;
  workouts: number;
  workoutSets: number;
  bodyWeights: number;
  total: number;
}

/**
 * Retorna contadores de itens locais não sincronizados para o usuário.
 */
export async function getPendingSyncCounts(userId: string): Promise<PendingSyncCounts> {
  const protocols = await db.protocols.where({ userId, isSynced: false }).count();
  
  // Buscar IDs de protocolos e treinos do usuário para escopar exercícios e séries
  const userProtocols = await db.protocols.where('userId').equals(userId).toArray();
  const protocolIds = userProtocols.map(p => p.id);
  
  const exercises = protocolIds.length > 0
    ? await db.exercises.where('protocolId').anyOf(protocolIds).and(e => !e.isSynced).count()
    : 0;

  const workouts = await db.workouts.where({ userId, isSynced: false }).count();
  
  const userWorkouts = await db.workouts.where('userId').equals(userId).toArray();
  const workoutIds = userWorkouts.map(w => w.id);

  const workoutSets = workoutIds.length > 0
    ? await db.workoutSets.where('workoutId').anyOf(workoutIds).and(s => !s.isSynced).count()
    : 0;

  const bodyWeights = await db.bodyWeights.where({ userId, isSynced: false }).count();

  return {
    protocols,
    exercises,
    workouts,
    workoutSets,
    bodyWeights,
    total: protocols + exercises + workouts + workoutSets + bodyWeights
  };
}

/**
 * Exporta todos os dados do usuário em formato JSON estruturado.
 */
export async function exportBackupJSON(userId: string): Promise<void> {
  const protocols = await db.protocols.where('userId').equals(userId).toArray();
  const protocolIds = protocols.map(p => p.id);

  const exercises = protocolIds.length > 0
    ? await db.exercises.where('protocolId').anyOf(protocolIds).toArray()
    : [];

  const workouts = await db.workouts.where('userId').equals(userId).toArray();
  const workoutIds = workouts.map(w => w.id);

  const workoutSets = workoutIds.length > 0
    ? await db.workoutSets.where('workoutId').anyOf(workoutIds).toArray()
    : [];

  const bodyWeights = await db.bodyWeights.where('userId').equals(userId).toArray();

  const backupData: BackupData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    userId,
    protocols,
    exercises,
    workouts,
    workoutSets,
    bodyWeights
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(backupData, null, 2)
  )}`;

  const nowStr = new Date().toISOString().slice(0, 10);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `registro_treinos_backup_${nowStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Sanitiza valores para exportação CSV contra CSV Formula Injection (CWE-1236).
 * Se o valor iniciar com =, +, -, @ ou tabulação, prefixa com apóstrofo '.
 */
function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const trimmed = str.trimStart();
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  
  if (dangerousChars.some(char => trimmed.startsWith(char))) {
    return `'${str}`;
  }
  return str;
}

/**
 * Exporta histórico completo de treinos em formato CSV legível para planilhas.
 */
export async function exportWorkoutHistoryCSV(userId: string): Promise<void> {
  const protocols = await db.protocols.where('userId').equals(userId).toArray();
  const protocolMap = new Map(protocols.map(p => [p.id, p.name]));

  const protocolIds = protocols.map(p => p.id);
  const exercises = protocolIds.length > 0
    ? await db.exercises.where('protocolId').anyOf(protocolIds).toArray()
    : [];
  const exerciseMap = new Map(exercises.map(e => [e.id, e]));

  const workouts = await db.workouts
    .where('userId')
    .equals(userId)
    .and(w => w.status === 'completed')
    .toArray();
  workouts.sort((a, b) => a.date - b.date);

  const workoutIds = workouts.map(w => w.id);
  const sets = workoutIds.length > 0
    ? await db.workoutSets.where('workoutId').anyOf(workoutIds).toArray()
    : [];
  sets.sort((a, b) => a.timestamp - b.timestamp);

  const setsByWorkout = new Map<string, WorkoutSet[]>();
  sets.forEach(s => {
    if (!setsByWorkout.has(s.workoutId)) setsByWorkout.set(s.workoutId, []);
    setsByWorkout.get(s.workoutId)!.push(s);
  });

  const headers = [
    'Data',
    'Horario',
    'Protocolo',
    'Exercicio',
    'Categoria',
    'Serie',
    'Tipo',
    'Carga (kg)',
    'Repeticoes',
    'Volume (kg)',
    'Notas do Exercicio',
    'Humor (1-5)',
    'Qualidade Sono (1-5)',
    'Esforco (1-5)',
    'Notas do Treino'
  ];

  const rows: string[][] = [];

  for (const w of workouts) {
    const wDate = new Date(w.date);
    const dateStr = wDate.toLocaleDateString('pt-BR');
    const timeStr = wDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const pName = protocolMap.get(w.protocolId) || 'Protocolo Personalizado';
    const wSets = setsByWorkout.get(w.id) || [];

    for (const s of wSets) {
      const ex = exerciseMap.get(s.exerciseId);
      const exName = ex ? ex.name.split(' (')[0] : 'Exercício';
      const category = ex?.category || 'weight';
      const vol = calculateVolume(s.weight, s.reps, category);

      rows.push([
        dateStr,
        timeStr,
        `"${sanitizeCsvField(pName).replace(/"/g, '""')}"`,
        `"${sanitizeCsvField(exName).replace(/"/g, '""')}"`,
        category,
        String(s.setIndex + 1),
        s.type || 'normal',
        String(s.weight),
        String(s.reps),
        String(Math.round(vol)),
        `"${sanitizeCsvField(s.notes || '').replace(/"/g, '""')}"`,
        w.mood ? String(w.mood) : '',
        w.sleepQuality ? String(w.sleepQuality) : '',
        w.stressLevel ? String(w.stressLevel) : '',
        `"${sanitizeCsvField(w.notes || '').replace(/"/g, '""')}"`
      ]);
    }
  }

  // UTF-8 BOM para suporte perfeito a acentos no Excel / Google Sheets
  const csvContent = '\uFEFF' + [
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const nowStr = new Date().toISOString().slice(0, 10);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `registro_treinos_historico_${nowStr}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Importa e restaura backup JSON no banco IndexedDB local.
 */
export async function importBackupJSON(
  jsonContent: string,
  userId: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ importedCount: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    throw new Error('Arquivo JSON inválido ou corrompido.');
  }

  const data = parsed as Partial<BackupData>;

  if (!data.protocols || !Array.isArray(data.protocols)) {
    throw new Error('Estrutura de backup incompatível: protocolos ausentes.');
  }

  let totalImported = 0;

  await db.transaction('rw', [db.protocols, db.exercises, db.workouts, db.workoutSets, db.bodyWeights], async () => {
    if (mode === 'replace') {
      // Remover dados antigos do usuário no dispositivo
      const oldProtocols = await db.protocols.where('userId').equals(userId).toArray();
      const oldProtocolIds = oldProtocols.map(p => p.id);
      if (oldProtocolIds.length > 0) {
        await db.exercises.where('protocolId').anyOf(oldProtocolIds).delete();
      }
      await db.protocols.where('userId').equals(userId).delete();

      const oldWorkouts = await db.workouts.where('userId').equals(userId).toArray();
      const oldWorkoutIds = oldWorkouts.map(w => w.id);
      if (oldWorkoutIds.length > 0) {
        await db.workoutSets.where('workoutId').anyOf(oldWorkoutIds).delete();
      }
      await db.workouts.where('userId').equals(userId).delete();
      await db.bodyWeights.where('userId').equals(userId).delete();
    }

    // Inserir Protocolos
    for (const p of data.protocols || []) {
      if (!p || typeof p !== 'object' || !p.name) continue;
      await db.protocols.put({
        ...p,
        id: p.id || crypto.randomUUID(),
        userId,
        name: String(p.name).trim(),
        createdAt: Number(p.createdAt) || Date.now(),
        updatedAt: Number(p.updatedAt) || Date.now(),
        isEnabled: p.isEnabled !== undefined ? Boolean(p.isEnabled) : true,
        daysOfWeek: Array.isArray(p.daysOfWeek) ? p.daysOfWeek : [],
        isSynced: false
      });
      totalImported++;
    }

    // Inserir Exercícios
    for (const ex of data.exercises || []) {
      if (!ex || typeof ex !== 'object' || !ex.name || !ex.protocolId) continue;
      await db.exercises.put({
        ...ex,
        id: ex.id || crypto.randomUUID(),
        protocolId: String(ex.protocolId),
        name: String(ex.name).trim(),
        category: ex.category || 'weight',
        sets: parseLocaleNumber(ex.sets, 3),
        reps: parseLocaleNumber(ex.reps, 10),
        order: Number(ex.order) || 0,
        lastWeight: parseLocaleNumber(ex.lastWeight, 0),
        lastReps: parseLocaleNumber(ex.lastReps, 0),
        isSynced: false
      });
      totalImported++;
    }

    // Inserir Treinos
    for (const w of data.workouts || []) {
      if (!w || typeof w !== 'object' || !w.protocolId) continue;
      await db.workouts.put({
        ...w,
        id: w.id || crypto.randomUUID(),
        userId,
        protocolId: String(w.protocolId),
        date: Number(w.date) || Date.now(),
        status: w.status || 'completed',
        isSynced: false
      });
      totalImported++;
    }

    // Inserir Séries
    for (const s of data.workoutSets || []) {
      if (!s || typeof s !== 'object' || !s.workoutId || !s.exerciseId) continue;
      await db.workoutSets.put({
        ...s,
        id: s.id || crypto.randomUUID(),
        workoutId: String(s.workoutId),
        exerciseId: String(s.exerciseId),
        setIndex: Number(s.setIndex) || 0,
        weight: parseLocaleNumber(s.weight, 0),
        reps: parseLocaleNumber(s.reps, 0),
        timestamp: Number(s.timestamp) || Date.now(),
        isSynced: false
      });
      totalImported++;
    }

    // Inserir Pesagens
    for (const bw of data.bodyWeights || []) {
      if (!bw || typeof bw !== 'object' || bw.weight === undefined) continue;
      await db.bodyWeights.put({
        ...bw,
        id: bw.id || crypto.randomUUID(),
        userId,
        weight: parseLocaleNumber(bw.weight, 70),
        date: Number(bw.date) || Date.now(),
        isSynced: false
      });
      totalImported++;
    }
  });

  // Disparar sincronização em background
  fullSync().catch(console.error);

  return { importedCount: totalImported };
}
