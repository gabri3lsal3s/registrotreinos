import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { 
  db, 
  getExercisesByProtocol, 
  startWorkout, 
  upsertWorkoutSet,
  cancelActiveWorkout,
  updateExercise,
  getExercisePR,
  addExercise,
  getUniqueExercisesLibrary
} from '../services/workoutDB';
import { syncData } from '../services/syncService';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  Save,
  ChevronDown,
  ChevronUp,
  X,
  PlusCircle,
  Search,
  Dumbbell
} from "lucide-react"

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface WorkoutExercise {
  id: string;
  name: string;
  category?: 'weight' | 'bodyweight' | 'time';
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
  const [truePRs, setTruePRs] = useState<Record<string, { weight: number, reps: number }>>({});
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  
  // Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

        // 5. PR Calculation from History (Only completed workouts)
        const allExercises = await getExercisesByProtocol(protocolId);
        const historicalPRs: Record<string, { weight: number, reps: number }> = {};

        for (const ex of allExercises) {
          const truePR = await getExercisePR(ex.id);
          if (truePR) {
            historicalPRs[ex.id] = { weight: truePR.weight, reps: truePR.reps };
          } else {
            historicalPRs[ex.id] = { weight: 0, reps: 0 };
          }
        }
        setTruePRs(historicalPRs);
        
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
        const dayExercises = await Promise.all((await getExercisesByProtocol(protocolId, false, active?.id))
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
              
              existingSets.forEach(s => {
                if (s.setIndex < setNum) { // Safety check
                  completedSets[s.setIndex] = true;
                  setsData[s.setIndex] = { weight: s.weight.toString(), reps: s.reps.toString() };
                }
              });
            }

            // Calculate Display PR: max(historicalPR, current session sets)
            const historicalMax = historicalPRs[ex.id] || { weight: 0, reps: 0 };
            let sessionMaxWeight = 0;
            let sessionMaxReps = 0;
            
            completedSets.forEach((done, i) => {
              if (done) {
                const w = Number(setsData[i].weight);
                const r = Number(setsData[i].reps);
                if (w > sessionMaxWeight || (w === sessionMaxWeight && r > sessionMaxReps)) {
                  sessionMaxWeight = w;
                  sessionMaxReps = r;
                }
              }
            });

            const isHistoryBetter = historicalMax.weight > sessionMaxWeight || (historicalMax.weight === sessionMaxWeight && historicalMax.reps > sessionMaxReps);
            const finalPR = isHistoryBetter ? historicalMax : { weight: sessionMaxWeight, reps: sessionMaxReps };

            return {
              ...ex,
              category: ex.category || 'weight',
              sets: setNum,
              completedSets,
              setsData,
              lastWeight: finalPR.weight,
              lastReps: finalPR.reps
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

  useEffect(() => {
    if (isLibraryOpen && user) {
      getUniqueExercisesLibrary(user.id).then(setLibrary);
    }
  }, [isLibraryOpen, user]);

  const checkAndUpdatePR = (exIdx: number, currentExercises: WorkoutExercise[]) => {
    const exercise = currentExercises[exIdx];
    const historical = truePRs[exercise.id] || { weight: 0, reps: 0 };
    
    let sessionBestWeight = 0;
    let sessionBestReps = 0;

    exercise.completedSets.forEach((done, i) => {
      if (done) {
        const w = Number(exercise.setsData[i].weight);
        const r = Number(exercise.setsData[i].reps);
        if (w > sessionBestWeight || (w === sessionBestWeight && r > sessionBestReps)) {
          sessionBestWeight = w;
          sessionBestReps = r;
        }
      }
    });

    const isHistoryBetter = historical.weight > sessionBestWeight || (historical.weight === sessionBestWeight && historical.reps > sessionBestReps);
    const finalPR = isHistoryBetter ? historical : { weight: sessionBestWeight, reps: sessionBestReps };
    
    exercise.lastWeight = finalPR.weight;
    exercise.lastReps = finalPR.reps;
    setExercises([...currentExercises]);
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
      if (isNowCompleted) {
        await upsertWorkoutSet({
          workoutId: currentWorkoutId,
          exerciseId: exercise.id,
          setIndex: setIdx,
          weight: Number(exercise.setsData[setIdx].weight),
          reps: Number(exercise.setsData[setIdx].reps),
          completed: true
        });
      } else {
        // Delete only this set index
        await db.workoutSets
          .where({ 
            workoutId: currentWorkoutId, 
            exerciseId: exercise.id, 
            setIndex: setIdx 
          })
          .delete();
      }

      // 3. Update PR tracking
      checkAndUpdatePR(exIdx, newExercises);

    } catch (err) {
      console.error('Error in real-time sync:', err);
    }
  };

  const updateSetData = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    const newExercises = [...exercises];
    newExercises[exIdx].setsData[setIdx][field] = value;
    setExercises(newExercises);
    
    const setData = newExercises[exIdx].setsData[setIdx];
    if (newExercises[exIdx].completedSets[setIdx]) {
      upsertWorkoutSet({
        workoutId: activeWorkoutId!,
        exerciseId: newExercises[exIdx].id,
        setIndex: setIdx,
        weight: Number(setData.weight),
        reps: Number(setData.reps),
        completed: true
      }).catch(console.error);
      
      checkAndUpdatePR(exIdx, newExercises);
    }
  };

  const handleAddExtraExercise = async (libEx: any) => {
    if (!user || !protocolId || !selectedDay) return;
    
    try {
      const name = libEx.name.includes('(') ? libEx.name : `${libEx.name} (${selectedDay})`;
      
      const newExId = await addExercise({
        protocolId,
        name,
        muscleGroup: libEx.muscleGroup,
        category: libEx.category || 'weight',
        multiplier: libEx.multiplier || 1,
        order: exercises.length,
        dayOfWeek: selectedDay,
        sets: 3,
        reps: 10,
        isSessionOnly: true,
      });

      // Update local state to show the new exercise immediately
      const newEx: WorkoutExercise = {
        id: newExId,
        name,
        category: libEx.category || 'weight',
        order: exercises.length,
        sets: 3,
        completedSets: [false, false, false],
        setsData: [{ weight: '0', reps: '10' }, { weight: '0', reps: '10' }, { weight: '0', reps: '10' }],
        lastWeight: 0,
        lastReps: 0
      };

      setExercises([...exercises, newEx]);
      setExpandedExercise(newExId);
      setIsLibraryOpen(false);
      setSearchQuery('');
      
      // Pin to session by creating an initial uncompleted set
      if (activeWorkoutId) {
        await upsertWorkoutSet({
          workoutId: activeWorkoutId,
          exerciseId: newExId,
          setIndex: 0,
          weight: 0,
          reps: 10,
          completed: false
        });
      }

      toast.success(`${libEx.name} adicionado!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar exercício extra.');
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
        const { deleteWorkoutFromCloud } = await import('../services/syncService');
        await deleteWorkoutFromCloud(activeWorkoutId);
        toast.success('Treino excluído.');
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

        // 4. Update PRs for all performed exercises
        for (const ex of exercises) {
          let sessionBestWeight = 0;
          let sessionBestReps = 0;

          ex.completedSets.forEach((completed, idx) => {
            if (completed) {
              const weight = Number(ex.setsData[idx].weight);
              const reps = Number(ex.setsData[idx].reps);
              if (weight > sessionBestWeight || (weight === sessionBestWeight && reps > sessionBestReps)) {
                sessionBestWeight = weight;
                sessionBestReps = reps;
              }
            }
          });

          if (sessionBestWeight > 0) {
            const truePR = await getExercisePR(ex.id);
            const oldWeight = truePR ? truePR.weight : 0;
            const oldReps = truePR ? truePR.reps : 0;

            if (sessionBestWeight > oldWeight || (sessionBestWeight === oldWeight && sessionBestReps > oldReps)) {
              await updateExercise(ex.id, { 
                lastWeight: sessionBestWeight, 
                lastReps: sessionBestReps 
              });
            }
          }
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
                  <div className={`grid gap-2 px-2 text-[9px] font-black text-muted-foreground uppercase tracking-wider opacity-70 grid-cols-[3.5rem_1fr_1fr_3.5rem]`}>
                    <span className="pl-1">Série</span>
                    <span className="text-center">
                      {ex.category === 'time' ? 'Carga (kg)' : (ex.category === 'bodyweight' ? '+ Carga (kg)' : 'Carga (kg)')}
                    </span>
                    <span className="text-center">{ex.category === 'time' ? 'Tempo (s)' : 'Reps'}</span>
                    <span className="text-right pr-2">Ok</span>
                  </div>
                  {ex.completedSets.map((isDone, setIdx) => (
                    <div 
                      key={setIdx} 
                      className={`grid items-center gap-2 p-1.5 rounded-xl transition-colors grid-cols-[3.5rem_1fr_1fr_3.5rem] ${isDone ? 'bg-primary/10' : 'bg-muted/50'}`}
                    >
                       <span className="text-xs font-black text-muted-foreground/60 tabular-nums pl-2">#{setIdx + 1}</span>
                      
                      <input 
                        type="number"
                        inputMode="decimal"
                        className="bg-background border border-border/50 rounded-xl h-11 text-center font-black text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 w-full transition-all"
                        value={ex.setsData[setIdx].weight}
                        onChange={(e) => updateSetData(exIdx, setIdx, 'weight', e.target.value)}
                        placeholder={(ex.category === 'bodyweight' || ex.category === 'time') ? "+ kg" : "kg"}
                      />
                      
                      <input 
                        type="number"
                        inputMode="numeric"
                        className="bg-background border border-border/50 rounded-xl h-11 text-center font-black text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 w-full transition-all"
                        value={ex.setsData[setIdx].reps} 
                        onChange={(e) => updateSetData(exIdx, setIdx, 'reps', e.target.value)}
                        placeholder={ex.category === 'time' ? "Seg" : "Reps"}
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
          
          <Button
            variant="outline"
            onClick={() => setIsLibraryOpen(true)}
            className="w-full h-16 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 group transition-all"
          >
            <PlusCircle className="w-5 h-5 mr-2 text-primary" />
            <span className="font-black uppercase tracking-widest text-xs">Adicionar Exercício Extra</span>
          </Button>
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

        {/* Library Modal */}
        <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
          <DialogContent className="max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 pb-2 bg-card">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Biblioteca</DialogTitle>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Sessão: {selectedDay}</p>
            </DialogHeader>
            
            <div className="p-6 pt-2 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                <Input
                  className="pl-10 h-12 bg-muted/30 border-none rounded-xl font-bold placeholder:font-black placeholder:uppercase placeholder:text-[10px]"
                  placeholder="Procurar exercício..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {searchQuery.trim().length >= 2 && (
                  <button
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 transition-all text-left group mb-4"
                    onClick={() => handleAddExtraExercise({ name: searchQuery.trim(), muscleGroup: 'Outros' })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-background shadow-sm text-primary group-hover:scale-110 transition-transform">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-[11px] uppercase tracking-tight">Criar "{searchQuery.trim()}"</p>
                        <p className="text-[9px] font-mono text-primary uppercase">Exercício Personalizado</p>
                      </div>
                    </div>
                    <PlusCircle className="w-4 h-4 text-primary" />
                  </button>
                )}

                {library
                  .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ex, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all text-left group"
                      onClick={() => handleAddExtraExercise(ex)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-background shadow-sm text-primary group-hover:scale-110 transition-transform">
                          <Dumbbell className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black text-[11px] uppercase tracking-tight">{ex.name}</p>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase">{ex.muscleGroup}</p>
                        </div>
                      </div>
                      <PlusCircle className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                }
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
