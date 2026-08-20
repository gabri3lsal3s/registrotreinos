import { db } from './workoutDB';
import { syncData } from './syncService';
import { toast } from 'sonner';
import type { WorkoutSet } from '../types';

/**
 * recoveryService.ts
 * Este serviço detecta séries de exercícios que perderam o vínculo com seus exercícios originais
 * (geralmente após uma edição de protocolo que deletou e recriou os IDs) e tenta
 * reconstruir essas pontes usando o "Matching" por ordem de execução.
 */

export async function runHistoryRecovery(): Promise<void> {
  // 1. Fix corrupted protocolIds from previous soft-delete implementation
  await fixArchivedExercises();

  // 2. Fix orphaned workoutSets
  try {
    const allSets = await db.workoutSets.toArray();
    const allExercises = await db.exercises.toArray();
    const exerciseIds = new Set(allExercises.map(ex => ex.id));

    // Identificar sets órfãos (não encontram seu exerciseId)
    const orphans = allSets.filter(s => !exerciseIds.has(s.exerciseId));

    if (orphans.length === 0) {
      return;
    }

    // workoutId -> { oldExId -> WorkoutSet[] }
    const orphansByWorkout: Record<string, Record<string, WorkoutSet[]>> = {};

    for (const orphan of orphans) {
      if (!orphansByWorkout[orphan.workoutId]) {
        orphansByWorkout[orphan.workoutId] = {};
      }
      if (!orphansByWorkout[orphan.workoutId][orphan.exerciseId]) {
        orphansByWorkout[orphan.workoutId][orphan.exerciseId] = [];
      }
      orphansByWorkout[orphan.workoutId][orphan.exerciseId].push(orphan);
    }

    let recoveredCount = 0;

    // Para cada treino afetado, tentar o remendo
    for (const workoutId of Object.keys(orphansByWorkout)) {
      const workout = await db.workouts.get(workoutId);
      if (!workout) continue;

      const currentExercises = await db.exercises
        .where('protocolId')
        .equals(workout.protocolId)
        .sortBy('order');

      if (currentExercises.length === 0) {
         const archivedExercises = await db.exercises
            .where('protocolId')
            .equals(workout.protocolId)
            .and(ex => ex.isArchived === true)
            .sortBy('order');
         
         if (archivedExercises.length > 0) {
            currentExercises.push(...archivedExercises);
         } else {
            continue; 
         }
      }

      const oldExIdsInWorkout = Object.keys(orphansByWorkout[workoutId]);
      
      const oldExSortedByTime = oldExIdsInWorkout.map(oldId => {
        const sets = orphansByWorkout[workoutId][oldId];
        const avgTimestamp = sets.reduce((sum, s) => sum + s.timestamp, 0) / sets.length;
        return { oldId, avgTimestamp };
      }).sort((a, b) => a.avgTimestamp - b.avgTimestamp);

      for (let i = 0; i < oldExSortedByTime.length; i++) {
        const { oldId } = oldExSortedByTime[i];
        const targetEx = currentExercises[i] || currentExercises[currentExercises.length - 1];
        
        if (targetEx) {
          const setsToUpdate = orphansByWorkout[workoutId][oldId];
          for (const s of setsToUpdate) {
            await db.workoutSets.update(s.id, { 
              exerciseId: targetEx.id,
              isSynced: false 
            });
            recoveredCount++;
          }
        }
      }
    }

    if (recoveredCount > 0) {
      toast.success(`${recoveredCount} registros de histórico recuperados com sucesso!`, {
        description: 'Seus nomes de exercícios foram restaurados.',
        duration: 5000
      });
      await syncData().catch(() => {});
    }

  } catch (err) {
    console.error('[Recovery] Erro crítico no script de recuperação:', err);
  }
}

async function fixArchivedExercises(): Promise<void> {
  const corrupted = await db.exercises
    .toCollection()
    .filter(ex => typeof ex.protocolId === 'string' && ex.protocolId.startsWith('archived_'))
    .toArray();

  if (corrupted.length > 0) {
    for (const ex of corrupted) {
      const realId = ex.protocolId.replace('archived_', '');
      await db.exercises.update(ex.id, {
        protocolId: realId,
        isArchived: true,
        isSynced: false
      });
    }
  }
}
