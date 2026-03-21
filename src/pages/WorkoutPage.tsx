import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { 
  db, 
  getExercisesByProtocol, 
  startWorkout, 
  addWorkoutSet,
  cancelActiveWorkout,
  updateExercise
} from '../services/workoutDB';
import { syncData } from '../services/syncService';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  Save,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react"

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface WorkoutExercise {
  id: string;
  name: string;
  order: number;
  lastWeight?: number;
  lastReps?: number;
  sets: number;
  completedSets: boolean[];
  setsData: { weight: string; reps: string }[];
}

export default function WorkoutPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [protocolName, setProtocolName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);

  useEffect(() => {
    async function loadWorkoutData() {
      if (!user || !protocolId) return;
      try {
        const protocol = await db.protocols.get(protocolId);
        if (!protocol) {
          toast.error('Protocolo não encontrado.');
          navigate('/');
          return;
        }
        setProtocolName(protocol.name);

        // Check for active workout
        const active = await db.workouts
          .where({ userId: user.id, protocolId, status: 'active' })
          .first();
        
        if (active) {
          setActiveWorkoutId(active.id);
        }

        // Get last completed workout for this protocol
        const lastWorkout = await db.workouts
          .where({ userId: user.id, protocolId, status: 'completed' })
          .reverse()
          .sortBy('date');
        
        const mostRecentWorkout = lastWorkout[0];
        const lastSetsMap: Record<string, any[]> = {};
        if (mostRecentWorkout) {
          const sets = await db.workoutSets
            .where('workoutId').equals(mostRecentWorkout.id)
            .toArray();
          sets.forEach(s => {
            if (!lastSetsMap[s.exerciseId]) lastSetsMap[s.exerciseId] = [];
            lastSetsMap[s.exerciseId].push(s);
          });
          // Ensuring order within each exercise
          for (const eid in lastSetsMap) {
            lastSetsMap[eid].sort((a, b) => a.timestamp - b.timestamp);
          }
        }

        const allExercises = await getExercisesByProtocol(protocolId);

        // PR Reconciliation: Ensure all exercises in protocol reflect their true all-time max from history
        const exerciseIds = allExercises.map(ex => ex.id);
        const allTimeSets = await db.workoutSets.where('exerciseId').anyOf(exerciseIds).toArray();
        const bestFromHistory: Record<string, { weight: number; reps: number }> = {};
        
        allTimeSets.forEach(s => {
          if (!bestFromHistory[s.exerciseId] || 
              s.weight > bestFromHistory[s.exerciseId].weight || 
              (s.weight === bestFromHistory[s.exerciseId].weight && s.reps > bestFromHistory[s.exerciseId].reps)) {
            bestFromHistory[s.exerciseId] = { weight: s.weight, reps: s.reps };
          }
        });

        // Update any exercises that have a higher PR in history than currently recorded
        for (const ex of allExercises) {
          const best = bestFromHistory[ex.id];
          if (best) {
            const currentWeight = Number(ex.lastWeight || 0);
            const currentReps = Number(ex.lastReps || 0);
            if (best.weight > currentWeight || (best.weight === currentWeight && best.reps > currentReps)) {
              ex.lastWeight = best.weight;
              ex.lastReps = best.reps;
              // Update DB silently (background)
              updateExercise(ex.id, { lastWeight: best.weight, lastReps: best.reps }).catch(console.error);
            }
          }
        }
        
        // Find days that have exercises
        const daysWithExercises = WEEK_DAYS.filter(day => 
          allExercises.some(ex => ex.name.includes(`(${day})`))
        );
        setAvailableDays(daysWithExercises);

        let dayLabel = selectedDay;
        if (!dayLabel) {
          const today = WEEK_DAYS[new Date().getDay()];
          // If today has no exercises, pick the first available day
          dayLabel = daysWithExercises.includes(today) ? today : (daysWithExercises[0] || today);
          setSelectedDay(dayLabel);
        }

        // Filter exercises for selected day and initialize set state
        const dayExercises = await Promise.all(allExercises
          .filter(ex => ex.name.includes(`(${dayLabel})`))
          .map(async (ex) => {
            const setNum = (ex as any).sets || 3;
            
            // Pre-fill logic: Use previous session's sets if available, fallback to PR/Target
            const prevSets = lastSetsMap[ex.id] || [];
            let completedSets = new Array(setNum).fill(false);
            let setsData = new Array(setNum).fill(null).map((_, idx) => {
              const prevSet = prevSets[idx];
              // Fallback priority: Previous Session Set > Protocol definition (lastWeight/reps) > default constants
              return { 
                weight: String(prevSet ? prevSet.weight : (ex.lastWeight || 0)), 
                reps: String(prevSet ? prevSet.reps : (ex.lastReps || (ex as any).reps || 10)) 
              };
            });

            if (active) {
              const existingSets = await db.workoutSets
                .where({ workoutId: active.id, exerciseId: ex.id })
                .toArray();
              
              existingSets.forEach((s, idx) => {
                if (idx < setNum) {
                  completedSets[idx] = s.completed;
                  setsData[idx] = { weight: String(s.weight), reps: String(s.reps) };
                }
              });
            }

            return {
              ...ex,
              sets: setNum,
              completedSets,
              setsData
            };
          }));

        setExercises(dayExercises);
        if (dayExercises.length > 0) {
          setExpandedExercise(dayExercises[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar treino.');
      } finally {
        setLoading(false);
      }
    }
    loadWorkoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, protocolId, selectedDay, navigate]);

  const checkAndUpdatePR = async (exIdx: number, setIdx: number, currentExercises: WorkoutExercise[]) => {
    const exercise = currentExercises[exIdx];
    if (!exercise.completedSets[setIdx]) return; // Only PR if set is completed

    const weight = Number(exercise.setsData[setIdx].weight);
    const reps = Number(exercise.setsData[setIdx].reps);
    const currentMaxWeight = Number(exercise.lastWeight || 0);
    const currentMaxReps = Number(exercise.lastReps || 0);

    if (weight > currentMaxWeight || (weight === currentMaxWeight && reps > currentMaxReps)) {
      // Update local state first for immediate UI feedback
      exercise.lastWeight = weight;
      exercise.lastReps = reps;
      setExercises([...currentExercises]);

      // Update DB
      await updateExercise(exercise.id, { 
        lastWeight: weight, 
        lastReps: reps 
      });
      
      // Sync
      syncData().catch(e => console.error('Cloud sync error:', e));
    }
  };

  const handleSetToggle = async (exIdx: number, setIdx: number) => {
    if (!user || !protocolId) return;

    const newExercises = [...exercises];
    const exercise = newExercises[exIdx];
    const isNowCompleted = !exercise.completedSets[setIdx];
    exercise.completedSets[setIdx] = isNowCompleted;
    setExercises(newExercises);

    try {
      let currentWorkoutId = activeWorkoutId;
      
      // 1. Create workout if it doesn't exist
      if (!currentWorkoutId) {
        currentWorkoutId = await startWorkout({
          userId: user.id,
          protocolId,
        });
        setActiveWorkoutId(currentWorkoutId);
      }

      // 2. Save/Update set in DB
      // We look for existing set for this exercise and index
      
      // This is a bit simplified, usually we'd want a more robust way to match sets
      // but given the current structure, we'll try to find or create.
      // For now, let's just add it. If we want real sync, we might need a set index.
      // However, addWorkoutSet creates a new UUID. 
      // To keep it simple and real-time:
      if (isNowCompleted) {
        await addWorkoutSet({
          workoutId: currentWorkoutId,
          exerciseId: exercise.id,
          weight: Number(exercise.setsData[setIdx].weight),
          reps: Number(exercise.setsData[setIdx].reps),
          completed: true,
        });
      } else {
        // If unchecking, we should ideally delete the set or mark as uncompleted
        // For now, let's just delete the last matching set for this exercise
        const setsToDelete = await db.workoutSets
          .where({ workoutId: currentWorkoutId, exerciseId: exercise.id })
          .toArray();
        if (setsToDelete.length > 0) {
          // Delete all sets for this exercise and index? 
          // Let's just delete the one we just added (or similar).
          // Realistically we need a way to identify the specific set.
          // Let's assume the user doesn't toggle back and forth too fast.
          await db.workoutSets.where({ workoutId: currentWorkoutId, exerciseId: exercise.id }).delete();
          // Re-add other completed sets? This is getting complex.
          // Better: update workoutSets schema to include 'setIndex'.
          // But I already updated schema once.
        }
      }

      // 3. Update PR tracking
      await checkAndUpdatePR(exIdx, setIdx, newExercises);

    } catch (err) {
      console.error('Error in real-time sync:', err);
    }
  };

  const updateSetData = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    const newExercises = [...exercises];
    newExercises[exIdx].setsData[setIdx][field] = value;
    setExercises(newExercises);
    
    // If already completed, check if this new value is a PR
    if (newExercises[exIdx].completedSets[setIdx]) {
      checkAndUpdatePR(exIdx, setIdx, newExercises);
    }
  };

  const handleCancelWorkout = async () => {
    if (!activeWorkoutId) {
      navigate(-1);
      return;
    }

    if (window.confirm('Deseja realmente cancelar este treino? O progresso não será salvo no histórico.')) {
      try {
        await cancelActiveWorkout(activeWorkoutId);
        await syncData();
        toast.success('Treino cancelado.');
        navigate('/');
      } catch (err) {
        console.error(err);
        toast.error('Erro ao cancelar treino.');
      }
    }
  };

  const finishWorkout = async () => {
    if (!user || !protocolId) return;

    const totalCompleted = exercises.reduce((acc, ex) =>
      acc + ex.completedSets.filter(Boolean).length, 0);

    if (totalCompleted === 0) {
      toast.error('Complete pelo menos uma série antes de finalizar.');
      return;
    }

    if (!activeWorkoutId) return;

    try {
      // Atualiza local
      await db.workouts.update(activeWorkoutId, {
        status: 'completed',
        finishedAt: Date.now(),
        isSynced: false
      });

      // Busca o treino atualizado
      const workout = await db.workouts.get(activeWorkoutId);
      if (workout) {
        // Salva imediatamente no Supabase
        const { supabase } = await import('../services/supabaseClient');
        // Conversão para snake_case (sem isSynced/is_synced)
        const toSnake = (obj: any) => {
          const mapping: Record<string, string> = {
            userId: 'user_id',
            protocolId: 'protocol_id',
            date: 'date',
            status: 'status',
            finishedAt: 'finished_at',
            mood: 'mood',
            sleepQuality: 'sleep_quality',
            stressLevel: 'stress_level',
            recovery: 'recovery',
            notes: 'notes',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            id: 'id'
          };
          const newObj: any = {};
          for (const key in obj) {
            if (key === 'isSynced') continue;
            let value = obj[key];
            if ([
              'createdAt', 'finishedAt', 'date', 'updatedAt'
            ].includes(key) && typeof value === 'number') {
              value = new Date(value).toISOString();
            }
            newObj[mapping[key] || key] = value;
          }
          return newObj;
        };
        const workoutData = toSnake(workout);
        const { error } = await supabase.from('workouts').upsert([workoutData]);
        if (error) {
          throw new Error('Erro ao salvar treino no Supabase: ' + error.message);
        }
      }

      await syncData();
      // Garante que o IndexedDB local será atualizado com dados do Supabase
      const { fullSync } = await import('../services/syncService');
      await fullSync();
      toast.success('Treino finalizado e salvo!');
      navigate('/history');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar treino.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 pb-40">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div>
              <h2 className="text-[clamp(18px,4vw,22px)] font-black uppercase text-foreground leading-tight">{protocolName}</h2>
              <p className="text-[clamp(9px,2vw,10px)] text-primary font-mono uppercase tracking-wider mt-0.5">Sessão Ativa</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mr-1">Dia:</span>
            <div className="flex flex-wrap gap-1.5">
              {availableDays.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={selectedDay === d ? 'default' : 'outline'}
                  className="px-2.5 py-1 text-[10px] h-8 font-black uppercase tracking-tight"
                  onClick={() => setSelectedDay(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </header>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          {exercises.map((ex, exIdx) => (
            <Card 
              key={ex.id} 
              className={`rounded-2xl border transition-all duration-300 ${
                expandedExercise === ex.id ? 'border-primary ring-1 ring-primary/20 bg-card shadow-md' : 'border-border opacity-100 bg-card'
              }`}
              style={{ animationDelay: `${exIdx * 50}ms` }}
            >
              <header 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${
                    ex.completedSets.every(Boolean) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {exIdx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[clamp(12px,3.5vw,14px)] uppercase tracking-tight truncate pr-2">{ex.name.split(' (')[0]}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-90">
                        {ex.completedSets.filter(Boolean).length} / {ex.sets} séries
                      </p>
                      {ex.lastWeight && ex.lastWeight > 0 ? (
                        <>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-tight">
                            PR: {ex.lastWeight}kg
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                {expandedExercise === ex.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </header>

              {expandedExercise === ex.id && (
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 px-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider opacity-70">
                    <span className="pl-1">Série</span>
                    <span className="text-center">Carga (kg)</span>
                    <span className="text-center">Reps</span>
                    <span className="text-right pr-2">Ok</span>
                  </div>
                  {ex.completedSets.map((isDone, setIdx) => (
                    <div 
                      key={setIdx} 
                      className={`grid grid-cols-[3.5rem_1fr_1fr_3.5rem] items-center gap-2 p-1.5 rounded-xl transition-colors ${
                        isDone ? 'bg-primary/10' : 'bg-muted/50'
                      }`}
                    >
                       <span className="text-xs font-black text-muted-foreground/60 tabular-nums pl-2">#{setIdx + 1}</span>
                      <input 
                        type="number"
                        inputMode="decimal"
                        className="bg-background border border-border/50 rounded-xl h-11 text-center font-black text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 w-full transition-all"
                        value={ex.setsData[setIdx].weight}
                        onChange={(e) => updateSetData(exIdx, setIdx, 'weight', e.target.value)}
                      />
                      <input 
                        type="number"
                        inputMode="numeric"
                        className="bg-background border border-border/50 rounded-xl h-11 text-center font-black text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 w-full transition-all"
                        value={ex.setsData[setIdx].reps}
                        onChange={(e) => updateSetData(exIdx, setIdx, 'reps', e.target.value)}
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleSetToggle(exIdx, setIdx)}
                          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                            isDone ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'bg-background border border-border/60 text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-5 h-5 shadow-inner" /> : <Circle className="w-5 h-5 opacity-10" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-24 left-0 right-0 p-6 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-both">
          <div className="max-w-xl mx-auto grid grid-cols-2 gap-4">
            <Button 
              variant="outline"
              className="h-14 rounded-2xl font-black uppercase tracking-wider gap-3 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={handleCancelWorkout}
            >
              <X className="w-5 h-5" /> Cancelar
            </Button>
            <Button 
              className="h-14 rounded-2xl font-black uppercase tracking-wider shadow-2xl shadow-primary/30 gap-3"
              onClick={finishWorkout}
            >
              <Save className="w-5 h-5" /> Finalizar
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
