import { db } from './workoutDB';
import { syncData } from './syncService';
import { toast } from 'sonner';

/**
 * recoveryService.ts
 * Este serviço detecta séries de exercícios que perderam o vínculo com seus exercícios originais
 * (geralmente após uma edição de protocolo que deletou e recriou os IDs) e tenta
 * reconstruir essas pontes usando o "Matching" por ordem de execução.
 */

export async function runHistoryRecovery() {
  
  // 1. Fix corrupted protocolIds from previous soft-delete implementation
  await fixArchivedExercises();

  // 2. Fix orphaned workoutSets
  try {
    // 1. Buscar todos os sets
    const allSets = await db.workoutSets.toArray();
    const allExercises = await db.exercises.toArray();
    const exerciseIds = new Set(allExercises.map(ex => ex.id));

    // 2. Identificar sets órfãos (não encontram seu exerciseId)
    const orphans = allSets.filter(s => !exerciseIds.has(s.exerciseId));

    if (orphans.length === 0) {
      return;
    }

    console.log(`[Recovery] Detectados ${orphans.length} sets órfãos. Iniciando reconstrução...`);

    // 3. Agrupar órfãos por Workout e por ID antigo
    // workoutId -> { oldExId -> WorkoutSet[] }
    const orphansByWorkout: Record<string, Record<string, any[]>> = {};

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

    // 4. Para cada treino afetado, tentar o remendo
    for (const workoutId of Object.keys(orphansByWorkout)) {
      const workout = await db.workouts.get(workoutId);
      if (!workout) continue;

      // Pegar os exercícios atuais deste protocolo
      const currentExercises = await db.exercises
        .where('protocolId')
        .equals(workout.protocolId)
        .sortBy('order');

      if (currentExercises.length === 0) {
         // Se o protocolo também sumiu ou não tem exercícios, tentamos o "arquivamento" (lookup em archived_*)
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

      // Precisamos mapear os OLD IDs pros NEW IDs.
      // Heurística: Ordenamos os OLD IDs pela média de timestamp das séries
      // e comparamos com a ordem (index) dos exercícios atuais.
      const oldExIdsInWorkout = Object.keys(orphansByWorkout[workoutId]);
      
      const oldExSortedByTime = oldExIdsInWorkout.map(oldId => {
        const sets = orphansByWorkout[workoutId][oldId];
        const avgTimestamp = sets.reduce((sum, s) => sum + s.timestamp, 0) / sets.length;
        return { oldId, avgTimestamp };
      }).sort((a, b) => a.avgTimestamp - b.avgTimestamp);

      // Agora fazemos o ZIP (OldId[0] -> NewId[0])
      for (let i = 0; i < oldExSortedByTime.length; i++) {
        const { oldId } = oldExSortedByTime[i];
        
        // Se temos um exercício atual na mesma posição de ordem, usamos ele
        // Caso tenhamos menos exercícios novos do que velhos, prendemos no último conhecido
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
      // Tenta sincronizar a correção com o Supabase
      await syncData().catch(() => {});
    }

  } catch (err) {
    console.error('[Recovery] Erro crítico no script de recuperação:', err);
  }
}

async function fixArchivedExercises() {
  // Buscar todos os exercícios que tenham o prefixo 'archived_' no protocolId
  // Nota: protocolId em Supabase é UUID, então 'archived_' quebra o sync.
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
        isSynced: false // Forçar PUSH com o dado corrigido
      });
    }
  }
}
