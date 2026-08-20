import { db, getExercisesByProtocol } from './workoutDB';
import { fullSync } from './syncService';
import { WEEK_DAYS } from '../utils/constants';
import type { ParsedProtocolData, ExportedProtocolData } from './universalProtocolParser';

/**
 * Sanitiza strings para uso seguro em nomes de arquivos baixados
 */
function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'protocolo';
}

/**
 * Exporta um protocolo específico e seus exercícios no formato JSON padronizado
 */
export async function exportProtocolJSON(protocolId: string): Promise<void> {
  const protocol = await db.protocols.get(protocolId);
  if (!protocol) {
    throw new Error('Protocolo não encontrado para exportação.');
  }

  const rawExercises = await getExercisesByProtocol(protocolId);
  
  // Limpar dados de controle local e formatar exercícios
  const exercises = rawExercises.map(ex => {
    // Extrai o nome base removendo o sufixo do dia "(Segunda)" caso exista
    const cleanName = ex.name.replace(/\s*\([^)]*\)$/, '').trim();
    return {
      name: cleanName,
      muscleGroup: ex.muscleGroup,
      category: ex.category || 'weight',
      multiplier: ex.multiplier !== undefined ? ex.multiplier : 1.0,
      order: ex.order || 0,
      sets: ex.sets || 3,
      reps: ex.reps || 10,
      dayOfWeek: ex.dayOfWeek,
      lastWeight: ex.lastWeight,
      lastReps: ex.lastReps
    };
  });

  const exportPayload: ExportedProtocolData = {
    format: 'registrotreinos-protocol',
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'Registro de Treinos PWA',
    protocol: {
      name: protocol.name,
      description: protocol.description || '',
      isEnabled: protocol.isEnabled ?? true,
      daysOfWeek: protocol.daysOfWeek || ['mon'],
      exercises
    }
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportPayload, null, 2)
  )}`;

  const safeName = sanitizeFileName(protocol.name);
  const nowStr = new Date().toISOString().slice(0, 10);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `protocolo_${safeName}_${nowStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Salva um protocolo importado de forma atômica no banco Dexie e sincroniza em background
 */
export async function saveImportedProtocol(
  data: ParsedProtocolData,
  userId: string,
  customName?: string,
  isEnabled = true
): Promise<string> {
  if (!userId) throw new Error('Usuário não autenticado.');
  if (data.totalExercises === 0) throw new Error('O protocolo precisa conter pelo menos um exercício.');

  const newProtocolId = crypto.randomUUID();
  const now = Date.now();
  const finalProtocolName = (customName || data.name || 'Protocolo Importado').trim();
  const daysOfWeek = data.daysOfWeek.length > 0 ? data.daysOfWeek : ['mon'];

  await db.transaction('rw', [db.protocols, db.exercises], async () => {
    // 1. Inserir Protocolo com novos metadados
    await db.protocols.add({
      id: newProtocolId,
      userId,
      name: finalProtocolName,
      description: data.description || '',
      isEnabled,
      daysOfWeek,
      createdAt: now,
      updatedAt: now,
      isSynced: false
    });

    // 2. Inserir Exercícios vinculados
    for (const dayKey of daysOfWeek) {
      const dayLabel = WEEK_DAYS.find(w => w.key === dayKey)?.label || dayKey;
      const dayExercises = data.exercisesByDay[dayKey] || [];

      for (let i = 0; i < dayExercises.length; i++) {
        const item = dayExercises[i];
        const newExId = crypto.randomUUID();
        
        await db.exercises.add({
          id: newExId,
          protocolId: newProtocolId,
          name: `${item.name.trim()} (${dayLabel})`,
          muscleGroup: item.muscleGroup || undefined,
          category: item.category || 'weight',
          multiplier: item.multiplier !== undefined ? Number(item.multiplier) : 1.0,
          order: i,
          dayOfWeek: dayKey,
          sets: item.sets || 3,
          reps: item.reps || 10,
          lastWeight: 0,
          lastReps: 0,
          isSynced: false
        });
      }
    }
  });

  // 3. Disparo assíncrono não bloqueante de sincronização
  fullSync().catch(console.error);

  return newProtocolId;
}
