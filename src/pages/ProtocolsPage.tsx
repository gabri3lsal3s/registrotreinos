import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Layout, PageHeader, EmptyState } from '../components/common';
import { 
  db, 
  getProtocolsByUser, 
  getExercisesByProtocol, 
  createProtocol, 
  deleteProtocol, 
  duplicateProtocol,
  addExercise, 
  updateExercise 
} from '../services/workoutDB';
import { WEEK_DAYS } from '../utils/constants';
import { parseLocaleNumber } from '../utils/workoutMath';
import { fullSync, deleteRemoteItem } from '../services/syncService';
import type { Protocol, Exercise, ExerciseCategory } from '../types';
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, Upload, Dumbbell, Sparkles } from "lucide-react";
import { 
  ProtocolCard, 
  ProtocolBuilder, 
  ImportProtocolModal,
  ShareProtocolModal,
  StarterPacksModal,
  type BuilderExerciseItem 
} from '../components/protocols';
import { exportProtocolJSON } from '../services/protocolTransferService';
import type { ProtocolWithExercises } from '../types';

export default function ProtocolsPage() {
  const { user, syncStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({});
  const [activeDayCounts, setActiveDayCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Builder State
  const [showBuilder, setShowBuilder] = useState(false);
  const [protocolName, setProtocolName] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [activeDays, setActiveDays] = useState<string[]>(['mon']);
  const [selectedDay, setSelectedDay] = useState('mon');
  const [workouts, setWorkouts] = useState<Record<string, BuilderExerciseItem[]>>({});
  const [saving, setSaving] = useState(false);
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);

  // Modais de Importação, Compartilhamento e Starter Packs
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStarterPacksOpen, setIsStarterPacksOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [protocolToShare, setProtocolToShare] = useState<ProtocolWithExercises | null>(null);

  const loadProtocols = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getProtocolsByUser(user.id);
      const filtered = data.filter((p) => !p.isArchived);
      setProtocols(filtered || []);

      // Contar exercícios e dias de cada protocolo
      const counts: Record<string, number> = {};
      const dayCounts: Record<string, number> = {};

      for (const p of filtered) {
        const exs = await getExercisesByProtocol(p.id);
        counts[p.id] = exs.length;
        
        if (p.daysOfWeek && p.daysOfWeek.length > 0) {
          dayCounts[p.id] = p.daysOfWeek.length;
        } else {
          const uniqueDays = new Set(exs.map(e => e.dayOfWeek).filter(Boolean));
          dayCounts[p.id] = uniqueDays.size || 1;
        }
      }

      setExerciseCounts(counts);
      setActiveDayCounts(dayCounts);
    } catch (err) {
      console.error('[ProtocolsPage] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProtocols();
    }
  }, [user, loadProtocols]);

  useEffect(() => {
    if (syncStatus === 'synced' && user) {
      loadProtocols();
    }
  }, [syncStatus, user, loadProtocols]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenNewBuilder();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const sortedProtocols = [...protocols].sort((a, b) => {
    if (a.isEnabled && !b.isEnabled) return -1;
    if (!a.isEnabled && b.isEnabled) return 1;
    const timeA = a.updatedAt || a.createdAt || 0;
    const timeB = b.updatedAt || b.createdAt || 0;
    return timeB - timeA;
  });

  const handleOpenNewBuilder = () => {
    setProtocolName('');
    setIsEnabled(true);
    setActiveDays(['mon']);
    setSelectedDay('mon');
    setWorkouts({ mon: [] });
    setEditingProtocolId(null);
    setShowBuilder(true);
  };

  const handleEditProtocol = async (id: string) => {
    const p = await db.protocols.get(id);
    if (!p) return;

    const allExs = await getExercisesByProtocol(id);
    const organizedWorkouts: Record<string, BuilderExerciseItem[]> = {};
    const activeDayKeys: string[] = [];

    WEEK_DAYS.forEach(day => {
      const label = day.label;
      const dayExs = allExs
        .filter((ex) => {
          if (ex.dayOfWeek === day.key) return true;
          if (!ex.dayOfWeek && ex.name.endsWith(`(${label})`)) return true;
          return false;
        })
        .map((ex) => ({
          id: ex.id,
          name: ex.name.replace(` (${label})`, ''),
          muscleGroup: ex.muscleGroup || '',
          category: ex.category || 'weight',
          multiplier: ex.multiplier,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          baseline: ex.lastWeight || '',
          pinnedNotes: ex.pinnedNotes || '',
        }));
      
      if (dayExs.length > 0) {
        organizedWorkouts[day.key] = dayExs;
        activeDayKeys.push(day.key);
      }
    });

    const initialDays = p.daysOfWeek && p.daysOfWeek.length > 0 ? p.daysOfWeek : (activeDayKeys.length > 0 ? activeDayKeys : ['mon']);
    
    setProtocolName(p.name);
    setIsEnabled(!!p.isEnabled);
    setActiveDays(initialDays);
    setSelectedDay(initialDays[0] || 'mon');
    setWorkouts(organizedWorkouts);
    setEditingProtocolId(id);
    setShowBuilder(true);
  };

  const handleDuplicateProtocol = async (protocolId: string) => {
    if (!user) return;
    try {
      const newId = await duplicateProtocol(protocolId, user.id);
      toast.success('Protocolo clonado com sucesso!');
      await fullSync();
      await loadProtocols();
      handleEditProtocol(newId);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao duplicar protocolo.');
    }
  };

  const handleExportProtocol = async (protocolId: string) => {
    try {
      await exportProtocolJSON(protocolId);
      toast.success('Protocolo exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar protocolo.');
    }
  };

  const handleImportSuccess = async () => {
    setIsImportModalOpen(false);
    await loadProtocols();
  };

  const handleShareProtocol = async (protocolId: string) => {
    const p = protocols.find(item => item.id === protocolId);
    if (!p) return;
    try {
      const exs = await getExercisesByProtocol(p.id);
      setProtocolToShare({
        ...p,
        exercises: exs
      });
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Erro ao preparar compartilhamento:', err);
      toast.error('Erro ao carregar dados do protocolo para compartilhamento.');
    }
  };

  // Suporte a importação direta via link descentralizado (?import_data=...)
  useEffect(() => {
    const importData = searchParams.get('import_data');
    if (importData && user) {
      try {
        // Limpar o param da URL para evitar loops
        setSearchParams({}, { replace: true });
        setIsImportModalOpen(true);
      } catch (e) {
        console.error('Erro ao processar import_data:', e);
      }
    }
  }, [searchParams, setSearchParams, user]);

  const handleDeleteProtocol = async (protocolId: string) => {
    if (!user) return;
    try {
      await deleteRemoteItem('protocols', protocolId);
      await deleteProtocol(protocolId);
      await fullSync();
      toast.success('Protocolo removido.');
      loadProtocols();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir protocolo.');
    }
  };

  const handleToggleEnabled = async (protocolId: string, newState: boolean) => {
    if (!user) return;

    try {
      const now = Date.now();
      await db.protocols.update(protocolId, { isEnabled: newState, updatedAt: now, isSynced: false });
      setProtocols(prev => prev.map(p => p.id === protocolId ? { ...p, isEnabled: newState, updatedAt: now, isSynced: false } : p));
      toast.success(newState ? 'Protocolo ativado!' : 'Protocolo desativado.');
      
      fullSync().catch(console.error);
    } catch (err) {
      console.error('[Toggle] Erro:', err);
      toast.error('Erro ao atualizar status do protocolo.');
    }
  };

  const handleToggleDay = (dayKey: string) => {
    setActiveDays((prev) => {
      const exists = prev.includes(dayKey);
      if (exists && prev.length === 1) {
        toast.error('Selecione pelo menos um dia.');
        return prev;
      }
      const next = exists ? prev.filter(d => d !== dayKey) : [...prev, dayKey];
      const sorted = next.sort((a, b) => {
        const idxA = WEEK_DAYS.findIndex(d => d.key === a);
        const idxB = WEEK_DAYS.findIndex(d => d.key === b);
        return idxA - idxB;
      });
      if (!sorted.includes(selectedDay)) {
        setSelectedDay(sorted[0] || 'mon');
      }
      return sorted;
    });
  };

  const handleUpdateExercise = (day: string, idx: number, field: string, value: string | number | boolean) => {
    setWorkouts((prev) => {
      const dayList = [...(prev[day] || [])];
      if (!dayList[idx]) return prev;
      dayList[idx] = { ...dayList[idx], [field]: value };
      return { ...prev, [day]: dayList };
    });
  };

  const handleRemoveExercise = (day: string, idx: number) => {
    setWorkouts((prev) => {
      const dayList = [...(prev[day] || [])];
      dayList.splice(idx, 1);
      return { ...prev, [day]: dayList };
    });
  };

  const handleAddExerciseToDay = (
    day: string,
    exercise: { name: string; muscleGroup: string; category: ExerciseCategory; multiplier?: number }
  ) => {
    setWorkouts((prev) => ({
      ...prev,
      [day]: [
        ...(prev[day] || []),
        {
          id: crypto.randomUUID(),
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          category: exercise.category,
          multiplier: exercise.multiplier,
          sets: 3,
          reps: 10,
          baseline: ''
        }
      ]
    }));
  };

  const handleReorderExercises = (day: string, newExercises: BuilderExerciseItem[]) => {
    setWorkouts((prev) => ({
      ...prev,
      [day]: newExercises
    }));
  };

  const handleSaveProtocol = async () => {
    if (!protocolName.trim()) {
      toast.error('Informe o nome do protocolo.');
      return;
    }
    if (activeDays.length === 0) {
      toast.error('Selecione pelo menos um dia da semana.');
      return;
    }

    setSaving(true);
    try {
      let targetProtocolId = editingProtocolId;
      const now = Date.now();
      let oldExercises: Exercise[] = [];

      if (targetProtocolId) {
        oldExercises = await db.exercises.where('protocolId').equals(targetProtocolId).toArray();
        await db.protocols.update(targetProtocolId, {
          name: protocolName.trim(),
          isEnabled,
          daysOfWeek: activeDays,
          updatedAt: now,
          isSynced: false
        });
      } else {
        targetProtocolId = await createProtocol({
          name: protocolName.trim(),
          userId: user!.id,
          isEnabled,
          daysOfWeek: activeDays,
        });
      }

      const activeExerciseIds = new Set<string>();

      for (const day of activeDays) {
        const dayLabel = WEEK_DAYS.find(d => d.key === day)?.label || day;
        const dayExercises = workouts[day] || [];

        for (let i = 0; i < dayExercises.length; i++) {
          const ex = dayExercises[i];
          const exData: Omit<Exercise, 'id'> = {
            protocolId: targetProtocolId!,
            name: `${ex.name} (${dayLabel})`,
            muscleGroup: ex.muscleGroup || undefined,
            category: ex.category || 'weight',
            multiplier: ex.multiplier !== undefined && ex.multiplier !== null ? Number(ex.multiplier) : 1.0,
            order: i,
            dayOfWeek: day,
            sets: parseLocaleNumber(ex.sets, 3),
            reps: parseLocaleNumber(ex.reps, 10),
            lastWeight: parseLocaleNumber(ex.baseline, 0),
            lastReps: parseLocaleNumber(ex.reps, 0),
            pinnedNotes: ex.pinnedNotes ? ex.pinnedNotes.trim() : undefined,
          };

          if (ex.id && oldExercises.some(old => old.id === ex.id)) {
            await updateExercise(ex.id, exData);
            activeExerciseIds.add(ex.id);
          } else {
            const newId = await addExercise(exData);
            activeExerciseIds.add(newId);
          }
        }
      }

      // Remover exercícios excluídos
      const removedExercises = oldExercises.filter(ex => !activeExerciseIds.has(ex.id));
      for (const removedEx of removedExercises) {
        const historyCount = await db.workoutSets.where('exerciseId').equals(removedEx.id).count();
        if (historyCount === 0) {
          await deleteRemoteItem('exercises', removedEx.id);
          await db.exercises.delete(removedEx.id);
        } else {
          await updateExercise(removedEx.id, { isArchived: true });
        }
      }

      await fullSync();
      toast.success(editingProtocolId ? 'Protocolo atualizado com sucesso!' : 'Protocolo criado com sucesso!');
      setShowBuilder(false);
      loadProtocols();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar protocolo.');
    } finally {
      setSaving(false);
    }
  };

  if (showBuilder) {
    return (
      <Layout>
        <ProtocolBuilder
          protocolName={protocolName}
          onChangeName={setProtocolName}
          isEnabled={isEnabled}
          onToggleEnabled={setIsEnabled}
          activeDays={activeDays}
          onToggleDay={handleToggleDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          exercisesByDay={workouts}
          onUpdateExercise={handleUpdateExercise}
          onRemoveExercise={handleRemoveExercise}
          onAddExercise={handleAddExerciseToDay}
          onReorderExercises={handleReorderExercises}
          onSave={handleSaveProtocol}
          onCancel={() => setShowBuilder(false)}
          isSaving={saving}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <PageHeader 
          title="Planilhas e Protocolos" 
          description="Gerencie seus planos de treino e rotinas semanais."
          icon={<Dumbbell className="w-5 h-5 text-primary" />}
          action={
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setIsStarterPacksOpen(true)}
                className="h-11 px-2.5 sm:px-3.5 rounded-xl font-bold text-xs uppercase tracking-wider border-border/60 flex items-center justify-center gap-1.5"
                title="Explorar Fichas Prontas"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Templates</span>
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="h-11 px-2.5 sm:px-3.5 rounded-xl font-bold text-xs uppercase tracking-wider border-border/60 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">Importar</span>
              </Button>
              <Button 
                onClick={handleOpenNewBuilder}
                className="h-11 px-3 sm:px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Novo</span>
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Carregando protocolos...
            </p>
          </div>
        ) : protocols.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="Nenhum protocolo cadastrado"
            description="Crie seu primeiro plano de treino, adote um template pronto ou importe uma planilha para começar."
            action={
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button 
                  onClick={() => setIsStarterPacksOpen(true)}
                  className="rounded-xl h-11 px-5 bg-primary text-primary-foreground font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-300" />
                  Ver Templates Prontos
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleOpenNewBuilder} 
                  className="rounded-xl h-11 px-5 border-border/60"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar do Zero
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsImportModalOpen(true)}
                  className="rounded-xl h-11 px-5 border-border/60"
                >
                  <Upload className="w-4 h-4 mr-2 text-primary" />
                  Importar Planilha
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedProtocols.map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                exerciseCount={exerciseCounts[protocol.id] || 0}
                activeDaysCount={activeDayCounts[protocol.id] || 1}
                onStartWorkout={(id) => navigate(`/workout/${id}`)}
                onEditProtocol={handleEditProtocol}
                onDuplicateProtocol={handleDuplicateProtocol}
                onExportProtocol={handleExportProtocol}
                onShareProtocol={handleShareProtocol}
                onDeleteProtocol={handleDeleteProtocol}
                onToggleEnabled={(id, enabled) => handleToggleEnabled(id, enabled)}
              />
            ))}
          </div>
        )}

        {/* Modal de Templates Consagrados (Starter Packs) */}
        {user && (
          <StarterPacksModal
            isOpen={isStarterPacksOpen}
            onClose={() => setIsStarterPacksOpen(false)}
            userId={user.id}
            onSuccess={() => loadProtocols()}
          />
        )}

        {/* Modal de Compartilhamento de Protocolo (Link / QR Code) */}
        <ShareProtocolModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setProtocolToShare(null);
          }}
          protocol={protocolToShare}
        />

        {/* Modal de Importação Universal */}
        {user && (
          <ImportProtocolModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onSuccess={handleImportSuccess}
            userId={user.id}
            existingProtocolNames={protocols.map(p => p.name)}
          />
        )}
      </div>
    </Layout>
  );
}
