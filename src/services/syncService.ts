import { db } from './workoutDB';
import { useAuthStore } from './authStore';

const API_URL = 'http://localhost:4005/api/sync';

export async function syncData() {
  const { token, user } = useAuthStore.getState();
  if (!token || !user) throw new Error('Usuário não autenticado para sincronização');

  // 1. Coleta dados locais
  const protocols = await db.protocols.toArray();
  const exercises = await db.exercises.toArray();
  const workouts = await db.workouts.toArray();
  const workoutSets = await db.workoutSets.toArray();

  const payload = {
    protocols,
    exercises,
    workouts,
    workoutSets,
  };

  // 2. Envia para o backend
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Falha na sincronização com o servidor');
  }

  const serverData = await response.json();

  // 3. Merge de dados (Lógica simplificada: Sobrescreve local com o que vem do servidor se houver conflito ou novos dados)
  // Nota: Numa App real, usaríamos timestamps (updatedAt) para um merge inteligente.
  
  await db.transaction('rw', db.protocols, db.exercises, db.workouts, db.workoutSets, async () => {
    // Limpa ou atualiza baseado no retorno
    // Para simplificar PWA Offline-First, vamos apenas atualizar o que o servidor mandou de novo
    if (serverData.protocols) {
      for (const p of serverData.protocols) {
        await db.protocols.put(p);
      }
    }
    if (serverData.exercises) {
      for (const e of serverData.exercises) {
        await db.exercises.put(e);
      }
    }
    if (serverData.workouts) {
      for (const w of serverData.workouts) {
        await db.workouts.put(w);
      }
    }
    if (serverData.workout_sets) { // Backend usa snake_case em algumas rotas
      for (const s of serverData.workout_sets) {
        await db.workoutSets.put(s);
      }
    }
  });

  return { success: true, message: 'Sincronização concluída!' };
}
