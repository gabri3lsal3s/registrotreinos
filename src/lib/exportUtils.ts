import { db } from '../services/workoutDB';

export async function exportUserData(userId: string) {
  try {
    const [protocols, exercises, workouts, sets] = await Promise.all([
      db.protocols.where('userId').equals(userId).toArray(),
      db.protocols.where('userId').equals(userId).toArray().then(async (ps) => {
        const ids = ps.map(p => p.id);
        return db.exercises.where('protocolId').anyOf(ids).toArray();
      }),
      db.workouts.where('userId').equals(userId).toArray(),
      db.workouts.where('userId').equals(userId).toArray().then(async (ws) => {
        const ids = ws.map(w => w.id);
        return db.workoutSets.where('workoutId').anyOf(ids).toArray();
      }),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      userId,
      protocols,
      exercises,
      workouts,
      sets,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `treinos_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    throw error;
  }
}
