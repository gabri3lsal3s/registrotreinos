import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getExercisesByProtocol, addExercise, type Exercise } from '../services/workoutDB';

export default function ExercisesPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (protocolId) {
      loadExercises();
    }
  }, [protocolId]);

  async function loadExercises() {
    if (!protocolId) return;
    try {
      const data = await getExercisesByProtocol(protocolId);
      setExercises(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!protocolId || !newName.trim()) return;

    try {
      await addExercise({
        protocolId,
        name: newName.trim(),
        muscleGroup: newMuscle.trim(),
        order: exercises.length + 1,
      });
      setNewName('');
      setNewMuscle('');
      loadExercises();
    } catch (err) {
      alert('Erro ao adicionar exercício');
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/protocols')} className="text-gray-400 hover:text-white transition-colors text-2xl">←</button>
          <h2 className="text-2xl font-bold text-neonBlue">Exercícios do Protocolo</h2>
        </div>

        <form onSubmit={handleAddExercise} className="bg-[#23262F] p-5 rounded-2xl border border-gray-800 mb-8 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Nome do Exercício (ex: Supino Reto)"
            className="bg-[#181A20] border border-gray-800 p-3 rounded-xl focus:outline-neonBlue w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Grupo Muscular (ex: Peito)"
            className="bg-[#181A20] border border-gray-800 p-3 rounded-xl focus:outline-neonBlue w-full"
            value={newMuscle}
            onChange={(e) => setNewMuscle(e.target.value)}
          />
          <button type="submit" className="bg-neonBlue text-black font-bold py-3 rounded-xl hover:bg-limeGreen transition-all">
            Adicionar Exercício
          </button>
        </form>

        <button 
          onClick={() => navigate(`/workout/${protocolId}`)}
          className="w-full mb-8 bg-limeGreen text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-limeGreen/10 hover:brightness-110 active:scale-95 transition-all"
        >
          INICIAR TREINO 🔥
        </button>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Carregando...</div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-20 bg-[#23262F]/50 rounded-3xl border border-dashed border-gray-800 text-gray-400">
            Nenhum exercício cadastrado.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {exercises.map((ex, index) => (
              <div key={ex.id} className="bg-[#23262F] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 font-mono text-sm">{index + 1}</span>
                  <div>
                    <h4 className="font-bold">{ex.name}</h4>
                    <p className="text-xs text-limeGreen uppercase tracking-tighter">{ex.muscleGroup}</p>
                  </div>
                </div>
                <div className="text-gray-600">⋮</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
