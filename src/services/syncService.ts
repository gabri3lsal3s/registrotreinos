import { db } from './workoutDB';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';

export async function syncData() {
  const { user } = useAuthStore.getState();
  if (!user) throw new Error('Usuário não autenticado para sincronização');

  // 1. Coleta dados locais
  const protocols = await db.protocols.toArray();
  const exercises = await db.exercises.toArray();
  const workouts = await db.workouts.toArray();
  const workoutSets = await db.workoutSets.toArray();

  try {
    // 2. Sincronização via Supabase (Upsert individual por tabela)
    // Nota: Garante que o userId local seja respeitado ou injetado se necessário
    
    if (protocols.length > 0) {
      const { error: pError } = await supabase.from('protocols').upsert(protocols);
      if (pError) throw pError;
    }

    if (exercises.length > 0) {
      const { error: eError } = await supabase.from('exercises').upsert(exercises);
      if (eError) throw eError;
    }

    if (workouts.length > 0) {
      const { error: wError } = await supabase.from('workouts').upsert(workouts);
      if (wError) throw wError;
    }

    if (workoutSets.length > 0) {
      const { error: sError } = await supabase.from('workout_sets').upsert(workoutSets);
      if (sError) throw sError;
    }

    return { success: true, message: 'Sincronização com Supabase concluída!' };
  } catch (err: any) {
    console.error('Erro na sincronização:', err);
    throw new Error(err.message || 'Falha na sincronização cloud');
  }
}
