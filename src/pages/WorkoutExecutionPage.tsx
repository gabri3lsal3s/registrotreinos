import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  getExercisesByProtocol, 
  startWorkout, 
  addWorkoutSet, 
  type Exercise 
} from '../services/workoutDB';
import { useAuth } from '../hooks/useAuth';

export default function WorkoutExecutionPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  
  // Form fields
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('8');
  
  const restIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (showRestTimer && restTimer > 0) {
      restIntervalRef.current = window.setInterval(() => {
        setRestTimer(t => t > 0 ? t - 1 : 0);
      }, 1000);
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
  }, [showRestTimer, restTimer]);

  useEffect(() => {
    if (protocolId && user) {
      initWorkout();
    }
  }, [protocolId, user]);

  useEffect(() => {
    let interval: number;
    if (!isPaused) {
      interval = window.setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  async function initWorkout() {
    if (!protocolId || !user) return;
    try {
      const exData = await getExercisesByProtocol(protocolId);
      setExercises(exData);
      
      const id = await startWorkout({
        userId: user.id,
        protocolId: protocolId,
      });
      setWorkoutId(id);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddSet() {
    if (!workoutId || !weight || !reps) return;
    
    try {
      const exercise = exercises[currentExerciseIndex];
      await addWorkoutSet({
        workoutId,
        exerciseId: exercise.id,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rpe: parseInt(rpe),
        completed: true,
      });
      
      setWeight('');
      setReps('');
      
      // Trigger Rest Timer (90s default)
      setRestTimer(90);
      setShowRestTimer(true);
    } catch (err) {
      alert('Erro ao salvar série');
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentExercise = exercises[currentExerciseIndex];

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-neonBlue">TREINO EM CURSO</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400"
            >
              {isPaused ? '▶️ RETOMAR' : '⏸️ PAUSAR'}
            </button>
            <div className="bg-[#23262F] px-4 py-1 rounded-full border border-neonBlue text-neonBlue font-mono">
              {formatTime(timer)}
            </div>
          </div>
        </div>

        {currentExercise ? (
          <div className="flex flex-col gap-6">
            <div className="bg-[#23262F] p-6 rounded-3xl border border-gray-800 shadow-2xl">
              <span className="text-xs text-limeGreen font-bold uppercase tracking-widest block mb-1">
                {currentExercise.muscleGroup || 'Exercício'}
              </span>
              <h3 className="text-2xl font-black mb-4">{currentExercise.name}</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Peso (kg)</label>
                  <input 
                    type="number" 
                    className="bg-[#181A20] border border-gray-800 p-3 rounded-xl focus:outline-neonBlue text-center font-bold"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Reps</label>
                  <input 
                    type="number" 
                    className="bg-[#181A20] border border-gray-800 p-3 rounded-xl focus:outline-neonBlue text-center font-bold"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">RPE</label>
                  <select 
                    className="bg-[#181A20] border border-gray-800 p-3 rounded-xl focus:outline-neonBlue text-center font-bold"
                    value={rpe}
                    onChange={e => setRpe(e.target.value)}
                  >
                    {[5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <button 
                onClick={handleAddSet}
                className="w-full mt-6 bg-limeGreen text-black font-black py-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-limeGreen/20"
              >
                CHECK SET ✓
              </button>
            </div>

            <div className="flex justify-between items-center gap-4">
              <button 
                disabled={currentExerciseIndex === 0}
                onClick={() => setCurrentExerciseIndex(i => i - 1)}
                className="flex-1 bg-gray-800 p-3 rounded-xl disabled:opacity-30"
              >
                ← Anterior
              </button>
              <button 
                disabled={currentExerciseIndex === exercises.length - 1}
                onClick={() => setCurrentExerciseIndex(i => i + 1)}
                className="flex-1 bg-gray-800 p-3 rounded-xl disabled:opacity-30"
              >
                Próximo →
              </button>
            </div>

            <button 
              onClick={() => navigate('/')}
              className="w-full border border-red-900/30 text-red-500/50 py-3 rounded-xl text-sm font-bold mt-10"
            >
              FINALIZAR TREINO
            </button>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            Nenhum exercício encontrado para iniciar.
          </div>
        )}
        {showRestTimer && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <h4 className="text-neonBlue text-sm font-bold uppercase tracking-[0.3em] mb-4">Descanso Ativo</h4>
            <div className={`text-8xl font-black mb-8 ${restTimer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(restTimer)}
            </div>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => setRestTimer(t => t + 30)}
                className="flex-1 bg-gray-800 py-3 rounded-xl font-bold"
              >
                + 30s
              </button>
              <button 
                onClick={() => setShowRestTimer(false)}
                className="flex-1 bg-limeGreen text-black py-3 rounded-xl font-black"
              >
                PULAR
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
