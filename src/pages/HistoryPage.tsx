import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDataReactivity } from '../hooks/useDataReactivity';
import { Layout, PageHeader, EmptyState } from '../components/common';
import { 
  getWorkoutHistory, 
  db, 
  getWorkoutSets, 
  deleteWorkout, 
  deleteWorkoutSet, 
  updateWorkoutSet, 
  updateExercise, 
  getBodyWeightsByUser, 
  updateBodyWeight, 
  deleteBodyWeight
} from '../services/workoutDB';
import { fullSync } from '../services/syncService';
import { syncEventBus } from '../services/eventBus';
import type { Workout, BodyWeight, WorkoutSet, Exercise, Protocol } from '../types';
import { ClipboardList } from "lucide-react";
import { toast } from 'sonner';

import { 
  HistoryFilters, 
  HistoryWorkoutCard, 
  HistoryWeightCard, 
  EditSetModal, 
  EditDateModal 
} from '../components/history';

type WorkoutHistoryItem = Workout & { type: 'workout' };
type WeightHistoryItem = BodyWeight & { type: 'weight' };
type HistoryItem = WorkoutHistoryItem | WeightHistoryItem;

export default function HistoryPage() {
  const { user } = useAuth();
  const dataVersion = useDataReactivity();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [protocolsMap, setProtocolsMap] = useState<Record<string, string>>({});
  const [exercisesMap, setExercisesMap] = useState<Record<string, Exercise>>({});
  const [sessionDetails, setSessionDetails] = useState<Record<string, [string, WorkoutSet[]][]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'workout' | 'weight'>('all');
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('all');

  // Modals State
  const [editingSet, setEditingSet] = useState<{ set: WorkoutSet; exerciseName: string } | null>(null);
  const [editingDateWorkout, setEditingDateWorkout] = useState<Workout | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [workouts, weights, allUserProtocols, allUserExercises] = await Promise.all([
        getWorkoutHistory(user.id),
        getBodyWeightsByUser(user.id),
        db.protocols.where('userId').equals(user.id).toArray(),
        db.exercises.where('userId').equals(user.id).toArray()
      ]);

      const formattedWorkouts: WorkoutHistoryItem[] = workouts.map((w: Workout) => ({ ...w, type: 'workout' }));
      const formattedWeights: WeightHistoryItem[] = weights.map((w: BodyWeight) => ({ ...w, type: 'weight' }));

      const mixed: HistoryItem[] = [...formattedWorkouts, ...formattedWeights].sort((a, b) => b.date - a.date);
      
      const pMap: Record<string, string> = {};
      allUserProtocols.forEach((p: Protocol) => {
        pMap[p.id] = p.name;
      });

      const exMap: Record<string, Exercise> = {};
      allUserExercises.forEach((ex: Exercise) => {
        exMap[ex.id] = ex;
      });
      
      const activeProtocols = allUserProtocols.filter(p => !p.isDeleted);
      setProtocols(activeProtocols);
      setProtocolsMap(pMap);
      setExercisesMap(exMap);
      setHistory(mixed);
    } catch (err) {
      console.error('[HistoryPage] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, dataVersion, loadData]);

  const toggleExpand = async (workoutId: string) => {
    if (expandedId === workoutId) {
      setExpandedId(null);
      return;
    }

    if (!sessionDetails[workoutId]) {
      try {
        const sets = await getWorkoutSets(workoutId);
        sets.sort((a, b) => a.timestamp - b.timestamp);

        const orderedExIds: string[] = [];
        const grouped: Record<string, WorkoutSet[]> = {};
        
        sets.forEach(s => {
          if (!grouped[s.exerciseId]) {
            grouped[s.exerciseId] = [];
            orderedExIds.push(s.exerciseId);
          }
          grouped[s.exerciseId].push(s);
        });

        const sortedGrouped: [string, WorkoutSet[]][] = orderedExIds.map(id => [id, grouped[id]]);
        setSessionDetails(prev => ({ ...prev, [workoutId]: sortedGrouped }));
      } catch (err) {
        console.error('[HistoryPage] Erro ao obter séries:', err);
      }
    }
    setExpandedId(workoutId);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      await deleteWorkout(workoutId);
      setHistory(prev => prev.filter(w => w.id !== workoutId));
      syncEventBus.emitDataMutated({ table: 'workouts', action: 'delete', recordId: workoutId });
      toast.success('Treino removido com sucesso.');
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir treino.');
    }
  };

  const handleUpdateWeight = async (id: string, newWeight: number) => {
    try {
      await updateBodyWeight(id, { weight: newWeight });
      setHistory(prev => prev.map(w => w.id === id ? { ...w, weight: newWeight } : w));
      syncEventBus.emitDataMutated({ table: 'body_weights', action: 'update', recordId: id });
      toast.success('Peso atualizado com sucesso!');
      fullSync().catch(console.error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erro ao atualizar peso: ' + msg);
    }
  };

  const handleDeleteWeight = async (id: string) => {
    try {
      await deleteBodyWeight(id);
      setHistory(prev => prev.filter(w => w.id !== id));
      syncEventBus.emitDataMutated({ table: 'body_weights', action: 'delete', recordId: id });
      toast.success('Registro de peso removido.');
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir registro de peso.');
    }
  };

  const handleSaveEditedSet = async (setId: string, weight: number, reps: number) => {
    if (!editingSet) return;
    const targetSet = editingSet.set;

    setSessionDetails(prev => {
      const newDetails: Record<string, [string, WorkoutSet[]][]> = { ...prev };
      for (const [wId, sets] of Object.entries(newDetails)) {
        newDetails[wId] = sets.map(([exerciseId, arr]) => [
          exerciseId, 
          arr.map(s => s.id === setId ? { ...s, weight, reps } : s)
        ] as [string, WorkoutSet[]]);
      }
      return newDetails;
    });

    try {
      await updateWorkoutSet(setId, { weight, reps });
      const exercise = await db.exercises.get(targetSet.exerciseId);
      if (exercise) {
        const currentMaxWeight = exercise.lastWeight || 0;
        const currentMaxReps = exercise.lastReps || 0;

        if (weight > currentMaxWeight || (weight === currentMaxWeight && reps > currentMaxReps)) {
          await updateExercise(exercise.id, { 
            lastWeight: weight, 
            lastReps: reps 
          });
        }
      }
      toast.success('Série atualizada com sucesso!');
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar série.');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await deleteWorkoutSet(setId);
      
      setSessionDetails(prev => {
        const newDetails: Record<string, [string, WorkoutSet[]][]> = { ...prev };
        for (const [wId, sets] of Object.entries(newDetails)) {
          newDetails[wId] = sets.map(([exerciseId, arr]) => [
            exerciseId,
            arr.filter(s => s.id !== setId)
          ] as [string, WorkoutSet[]]).filter(([, arr]) => arr.length > 0);
        }
        return newDetails;
      });

      toast.success('Série excluída.');
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir série.');
    }
  };

  const handleSaveEditedDate = async (newTimestamp: number) => {
    if (!editingDateWorkout) return;
    try {
      await db.workouts.update(editingDateWorkout.id, { date: newTimestamp, isSynced: false });
      setHistory(h => h.map(w => w.id === editingDateWorkout.id ? { ...w, date: newTimestamp } : w).sort((a, b) => b.date - a.date));
      toast.success('Data do treino atualizada com sucesso!');
      window.dispatchEvent(new Event('refresh-analysis'));
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar data do treino.');
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      if (item.type === 'workout') {
        if (selectedProtocolId !== 'all' && item.protocolId !== selectedProtocolId) {
          return false;
        }

        if (search.trim()) {
          const q = search.toLowerCase();
          const pName = (protocolsMap[item.protocolId] || '').toLowerCase();
          const matchesProtocol = pName.includes(q);
          const sets = sessionDetails[item.id] || [];
          const matchesExercise = sets.some(([eId]) => {
            const exName = (exercisesMap[eId]?.name || '').toLowerCase();
            return exName.includes(q);
          });
          return matchesProtocol || matchesExercise;
        }
      }

      return true;
    });
  }, [history, typeFilter, selectedProtocolId, search, protocolsMap, sessionDetails, exercisesMap]);

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <PageHeader 
          title="Histórico de Atividades" 
          description="Linha do tempo de todas as suas sessões e pesagens corporais."
          icon={<ClipboardList className="w-5 h-5 text-primary" />}
        />

        <HistoryFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          selectedProtocolId={selectedProtocolId}
          onProtocolChange={setSelectedProtocolId}
          protocols={protocols}
        />

        {loading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Carregando histórico...
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="Nenhum registro encontrado"
            description="Complete treinos ou registre seu peso corporal para acompanhar sua evolução ao longo do tempo."
          />
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              if (item.type === 'weight') {
                return (
                  <HistoryWeightCard
                    key={`weight-${item.id}`}
                    item={item}
                    onUpdateWeight={handleUpdateWeight}
                    onDeleteWeight={handleDeleteWeight}
                  />
                );
              }

              return (
                <HistoryWorkoutCard
                  key={`workout-${item.id}`}
                  workout={item}
                  protocolName={protocolsMap[item.protocolId] || 'Protocolo Personalizado'}
                  groupedSets={sessionDetails[item.id] || []}
                  exercisesMap={exercisesMap}
                  isExpanded={expandedId === item.id}
                  onToggleExpand={() => toggleExpand(item.id)}
                  onEditSet={(set, exerciseName) => setEditingSet({ set, exerciseName })}
                  onDeleteSet={handleDeleteSet}
                  onEditDate={(w) => setEditingDateWorkout(w)}
                  onDeleteWorkout={handleDeleteWorkout}
                />
              );
            })}
          </div>
        )}

        <EditSetModal
          isOpen={!!editingSet}
          onClose={() => setEditingSet(null)}
          set={editingSet?.set || null}
          exerciseName={editingSet?.exerciseName}
          onSave={handleSaveEditedSet}
        />

        <EditDateModal
          isOpen={!!editingDateWorkout}
          onClose={() => setEditingDateWorkout(null)}
          currentTimestamp={editingDateWorkout?.date}
          onSave={handleSaveEditedDate}
        />
      </div>
    </Layout>
  );
}
