import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getWorkoutHistory, type Workout } from '../services/workoutDB';

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  async function loadHistory() {
    if (!user) return;
    try {
      const data = await getWorkoutHistory(user.id);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-neonBlue">Histórico de Treinos</h2>
        
        {loading ? (
          <div className="text-center py-10 text-gray-500">Buscando seus dados...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 bg-[#23262F]/50 rounded-3xl border border-dashed border-gray-800 text-gray-400">
            Nenhum treino registrado ainda. Que tal começar um hoje?
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map((workout: Workout) => (
              <div key={workout.id} className="bg-[#23262F] p-5 rounded-2xl border border-gray-800 hover:border-limeGreen transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">Braços & Ombro</h3>
                  <span className="text-[10px] bg-limeGreen/20 text-limeGreen px-2 py-0.5 rounded font-bold">
                    {workout.mood || 5}/5 🔥
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>📅 {new Date(workout.date).toLocaleDateString()}</span>
                  <span>⏱️ 54 min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
