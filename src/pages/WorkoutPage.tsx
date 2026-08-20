import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useWakeLock } from '../hooks/useWakeLock';
import { Layout } from '../components/common';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
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
import { deleteRemoteItem, deleteWorkoutFromCloud, fullSync } from '../services/syncService';
import type { ExerciseCategory, UniqueExercise, WorkoutSet, WorkoutSetType } from '../types';
import { parseLocaleNumber, calculateVolume } from '../utils/workoutMath';
import { WEEK_DAYS } from '../utils/constants';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  PlusCircle
} from "lucide-react";

import { 
  WorkoutBottomDock,
  WorkoutDayTabs,
  WorkoutExerciseCard,
  ExerciseLibraryModal,
  ConfigExtraExerciseModal,
  WorkoutFinishModal,
  type WorkoutExerciseData,
  type ConfigExerciseState
} from '../components/workout';

export default function WorkoutPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [protocolName, setProtocolName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExerciseData[]>([]);
  const [truePRs, setTruePRs] = useState<Record<string, { weight: number; reps: number }>>({});
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  
  // Library Modal State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<UniqueExercise[]>([]);

  // Config Extra Exercise State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configEx, setConfigEx] = useState<ConfigExerciseState | null>(null);

  // Rest Timer State
  const [timerTrigger, setTimerTrigger] = useState(0);

  // Finish Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Cancel Dialog State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Screen Wake Lock ativo enquanto houver treino
  useWakeLock(!!activeWorkoutId);

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

        // Checar treino ativo
        const active = await db.workouts
          .where({ userId: user.id, protocolId, status: 'active' })
          .first();
        
        if (active) {
          setActiveWorkoutId(active.id);
        }

        // Buscar último treino concluído deste protocolo
        const lastWorkout = await db.workouts
          .where({ userId: user.id, protocolId, status: 'completed' })
          .reverse()
          .sortBy('date');
        
        const mostRecentWorkout = lastWorkout[0];
        const lastSetsMap: Record<string, WorkoutSet[]> = {};
        if (mostRecentWorkout) {
          const sets = await db.workoutSets
            .where('workoutId').equals(mostRecentWorkout.id)
            .toArray();
          sets.forEach(s => {
            if (!lastSetsMap[s.exerciseId]) lastSetsMap[s.exerciseId] = [];
            lastSetsMap[s.exerciseId].push(s);
          });
          for (const eid in lastSetsMap) {
            lastSetsMap[eid].sort((a, b) => a.timestamp - b.timestamp);
          }
        }

        // Recordes Pessoais (PRs) do usuário
        const allExercises = await getExercisesByProtocol(protocolId);
        const historicalPRs: Record<string, { weight: number; reps: number }> = {};

        for (const ex of allExercises) {
          const truePR = await getExercisePR(ex.id, user.id);
          if (truePR) {
            historicalPRs[ex.id] = { weight: truePR.weight, reps: truePR.reps };
          } else {
            historicalPRs[ex.id] = { weight: 0, reps: 0 };
          }
        }
        setTruePRs(historicalPRs);
        
        // Dias que possuem exercícios agendados
        const weekDayLabels = WEEK_DAYS.map(d => d.label);
        const daysWithExercises = weekDayLabels.filter(day => 
          allExercises.some(ex => ex.name.includes(`(${day})`))
        );
        setAvailableDays(daysWithExercises);

        let dayLabel = selectedDay;
        if (!dayLabel) {
          const today = WEEK_DAYS[new Date().getDay()]?.label || 'Seg';
          dayLabel = daysWithExercises.includes(today) ? today : (daysWithExercises[0] || today);
          setSelectedDay(dayLabel);
        }

        // Montar exercícios do dia selecionado
        const dayExercises = await Promise.all((await getExercisesByProtocol(protocolId, false, active?.id))
          .filter(ex => ex.name.includes(`(${dayLabel})`))
          .map(async (ex) => {
            const setNum = ex.sets || 3;
            const prevSets = lastSetsMap[ex.id] || [];
            const completedSets: boolean[] = new Array(setNum).fill(false);
            const setsData = new Array(setNum).fill(null).map((_, idx) => {
              const prevSet = prevSets[idx];
              return { 
                weight: String(prevSet ? prevSet.weight : (ex.lastWeight || 0)), 
                reps: String(prevSet ? prevSet.reps : (ex.lastReps || ex.reps || 10)),
                type: (prevSet?.type || 'normal') as WorkoutSetType,
                notes: prevSet?.notes || ''
              };
            });

            if (active) {
              const existingSets = await db.workoutSets
                .where({ workoutId: active.id, exerciseId: ex.id })
                .toArray();
              
              existingSets.forEach(s => {
                if (s.setIndex < setNum) {
                  completedSets[s.setIndex] = true;
                  setsData[s.setIndex] = { 
                    weight: s.weight.toString(), 
                    reps: s.reps.toString(),
                    type: s.type || 'normal',
                    notes: s.notes || ''
                  };
                }
              });
            }

            const historicalMax = historicalPRs[ex.id] || { weight: 0, reps: 0 };
            let sessionMaxWeight = 0;
            let sessionMaxReps = 0;
            
            completedSets.forEach((done, i) => {
              if (done) {
                const w = parseLocaleNumber(setsData[i].weight);
                const r = parseLocaleNumber(setsData[i].reps);
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
              isSessionOnly: ex.isSessionOnly,
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
  }, [user, protocolId, selectedDay, navigate]);

  useEffect(() => {
    if (isLibraryOpen && user) {
      getUniqueExercisesLibrary(user.id).then(setLibrary);
    }
  }, [isLibraryOpen, user]);

  const checkAndUpdatePR = useCallback((exIdx: number, currentExercises: WorkoutExerciseData[]) => {
    const exercise = currentExercises[exIdx];
    const historical = truePRs[exercise.id] || { weight: 0, reps: 0 };
    
    let sessionBestWeight = 0;
    let sessionBestReps = 0;

    exercise.completedSets.forEach((done, i) => {
      if (done) {
        const w = parseLocaleNumber(exercise.setsData[i].weight);
        const r = parseLocaleNumber(exercise.setsData[i].reps);
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
  }, [truePRs]);

  const handleSetToggle = async (exIdx: number, setIdx: number) => {
    if (!user || !protocolId) return;

    const newExercises = [...exercises];
    const exercise = newExercises[exIdx];
    const isNowCompleted = !exercise.completedSets[setIdx];
    exercise.completedSets[setIdx] = isNowCompleted;
    setExercises(newExercises);

    try {
      let currentWorkoutId = activeWorkoutId;
      
      if (!currentWorkoutId) {
        currentWorkoutId = await startWorkout({
          userId: user.id,
          protocolId,
        });
        setActiveWorkoutId(currentWorkoutId);
      }

      if (isNowCompleted) {
        const setData = exercise.setsData[setIdx];
        await upsertWorkoutSet({
          workoutId: currentWorkoutId,
          exerciseId: exercise.id,
          setIndex: setIdx,
          weight: parseLocaleNumber(setData.weight),
          reps: parseLocaleNumber(setData.reps),
          type: setData.type || 'normal',
          notes: setData.notes,
          completed: true
        });

        // Dispara o Rest Timer na dock automaticamente
        setTimerTrigger(Date.now());
      } else {
        const existingSet = await db.workoutSets
          .where({ 
            workoutId: currentWorkoutId, 
            exerciseId: exercise.id, 
            setIndex: setIdx 
          })
          .first();

        if (existingSet) {
          await db.workoutSets.delete(existingSet.id);
          deleteRemoteItem('workout_sets', existingSet.id).catch(err => {
            console.warn('[Sync] Erro ao deletar set remoto:', err);
          });
        }
      }

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
    if (newExercises[exIdx].completedSets[setIdx] && activeWorkoutId) {
      upsertWorkoutSet({
        workoutId: activeWorkoutId,
        exerciseId: newExercises[exIdx].id,
        setIndex: setIdx,
        weight: parseLocaleNumber(setData.weight),
        reps: parseLocaleNumber(setData.reps),
        type: setData.type || 'normal',
        notes: setData.notes,
        completed: true
      }).catch(console.error);
      
      checkAndUpdatePR(exIdx, newExercises);
    }
  };

  const updateSetType = (exIdx: number, setIdx: number, type: WorkoutSetType) => {
    const newExercises = [...exercises];
    newExercises[exIdx].setsData[setIdx].type = type;
    setExercises(newExercises);

    const setData = newExercises[exIdx].setsData[setIdx];
    if (newExercises[exIdx].completedSets[setIdx] && activeWorkoutId) {
      upsertWorkoutSet({
        workoutId: activeWorkoutId,
        exerciseId: newExercises[exIdx].id,
        setIndex: setIdx,
        weight: parseLocaleNumber(setData.weight),
        reps: parseLocaleNumber(setData.reps),
        type,
        notes: setData.notes,
        completed: true
      }).catch(console.error);
    }
  };

  const handleAddExtraExercise = (libEx: { name: string; category?: ExerciseCategory; muscleGroup?: string; multiplier?: number }) => {
    setConfigEx({
      name: libEx.name,
      category: libEx.category || 'weight',
      sets: 3,
      muscleGroup: libEx.muscleGroup,
      multiplier: libEx.multiplier
    });
    setIsConfigOpen(true);
  };

  const confirmAddExtraExercise = async () => {
    if (!user || !protocolId || !selectedDay || !configEx) return;
    
    try {
      const name = configEx.name.includes('(') ? configEx.name : `${configEx.name} (${selectedDay})`;
      
      const newExId = await addExercise({
        protocolId,
        name,
        muscleGroup: configEx.muscleGroup,
        category: configEx.category,
        multiplier: configEx.multiplier || 1,
        order: exercises.length,
        dayOfWeek: selectedDay,
        sets: configEx.sets,
        reps: 10,
        isSessionOnly: true,
      });

      const setsData = new Array(configEx.sets).fill(null).map(() => ({ 
        weight: '0', 
        reps: '10',
        type: 'normal' as WorkoutSetType 
      }));

      const newEx: WorkoutExerciseData = {
        id: newExId,
        name,
        category: configEx.category,
        order: exercises.length,
        sets: configEx.sets,
        completedSets: new Array(configEx.sets).fill(false),
        setsData,
        isSessionOnly: true,
        lastWeight: 0,
        lastReps: 0
      };

      setExercises([...exercises, newEx]);
      setExpandedExercise(newExId);
      setIsConfigOpen(false);
      setConfigEx(null);
      setIsLibraryOpen(false);
      
      if (activeWorkoutId) {
        await upsertWorkoutSet({
          workoutId: activeWorkoutId,
          exerciseId: newExId,
          setIndex: 0,
          weight: 0,
          reps: 10,
          type: 'normal',
          completed: false
        });
      }

      toast.success(`${configEx.name.split(' (')[0]} adicionado!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar exercício extra.');
    }
  };

  const handleDeleteExtraExercise = async (exId: string, _name: string) => {
    if (!activeWorkoutId) return;
    
    try {
      await deleteRemoteItem('exercises', exId).catch(err => {
        console.warn('[Delete] Erro ao remover do cloud:', err);
      });

      await db.transaction('rw', [db.exercises, db.workoutSets], async () => {
        await db.workoutSets.where({ workoutId: activeWorkoutId, exerciseId: exId }).delete();
        await db.exercises.delete(exId);
      });

      setExercises(prev => prev.filter(ex => ex.id !== exId));
      if (expandedExercise === exId) setExpandedExercise(null);
      
      toast.success('Exercício removido.');
    } catch (err) {
      console.error('[Delete] Erro:', err);
      toast.error('Erro ao remover exercício.');
    }
  };

  const confirmCancelWorkout = async () => {
    if (!activeWorkoutId) {
      navigate(-1);
      return;
    }

    try {
      await cancelActiveWorkout(activeWorkoutId);
      await deleteWorkoutFromCloud(activeWorkoutId);
      toast.success('Treino cancelado.');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cancelar treino.');
    }
  };

  // Métricas para o FinishModal
  const totalCompletedSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + ex.completedSets.filter(Boolean).length, 0);
  }, [exercises]);

  const totalCalculatedVolume = useMemo(() => {
    let volume = 0;
    exercises.forEach(ex => {
      ex.completedSets.forEach((done, idx) => {
        if (done) {
          const w = parseLocaleNumber(ex.setsData[idx]?.weight);
          const r = parseLocaleNumber(ex.setsData[idx]?.reps);
          volume += calculateVolume(w, r, ex.category);
        }
      });
    });
    return volume;
  }, [exercises]);

  const brokenPRsList = useMemo(() => {
    const prs: { exerciseName: string; weight: number; reps: number; previousWeight?: number }[] = [];
    exercises.forEach(ex => {
      let sessionBestWeight = 0;
      let sessionBestReps = 0;
      ex.completedSets.forEach((done, idx) => {
        if (done) {
          const w = parseLocaleNumber(ex.setsData[idx]?.weight);
          const r = parseLocaleNumber(ex.setsData[idx]?.reps);
          if (w > sessionBestWeight || (w === sessionBestWeight && r > sessionBestReps)) {
            sessionBestWeight = w;
            sessionBestReps = r;
          }
        }
      });

      const truePR = truePRs[ex.id];
      const oldW = truePR ? truePR.weight : 0;
      const oldR = truePR ? truePR.reps : 0;

      if (sessionBestWeight > oldW || (sessionBestWeight === oldW && sessionBestReps > oldR && sessionBestWeight > 0)) {
        prs.push({
          exerciseName: ex.name.split(' (')[0],
          weight: sessionBestWeight,
          reps: sessionBestReps,
          previousWeight: oldW
        });
      }
    });
    return prs;
  }, [exercises, truePRs]);

  const handleOpenFinishModal = () => {
    if (totalCompletedSets === 0) {
      toast.error('Complete pelo menos uma série antes de finalizar.');
      return;
    }
    setIsFinishModalOpen(true);
  };

  const handleConfirmFinishWorkout = async (metrics: { mood: number; sleepQuality: number; stressLevel: number; notes: string }) => {
    if (!user || !protocolId || !activeWorkoutId) return;

    setIsFinishing(true);
    try {
      await db.workouts.update(activeWorkoutId, {
        status: 'completed',
        finishedAt: Date.now(),
        mood: metrics.mood,
        sleepQuality: metrics.sleepQuality,
        stressLevel: metrics.stressLevel,
        notes: metrics.notes,
        isSynced: false
      });

      // Atualizar lastWeight e lastReps dos exercícios se superados
      for (const ex of exercises) {
        let sessionBestWeight = 0;
        let sessionBestReps = 0;

        ex.completedSets.forEach((completed, idx) => {
          if (completed) {
            const weight = parseLocaleNumber(ex.setsData[idx].weight);
            const reps = parseLocaleNumber(ex.setsData[idx].reps);
            if (weight > sessionBestWeight || (weight === sessionBestWeight && reps > sessionBestReps)) {
              sessionBestWeight = weight;
              sessionBestReps = reps;
            }
          }
        });

        if (sessionBestWeight > 0) {
          const truePR = await getExercisePR(ex.id, user.id);
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

      // Sincronização em segundo plano não-bloqueante
      fullSync().catch((err) => {
        console.warn('[Sync] Sincronização em background adiada:', err);
      });

      toast.success('Treino finalizado e salvo com sucesso!');
      setIsFinishModalOpen(false);
      navigate('/history');
    } catch (err) {
      console.error('[WorkoutPage] Erro ao finalizar treino:', err);
      toast.error('Erro ao finalizar treino localmente.');
    } finally {
      setIsFinishing(false);
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
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-36 sm:pb-40">
        {/* Header da Sessão */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button 
              type="button"
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase text-foreground tracking-tight leading-tight truncate max-w-[200px] sm:max-w-md">
                {protocolName}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] sm:text-xs text-primary font-mono font-bold uppercase tracking-wider">
                  Sessão Ativa
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0 shrink-0">
            {/* Cancelar Treino */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              className="h-10 px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase"
            >
              Cancelar
            </Button>
          </div>
        </header>

        {/* Abas dos Dias da Semana */}
        <WorkoutDayTabs
          availableDays={availableDays}
          selectedDay={selectedDay}
          onSelectDay={(day) => setSelectedDay(day)}
        />

        {/* Lista Ergonômica de Exercícios */}
        <div className="space-y-3.5">
          {exercises.map((ex, exIdx) => (
            <WorkoutExerciseCard
              key={ex.id}
              exercise={ex}
              exIdx={exIdx}
              isExpanded={expandedExercise === ex.id}
              onToggleExpand={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
              onToggleSet={handleSetToggle}
              onUpdateSetData={updateSetData}
              onUpdateSetType={updateSetType}
              onDeleteExtraExercise={handleDeleteExtraExercise}
              truePR={truePRs[ex.id]}
            />
          ))}
        </div>

        {/* Botão para Adicionar Exercício Extra */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsLibraryOpen(true)}
          className="w-full h-12 rounded-2xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <PlusCircle className="w-4 h-4" />
          Adicionar Exercício à Sessão
        </Button>

        {/* Barra Inferior Unificada (Timer de Descanso Fixo + Finalização) */}
        <WorkoutBottomDock
          totalCompletedSets={totalCompletedSets}
          onOpenFinishModal={handleOpenFinishModal}
          timerTrigger={timerTrigger}
        />

        {/* Modais Desacoplados */}
        <ExerciseLibraryModal
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          library={library}
          onSelectExercise={handleAddExtraExercise}
        />

        <ConfigExtraExerciseModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          configEx={configEx}
          onChangeSets={(delta) => {
            if (!configEx) return;
            setConfigEx({ ...configEx, sets: Math.max(1, Math.min(10, configEx.sets + delta)) });
          }}
          onConfirm={confirmAddExtraExercise}
        />

        <WorkoutFinishModal
          isOpen={isFinishModalOpen}
          onClose={() => setIsFinishModalOpen(false)}
          onConfirm={handleConfirmFinishWorkout}
          totalSetsCompleted={totalCompletedSets}
          totalVolumeKg={totalCalculatedVolume}
          brokenPRs={brokenPRsList}
          isSubmitting={isFinishing}
        />

        <ConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          title="Cancelar sessão de treino?"
          description="Deseja realmente cancelar este treino? O progresso não será salvo no seu histórico."
          confirmLabel="Cancelar Treino"
          variant="destructive"
          onConfirm={confirmCancelWorkout}
        />
      </div>
    </Layout>
  );
}
