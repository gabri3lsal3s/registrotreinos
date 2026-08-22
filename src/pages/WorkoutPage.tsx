import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  discardEmptyActiveWorkout,
  updateExercise,
  getExercisePR,
  addExercise,
  getUniqueExercisesLibrary,
  deleteWorkoutSet,
  deleteExercise
} from '../services/workoutDB';
import { deleteWorkoutFromCloud, fullSync } from '../services/syncService';
import { syncEventBus } from '../services/eventBus';
import type { ExerciseCategory, UniqueExercise, WorkoutSet, WorkoutSetType } from '../types';
import { parseLocaleNumber, calculateVolume, toTimestamp } from '../utils/workoutMath';
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
  PlateCalculatorModal,
  type WorkoutExerciseData,
  type ConfigExerciseState
} from '../components/workout';

export default function WorkoutPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  
  const [protocolName, setProtocolName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExerciseData[]>([]);
  const [truePRs, setTruePRs] = useState<Record<string, { weight: number; reps: number }>>({});
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(() => {
    if (!protocolId) return null;
    try {
      return localStorage.getItem(`workout_active_exercise_${protocolId}`);
    } catch {
      return null;
    }
  });
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  // Referências síncronas para blindagem contra race conditions e re-renderizações de auth
  const exercisesRef = useRef<WorkoutExerciseData[]>([]);
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  const activeWorkoutIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeWorkoutIdRef.current = activeWorkoutId;
  }, [activeWorkoutId]);

  const updateExpandedExercise = useCallback((exId: string | null) => {
    setExpandedExercise(exId);
    if (protocolId) {
      try {
        if (exId) {
          localStorage.setItem(`workout_active_exercise_${protocolId}`, exId);
        } else {
          localStorage.removeItem(`workout_active_exercise_${protocolId}`);
        }
      } catch {
        // Ignora erro de localStorage
      }
    }
  }, [protocolId]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  
  // Library Modal State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<UniqueExercise[]>([]);

  // Config Extra Exercise State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configEx, setConfigEx] = useState<ConfigExerciseState | null>(null);

  // Plate Calculator State
  const [plateCalcTarget, setPlateCalcTarget] = useState<{ exIdx: number; setIdx: number; weight: number } | null>(null);

  // Rest Timer State
  const [timerTrigger, setTimerTrigger] = useState(0);

  // Finish Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Cancel Dialog State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Screen Wake Lock ativo enquanto houver treino
  useWakeLock(!!activeWorkoutId);

  // Descarte automático de sessão ativa vazia ao sair da tela
  useEffect(() => {
    return () => {
      const currentId = activeWorkoutIdRef.current;
      if (currentId) {
        discardEmptyActiveWorkout(currentId).catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    async function loadWorkoutData() {
      if (!userId || !protocolId) return;
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
          .where('userId')
          .equals(userId)
          .filter(w => !w.isDeleted && w.protocolId === protocolId && w.status === 'active')
          .first();
        
        if (active) {
          setActiveWorkoutId(active.id);
          activeWorkoutIdRef.current = active.id;
        }

        // Buscar último treino concluído deste protocolo
        const allCompletedWorkouts = await db.workouts
          .where('userId')
          .equals(userId)
          .filter(w => !w.isDeleted && w.protocolId === protocolId && w.status !== 'cancelled' && w.status !== 'active')
          .toArray();
        
        allCompletedWorkouts.sort((a, b) => (toTimestamp(b.date) - toTimestamp(a.date)));
        
        const mostRecentWorkout = allCompletedWorkouts[0];
        const lastSetsMap: Record<string, WorkoutSet[]> = {};
        if (mostRecentWorkout) {
          const sets = (await db.workoutSets
            .where('workoutId').equals(mostRecentWorkout.id)
            .toArray()).filter(s => !s.isDeleted);
          sets.forEach(s => {
            if (!lastSetsMap[s.exerciseId]) lastSetsMap[s.exerciseId] = [];
            lastSetsMap[s.exerciseId].push(s);
          });
          for (const eid in lastSetsMap) {
            lastSetsMap[eid].sort((a, b) => toTimestamp(a.timestamp) - toTimestamp(b.timestamp));
          }
        }

        // Recordes Pessoais (PRs) do usuário e exercícios do protocolo
        const allExercises = await getExercisesByProtocol(protocolId);

        // Fallback: se algum exercício não tiver séries no último treino deste protocolo, busca no histórico geral
        for (const ex of allExercises) {
          if (!lastSetsMap[ex.id] || lastSetsMap[ex.id].length === 0) {
            const exSets = (await db.workoutSets
              .where('exerciseId')
              .equals(ex.id)
              .filter(s => !s.isDeleted && s.completed)
              .toArray()).sort((a, b) => (toTimestamp(b.timestamp || b.createdAt) - toTimestamp(a.timestamp || a.createdAt)));
            
            if (exSets.length > 0) {
              const latestWorkoutId = exSets[0].workoutId;
              const latestWorkoutSets = exSets.filter(s => s.workoutId === latestWorkoutId)
                .sort((a, b) => a.setIndex - b.setIndex);
              lastSetsMap[ex.id] = latestWorkoutSets;
            } else {
              const sameNameExercises = await db.exercises
                .where('userId')
                .equals(userId)
                .filter(e => e.name.trim().toLowerCase() === ex.name.trim().toLowerCase() && e.id !== ex.id)
                .toArray();
              
              if (sameNameExercises.length > 0) {
                const altIds = sameNameExercises.map(e => e.id);
                const altSets = (await db.workoutSets
                  .where('exerciseId')
                  .anyOf(altIds)
                  .filter(s => !s.isDeleted && s.completed)
                  .toArray()).sort((a, b) => (toTimestamp(b.timestamp || b.createdAt) - toTimestamp(a.timestamp || a.createdAt)));
                
                if (altSets.length > 0) {
                  const latestAltWorkoutId = altSets[0].workoutId;
                  const latestAltSets = altSets.filter(s => s.workoutId === latestAltWorkoutId)
                    .sort((a, b) => a.setIndex - b.setIndex);
                  lastSetsMap[ex.id] = latestAltSets;
                }
              }
            }
          }
        }

        const historicalPRs: Record<string, { weight: number; reps: number }> = {};
        for (const ex of allExercises) {
          const truePR = await getExercisePR(ex.id, userId);
          if (truePR) {
            historicalPRs[ex.id] = { weight: truePR.weight, reps: truePR.reps };
          } else {
            historicalPRs[ex.id] = { weight: 0, reps: 0 };
          }
        }
        setTruePRs(historicalPRs);
        
        // Dias que possuem exercícios agendados (compatibilidade com sufixo e ex.dayOfWeek)
        const isExOnDay = (ex: { name: string; dayOfWeek?: string }, dayLabel: string, dayKey?: string) => {
          if (dayKey && ex.dayOfWeek === dayKey) return true;
          if (ex.dayOfWeek === dayLabel) return true;
          if (ex.name.includes(`(${dayLabel})`)) return true;
          return false;
        };

        const weekDayLabels = WEEK_DAYS.map(d => d.label);
        const daysWithExercises = weekDayLabels.filter(dayLabel => {
          const dayObj = WEEK_DAYS.find(d => d.label === dayLabel);
          const dayKey = dayObj?.key || '';
          return allExercises.some(ex => isExOnDay(ex, dayLabel, dayKey));
        });
        setAvailableDays(daysWithExercises);

        let dayLabel = selectedDay;
        if (!dayLabel) {
          const today = WEEK_DAYS[new Date().getDay()]?.label || 'Seg';
          dayLabel = daysWithExercises.includes(today) ? today : (daysWithExercises[0] || today);
          setSelectedDay(dayLabel);
        }

        const currentDayObj = WEEK_DAYS.find(d => d.label === dayLabel);
        const currentDayKey = currentDayObj?.key || '';

        // Carregar todas as séries do treino ativo de forma atômica
        let activeWorkoutSets: WorkoutSet[] = [];
        if (active) {
          activeWorkoutSets = await db.workoutSets
            .where('workoutId')
            .equals(active.id)
            .filter(s => !s.isDeleted && s.completed)
            .toArray();
        }

        const activeSetsByExId: Record<string, Record<number, WorkoutSet>> = {};
        for (const s of activeWorkoutSets) {
          if (!activeSetsByExId[s.exerciseId]) activeSetsByExId[s.exerciseId] = {};
          activeSetsByExId[s.exerciseId][s.setIndex] = s;
        }

        const currentMemoryMap = new Map(exercisesRef.current.map(e => [e.id, e]));

        // Montar exercícios do dia selecionado
        const dayExercises = (await getExercisesByProtocol(protocolId, false, active?.id))
          .filter(ex => isExOnDay(ex, dayLabel, currentDayKey))
          .map((ex) => {
            const setNum = ex.sets || 3;
            const prevSets = lastSetsMap[ex.id] || [];
            const completedSets: boolean[] = new Array(setNum).fill(false);
            const memoryEx = currentMemoryMap.get(ex.id);

            const setsData = new Array(setNum).fill(null).map((_, idx) => {
              const activeSet = activeSetsByExId[ex.id]?.[idx];
              const memorySet = memoryEx?.setsData?.[idx];
              const prevSet = prevSets[idx];

              if (activeSet) {
                completedSets[idx] = true;
                return { 
                  weight: activeSet.weight.toString(), 
                  reps: activeSet.reps.toString(),
                  type: activeSet.type || 'normal',
                  notes: activeSet.notes || ''
                };
              }

              // Preserva séries marcadas em memória durante o ciclo de vida
              if (memoryEx?.completedSets?.[idx]) {
                completedSets[idx] = true;
              }

              return { 
                weight: memorySet?.weight ?? String(prevSet ? prevSet.weight : (ex.lastWeight || 0)), 
                reps: memorySet?.reps ?? String(prevSet ? prevSet.reps : (ex.lastReps || ex.reps || 10)),
                type: (memorySet?.type || prevSet?.type || 'normal') as WorkoutSetType,
                notes: memorySet?.notes ?? prevSet?.notes ?? ''
              };
            });

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
              lastReps: finalPR.reps,
              pinnedNotes: ex.pinnedNotes,
              supersetGroupId: ex.supersetGroupId,
            };
          });

        setExercises(dayExercises);
        if (dayExercises.length > 0) {
          setExpandedExercise((prev) => {
            let savedId: string | null = null;
            if (protocolId) {
              try {
                savedId = localStorage.getItem(`workout_active_exercise_${protocolId}`);
              } catch {
                // Ignore storage error
              }
            }

            // 1. Se já está aberto um exercício válido na lista atual, preserva
            if (prev && dayExercises.some((ex) => ex.id === prev)) {
              return prev;
            }
            // 2. Se há um ID persistido no localStorage válido para esta lista, usa ele
            if (savedId && dayExercises.some((ex) => ex.id === savedId)) {
              return savedId;
            }
            // 3. Foco Inteligente: Encontra o primeiro exercício que ainda possui séries pendentes
            const pendingEx = dayExercises.find((ex) => ex.completedSets.some((done) => !done));
            const chosenId = pendingEx ? pendingEx.id : dayExercises[0].id;

            if (protocolId && chosenId) {
              try {
                localStorage.setItem(`workout_active_exercise_${protocolId}`, chosenId);
              } catch {
                // Ignore storage error
              }
            }
            return chosenId;
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar treino.');
      } finally {
        setLoading(false);
      }
    }
    loadWorkoutData();
  }, [userId, protocolId, selectedDay, navigate]);

  useEffect(() => {
    if (isLibraryOpen && userId) {
      getUniqueExercisesLibrary(userId).then(setLibrary);
    }
  }, [isLibraryOpen, userId]);

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
      let currentWorkoutId = activeWorkoutIdRef.current || activeWorkoutId;
      
      if (!currentWorkoutId) {
        currentWorkoutId = await startWorkout({
          userId: user.id,
          protocolId,
        });
        activeWorkoutIdRef.current = currentWorkoutId;
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

        // Auto-avanço inteligente: se todas as séries do exercício atual foram concluídas, avança para o próximo pendente
        const allDone = exercise.completedSets.every(Boolean);
        if (allDone) {
          const nextPending = newExercises.slice(exIdx + 1).find((e) => e.completedSets.some((done) => !done));
          if (nextPending) {
            setTimeout(() => {
              updateExpandedExercise(nextPending.id);
            }, 300);
          }
        }
      } else {
        const existingSet = await db.workoutSets
          .where('workoutId')
          .equals(currentWorkoutId)
          .filter(s => s.exerciseId === exercise.id && s.setIndex === setIdx && !s.isDeleted)
          .first();

        if (existingSet) {
          await deleteWorkoutSet(existingSet.id);
          fullSync().catch(console.error);
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
    const currentWorkoutId = activeWorkoutIdRef.current || activeWorkoutId;
    if (newExercises[exIdx].completedSets[setIdx] && currentWorkoutId) {
      upsertWorkoutSet({
        workoutId: currentWorkoutId,
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
    const currentWorkoutId = activeWorkoutIdRef.current || activeWorkoutId;
    if (newExercises[exIdx].completedSets[setIdx] && currentWorkoutId) {
      upsertWorkoutSet({
        workoutId: currentWorkoutId,
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
      updateExpandedExercise(newExId);
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
    const currentWorkoutId = activeWorkoutIdRef.current || activeWorkoutId;
    if (!currentWorkoutId) return;
    
    try {
      const sets = await db.workoutSets
        .where('workoutId')
        .equals(currentWorkoutId)
        .filter(s => s.exerciseId === exId && !s.isDeleted)
        .toArray();
      for (const s of sets) {
        await deleteWorkoutSet(s.id);
      }
      await deleteExercise(exId);

      setExercises(prev => prev.filter(ex => ex.id !== exId));
      if (expandedExercise === exId) updateExpandedExercise(null);
      
      toast.success('Exercício removido.');
      fullSync().catch(console.error);
    } catch (err) {
      console.error('[Delete] Erro:', err);
      toast.error('Erro ao remover exercício.');
    }
  };

  const confirmCancelWorkout = async () => {
    if (protocolId) {
      try {
        localStorage.removeItem(`workout_active_exercise_${protocolId}`);
      } catch {
        // Ignore storage error
      }
    }

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
      syncEventBus.emitDataMutated({ table: 'workouts', action: 'update', recordId: activeWorkoutId });
      fullSync().catch((err) => {
        console.warn('[Sync] Sincronização em background adiada:', err);
      });

      if (protocolId) {
        try {
          localStorage.removeItem(`workout_active_exercise_${protocolId}`);
        } catch {
          // Ignore storage error
        }
      }

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

  const handleOpenPlateCalculator = (exIdx: number, setIdx: number, weight: number) => {
    setPlateCalcTarget({ exIdx, setIdx, weight });
  };

  const handleApplyPlateCalculator = (calculatedWeight: number) => {
    if (!plateCalcTarget) return;
    const { exIdx, setIdx } = plateCalcTarget;
    updateSetData(exIdx, setIdx, 'weight', String(calculatedWeight));
    setPlateCalcTarget(null);
  };

  const handleUpdatePinnedNotes = async (exId: string, notes: string) => {
    try {
      await updateExercise(exId, { pinnedNotes: notes });
      setExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, pinnedNotes: notes } : ex));
      toast.success('Nota salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
      toast.error('Erro ao salvar nota.');
    }
  };

  const handleSwapExercise = async (
    exIdx: number,
    newEx: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }
  ) => {
    const currentEx = exercises[exIdx];
    if (!currentEx) return;

    const daySuffix = selectedDay ? ` (${selectedDay})` : '';
    const fullName = `${newEx.name}${daySuffix}`;

    try {
      await updateExercise(currentEx.id, {
        name: fullName,
        muscleGroup: newEx.muscleGroup,
        category: newEx.category,
        multiplier: newEx.multiplier || 1.0
      });

      setExercises(prev => {
        const next = [...prev];
        next[exIdx] = {
          ...next[exIdx],
          name: fullName,
          muscleGroup: newEx.muscleGroup,
          category: newEx.category,
          multiplier: newEx.multiplier || 1.0
        };
        return next;
      });

      if (user) {
        const newPR = await getExercisePR(currentEx.id, user.id);
        if (newPR) {
          setTruePRs(prev => ({ ...prev, [currentEx.id]: { weight: newPR.weight, reps: newPR.reps } }));
        }
      }

      toast.success(`Substituído por "${newEx.name}"`);
    } catch (err) {
      console.error('Erro ao substituir exercício:', err);
      toast.error('Erro ao substituir exercício.');
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
        <header className="flex items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <Button 
              type="button"
              variant="ghost" 
              size="icon"
              onClick={async () => {
                if (activeWorkoutIdRef.current) {
                  await discardEmptyActiveWorkout(activeWorkoutIdRef.current);
                }
                navigate('/');
              }}
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase text-foreground tracking-tight leading-tight truncate">
                {protocolName}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                <p className="text-[10px] sm:text-xs text-primary font-mono font-bold uppercase tracking-wider truncate">
                  Sessão Ativa
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cancelar Treino */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-wider"
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
              userId={user?.id}
              library={library}
              onToggleExpand={() => updateExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
              onToggleSet={handleSetToggle}
              onUpdateSetData={updateSetData}
              onUpdateSetType={updateSetType}
              onDeleteExtraExercise={handleDeleteExtraExercise}
              onUpdatePinnedNotes={handleUpdatePinnedNotes}
              onOpenPlateCalculator={handleOpenPlateCalculator}
              onSwapExercise={handleSwapExercise}
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

        <PlateCalculatorModal
          isOpen={!!plateCalcTarget}
          onClose={() => setPlateCalcTarget(null)}
          initialWeight={plateCalcTarget?.weight || 0}
          onApplyWeight={handleApplyPlateCalculator}
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
