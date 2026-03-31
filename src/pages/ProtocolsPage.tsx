import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { db, getProtocolsByUser, getExercisesByProtocol, createProtocol, deleteProtocol, addExercise, updateExercise, type Protocol } from '../services/workoutDB';
import { getExerciseInfo } from '../utils/exerciseDictionary';
import { fullSync, deleteRemoteItem, syncData } from '../services/syncService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Minus, ClipboardList, Zap, Dumbbell, ListTodo, Play, Trash2, GripVertical, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

import { PageHeader } from '../components/PageHeader';

const WEEK_DAYS = [
  { key: 'sun', label: 'Dom' },
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
];

function DraggableExercise({ 
  ex, 
  idx, 
  day, 
  onUpdate 
}: { 
  ex: any; 
  idx: number; 
  day: string; 
  onUpdate: (day: string, idx: number, field: string, value: any) => void 
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: ex.id,
    data: {
      type: 'Exercise',
      day,
      exercise: ex
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/20 border border-border/50 rounded-2xl px-3 py-3 sm:py-2.5 group hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 shrink-0">
          <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 pr-2">
          <Input
            placeholder="Exercício"
            className="w-full bg-transparent border-none font-black text-[clamp(11px,1.4vw,13px)] uppercase tracking-tight focus-visible:ring-0 placeholder:opacity-50 p-0 h-auto"
            value={ex.name}
            onChange={(e) => onUpdate(day, idx, 'name', e.target.value)}
          />
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Select value={ex.category || 'weight'} onValueChange={(val) => onUpdate(day, idx, 'category', val)}>
              <SelectTrigger className="h-6 text-[9px] w-[fit-content] border-none bg-secondary/15 hover:bg-secondary/25 transition-colors focus:ring-0 px-2.5 rounded-md uppercase tracking-wide font-bold text-secondary-foreground flex items-center gap-1 shadow-none">
                <SelectValue placeholder="TIPO: CARGA" />
              </SelectTrigger>
              <SelectContent className="text-[10px] uppercase font-bold tracking-wider border-border/40">
                <SelectItem value="weight">Carga (Peso)</SelectItem>
                <SelectItem value="bodyweight">Peso Corporal</SelectItem>
                <SelectItem value="time">Tempo (Timer)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ex.muscleGroup || ''} onValueChange={(val) => onUpdate(day, idx, 'muscleGroup', val)}>
              <SelectTrigger className="h-6 text-[9px] w-[fit-content] border-none bg-primary/10 hover:bg-primary/20 transition-colors focus:ring-0 px-2.5 rounded-md uppercase tracking-wide font-bold text-muted-foreground flex items-center gap-1 shadow-none">
                <SelectValue placeholder="G. MUSCULAR" />
              </SelectTrigger>
              <SelectContent className="text-[10px] uppercase font-bold tracking-wider border-border/40">
                <SelectItem value="Peito">PEITO</SelectItem>
                <SelectItem value="Costas">COSTAS</SelectItem>
                <SelectItem value="Pernas">PERNAS</SelectItem>
                <SelectItem value="Ombros">OMBROS</SelectItem>
                <SelectItem value="Bíceps">BÍCEPS</SelectItem>
                <SelectItem value="Tríceps">TRÍCEPS</SelectItem>
                <SelectItem value="Core">CORE</SelectItem>
                <SelectItem value="Outros">OUTROS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 sm:justify-end mt-2 sm:mt-0">
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black uppercase text-muted-foreground/70">
            {ex.category === 'time' ? 'Tempo' : 'Séries x Reps'}
          </span>
          <div className="flex items-center gap-1 bg-background/50 rounded-xl px-1 py-1 border border-border/30">
            <button
              type="button"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-primary transition-colors disabled:opacity-30"
              onClick={() => onUpdate(day, idx, 'sets', Math.max(1, (ex.sets || 1) - 1))}
              disabled={ex.sets <= 1}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <Input
              type="number"
              min={1}
              max={99}
              className="w-8 bg-transparent border-none text-[clamp(11px,1.2vw,13px)] text-center font-black p-0 h-6 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={ex.sets}
              onChange={(e) => onUpdate(day, idx, 'sets', Number(e.target.value))}
            />
            <button
              type="button"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-primary transition-colors"
              onClick={() => onUpdate(day, idx, 'sets', (ex.sets || 0) + 1)}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-black opacity-60 ml-1">X</span>
            <Input
              type="number"
              min={1}
              max={999}
              className={`${ex.category === 'time' ? 'w-12' : 'w-10'} bg-transparent border-none text-[clamp(11px,1.2vw,13px)] text-center font-black p-0 h-6 focus-visible:ring-0`}
              value={ex.reps}
              onChange={(e) => onUpdate(day, idx, 'reps', Number(e.target.value))}
            />
            {ex.category === 'time' && <span className="text-[10px] font-black opacity-60">s</span>}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
           <span className="text-[9px] font-black uppercase text-muted-foreground/70">
            {ex.category === 'weight' ? 'Carga' : '+ Carga'}
           </span>
           <div className="flex items-center gap-1 bg-background/50 rounded-xl px-2.5 py-1.5 border border-border/30 w-24">
            <Input
              type="number"
              min={0}
              step={0.5}
              className="w-14 bg-transparent border-none text-[clamp(11px,1.2vw,13px)] text-center font-black p-0 h-6 focus-visible:ring-0"
              value={ex.baseline}
              onChange={(e) => onUpdate(day, idx, 'baseline', e.target.value)}
              placeholder="0"
            />
            <span className="text-[10px] font-black opacity-60">KG</span>
          </div>
        </div>

        <button
          type="button"
          className="ml-1 p-2 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors mb-0.5"
          title="Excluir exercício"
          onClick={() => onUpdate(day, idx, 'delete', true)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ProtocolsPage() {
  const { user, syncStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [activeWorkoutIds, setActiveWorkoutIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Builder State
  const [showBuilder, setShowBuilder] = useState(false);
  const [protocolName, setProtocolName] = useState('');
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<Record<string, any[]>>({});
  const [saving, setSaving] = useState(false);
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProtocols();
    }
  }, [user]);

  // Recarregar quando o sync terminar (background ou automático)
  useEffect(() => {
    if (syncStatus === 'synced' && user) {
      loadProtocols();
    }
  }, [syncStatus]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowBuilder(true);
      setSearchParams({}); // Limpa a URL
    }
  }, [searchParams, setSearchParams]);

  // DND Hooks - MUST be at top level
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  async function loadProtocols() {
    if (!user) return;
    try {
      const data = await getProtocolsByUser(user.id);
      const filtered = data.filter((p: any) => !p.isArchived);
      setProtocols(filtered || []);

      // Check for active workouts
      const activeWorkouts = await db.workouts
        .where({ userId: user.id, status: 'active' })
        .toArray();
      setActiveWorkoutIds(new Set(activeWorkouts.map((aw: any) => aw.protocolId)));

    } catch (err) {
      console.error('[ProtocolsPage] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }

  const sortedProtocols = [...protocols].sort((a, b) => {
    if (a.isEnabled && !b.isEnabled) return -1;
    if (!a.isEnabled && b.isEnabled) return 1;
    // Fallback para createdAt caso updatedAt ainda não exista nos dados legados
    const timeA = a.updatedAt || a.createdAt || 0;
    const timeB = b.updatedAt || b.createdAt || 0;
    return timeB - timeA;
  });

  async function handleDeleteProtocol(protocolId: string) {
    if (!user) return;
    
    const workoutsCount = await db.workouts.where('protocolId').equals(protocolId).count();
    const message = workoutsCount > 0 
      ? 'Este protocolo possui treinos registrados. Ele será arquivado e oculto, mas seu histórico será preservado. Confirmar?'
      : 'Tem certeza que deseja excluir este protocolo? Todos os exercícios associados serão perdidos.';

    if (window.confirm(message)) {
      try {
        await deleteRemoteItem('protocols', protocolId);
        await deleteProtocol(protocolId);
        await fullSync();
        toast.success('Protocolo removido.');
      } catch (err) {
        toast.error('Erro ao excluir protocolo');
      }
    }
  }

  // Builder Logic
  function validateProtocol() {
    if (!protocolName.trim()) {
      toast.error('Dê um nome ao protocolo.');
      return false;
    }
    if (activeDays.length === 0) {
      toast.error('Selecione pelo menos um dia da semana.');
      return false;
    }
    for (const day of activeDays) {
      if (!workouts[day] || workouts[day].length === 0) {
        toast.error(`Adicione exercícios para o dia ${WEEK_DAYS.find(d => d.key === day)?.label}`);
        return false;
      }
      for (const ex of workouts[day]) {
        if (!ex.name.trim()) {
          toast.error('Todos os exercícios devem ter nome.');
          return false;
        }
      }
    }
    return true;
  }

  async function handleSave() {
    if (!validateProtocol() || !user) {
      return;
    }
    setSaving(true);
    try {
      let protocolId = editingProtocolId;
      const now = Date.now();
      
      let oldExercises: any[] = [];

      if (protocolId) {
        // Update existing protocol
        oldExercises = await db.exercises.where('protocolId').equals(protocolId).toArray();
        await db.protocols.update(protocolId, { 
          name: protocolName.trim(), 
          daysOfWeek: activeDays,
          updatedAt: now,
          isSynced: false 
        });
      } else {
        // Create new protocol
        protocolId = await createProtocol({
          name: protocolName.trim(),
          userId: user.id,
          isEnabled: false,
          daysOfWeek: activeDays,
        });
      }

      // Add/Recreate exercises (Unified for both new and edit)
      let totalExercisesCreated = 0;
      let totalExercisesUpdated = 0;
      const activeExerciseIds = new Set<string>();

      for (const day of activeDays) {
        const dayLabel = WEEK_DAYS.find(d => d.key === day)?.label;
        const dayExercises = workouts[day] || [];
        
        for (let i = 0; i < dayExercises.length; i++) {
          const ex = dayExercises[i];
          const exData: any = {
            protocolId,
            name: `${ex.name} (${dayLabel})`,
            muscleGroup: ex.muscleGroup || undefined,
            category: ex.category || 'weight',
            multiplier: ex.multiplier,
            order: i,
            dayOfWeek: day,
            sets: Number(ex.sets) || 3,
            reps: Number(ex.reps) || 10,
            lastWeight: Number(ex.baseline) || 0,
            lastReps: Number(ex.reps) || 0,
          };

          if (ex.id && oldExercises.some(old => old.id === ex.id)) {
            await updateExercise(ex.id, exData);
            activeExerciseIds.add(ex.id);
            totalExercisesUpdated++;
          } else {
            const newId = await addExercise(exData);
            activeExerciseIds.add(newId);
            totalExercisesCreated++;
          }
        }
      }

      const removedExercises = oldExercises.filter(ex => !activeExerciseIds.has(ex.id));
      for (const removedEx of removedExercises) {
         const historyCount = await db.workoutSets.where('exerciseId').equals(removedEx.id).count();
         if (historyCount === 0) {
            await deleteRemoteItem('exercises', removedEx.id);
            await db.exercises.delete(removedEx.id);
         } else {
            // Soft delete/Archive to preserve history names
            await updateExercise(removedEx.id, { isArchived: true });
         }
      }

      try {
        await fullSync();
        toast.success(editingProtocolId ? 'Protocolo atualizado!' : 'Protocolo salvo!');
        setShowBuilder(false);
        resetBuilder();
        loadProtocols();
      } catch (syncErr: any) {
        toast.error('Erro ao sincronizar com o banco de dados. Verifique sua conexão e tente novamente.');
      }
    } catch (error: any) {
      toast.error(`Erro ao salvar protocolo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProtocol(id: string) {
    const p = await db.protocols.get(id);
    if (!p) {
      return;
    }

    const allExs = await getExercisesByProtocol(id);
    
    const organizedWorkouts: Record<string, any[]> = {};
    const activeDayKeys: string[] = [];

    WEEK_DAYS.forEach(day => {
      const label = day.label;
      
      // Step 1: Filter by dayOfWeek column (Robust)
      // Step 2: Fallback to name suffix (Legacy recovery)
      const dayExs = allExs
        .filter((ex: any) => {
          if (ex.dayOfWeek === day.key) return true;
          if (!ex.dayOfWeek && ex.name.endsWith(`(${label})`)) return true;
          return false;
        })
        .map((ex: any) => ({
          id: ex.id,
          name: ex.name.replace(` (${label})`, ''),
          muscleGroup: ex.muscleGroup || '',
          category: ex.category || 'weight',
          multiplier: ex.multiplier,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          baseline: ex.lastWeight || '',
        }));
      
      if (dayExs.length > 0) {
        organizedWorkouts[day.key] = dayExs;
        activeDayKeys.push(day.key);
      }
    });

    // Step 3: Handle orphan exercises (safety net)
    const assignedIds = new Set(Object.values(organizedWorkouts).flat().map((ex: any) => ex.id));
    const orphans = allExs.filter((ex: any) => !assignedIds.has(ex.id));
    
    if (orphans.length > 0) {
      const firstDay = p.daysOfWeek?.[0] || activeDayKeys[0] || 'mon';
      const existing = organizedWorkouts[firstDay] || [];
      organizedWorkouts[firstDay] = [
        ...existing,
        ...orphans.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup || '',
          category: ex.category || 'weight',
          multiplier: ex.multiplier,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          baseline: ex.lastWeight || '',
        }))
      ];
      if (!activeDayKeys.includes(firstDay)) activeDayKeys.push(firstDay);
    }

    setProtocolName(p.name);
    setActiveDays(p.daysOfWeek || activeDayKeys);
    setWorkouts(organizedWorkouts);
    setEditingProtocolId(id);
    setShowBuilder(true);
  }

  async function handleToggleEnabled(protocolId: string) {
    if (!user) return;
    const protocol = protocols.find(p => p.id === protocolId);
    if (!protocol) return;

    const newState = !protocol.isEnabled;

    // Fix legacy protocols: if daysOfWeek is missing, try to infer it from exercises
    let currentDays = protocol.daysOfWeek || [];
    if (newState && currentDays.length === 0) {
      try {
        const exs = await getExercisesByProtocol(protocolId);
        const inferredDays: string[] = [];
        WEEK_DAYS.forEach(day => {
          if (exs.some(e => e.dayOfWeek === day.key || e.name.includes(`(${day.label})`))) {
            inferredDays.push(day.key);
          }
        });
        if (inferredDays.length > 0) {
          currentDays = inferredDays;
        }
      } catch (e) {
        // Error inferring days, proceed without it
      }
    }

    if (newState) {
      // Check for overlaps
      const otherEnabled = protocols.filter(p => p.isEnabled && p.id !== protocolId);
      const conflictDays: string[] = [];

      for (const day of currentDays) {
        let hasConflict = false;
        
        for (const p of otherEnabled) {
          let pDays = p.daysOfWeek || [];
          
          // If other enabled protocol is legacy (no daysOfWeek), infer it on the fly for validation
          if (pDays.length === 0) {
            const pExs = await getExercisesByProtocol(p.id);
            const label = WEEK_DAYS.find(d => d.key === day)?.label;
            if (label && pExs.some(e => e.name.includes(`(${label})`))) {
              hasConflict = true;
            }
          } else if (pDays.includes(day)) {
            hasConflict = true;
          }

          if (hasConflict) break;
        }

        if (hasConflict) {
          const label = WEEK_DAYS.find(d => d.key === day)?.label;
          if (label) conflictDays.push(label);
        }
      }

      if (conflictDays.length > 0) {
        toast.error(`Conflito: Já existe um protocolo ativo para (${conflictDays.join(', ')}).`);
        return;
      }
    }

    try {
      const now = Date.now();
      await db.protocols.update(protocolId, { isEnabled: newState, daysOfWeek: currentDays, updatedAt: now, isSynced: false });
      setProtocols(prev => prev.map(p => p.id === protocolId ? { ...p, isEnabled: newState, daysOfWeek: currentDays, updatedAt: now, isSynced: false } : p));
      toast.success(newState ? 'Protocolo habilitado!' : 'Protocolo desabilitado.');
      
      // Sync in background, don't block UI
      fullSync().catch(err => {
        console.error('[Sync] Erro após toggle:', err);
        toast.error('Erro ao sincronizar com nuvem. Tente novamente mais tarde.');
      });
    } catch (err) {
      console.error('[Toggle] Erro local:', err);
      toast.error('Erro ao salvar alteração no banco local.');
    }
  }

  function resetBuilder() {
    setProtocolName('');
    setActiveDays([]);
    setWorkouts({});
    setEditingProtocolId(null);
  }

  function toggleDay(day: string) {
    setActiveDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];
      
      return next.sort((a, b) => {
        const idxA = WEEK_DAYS.findIndex(d => d.key === a);
        const idxB = WEEK_DAYS.findIndex(d => d.key === b);
        return idxA - idxB;
      });
    });
  }

  function handleAddExercise(day: string) {
    setWorkouts((prev) => ({
      ...prev,
      [day]: [
        ...(prev[day] || []),
        { name: '', muscleGroup: '', category: 'weight', sets: 3, reps: 10, baseline: '', id: crypto.randomUUID() },
      ],
    }));
  }

  async function handleExerciseChange(day: string, idx: number, field: string, value: any) {
    if (field === 'delete') {
      setWorkouts((prev) => ({
        ...prev,
        [day]: prev[day].filter((_, i) => i !== idx),
      }));
    } else {
      setWorkouts((prev) => {
        const updatedDay = prev[day].map((ex, i) => {
          if (i === idx) {
            const newEx = { ...ex, [field]: value };
            // Se o usuário digitou um nome e perdeu o foco ou está associando, podemos tentar auto-preencher
            // Mas faremos direto sempre que 'name' mudar pra ser dinâmico
            if (field === 'name' && value.length > 2) {
              const info = getExerciseInfo(value);
              // Atribuir grupo muscular se o atual estiver vazio ou for "Outros"
              if (info.muscleGroup !== 'Outros' && (!newEx.muscleGroup || newEx.muscleGroup === 'Outros' || newEx.muscleGroup === '')) {
                newEx.muscleGroup = info.muscleGroup;
              }
              // Atribuir categoria se for diferente do padrão (weight) e o exercício for recém criado
              if (info.category !== 'weight' && newEx.category === 'weight') {
                newEx.category = info.category;
                newEx.multiplier = info.multiplier;
              }
            }
            return newEx;
          }
          return ex;
        });
        // Atualiza no banco se já existir (tem id e não é novo)
        const ex = updatedDay[idx];
        if (ex && ex.id && typeof ex.id === 'string' && ex.id.length > 10) {
          // Só tenta atualizar se já foi salvo no banco (id UUID)
          let updateObj: any = { [field]: value };
          
          // Se alterar reps, atualiza também lastReps
          if (field === 'reps') {
            updateObj.lastReps = Number(value) || 0;
          }
          
          // Se alterar baseline, traduz para lastWeight e REMOVE baseline do upload
          if (field === 'baseline') {
            updateObj = { lastWeight: Number(value) || 0 };
          }

          updateExercise(ex.id, updateObj)
            .then(() => syncData().catch(() => {}))
            .catch(() => {});
        }
        return {
          ...prev,
          [day]: updatedDay,
        };
      });
    }
  }


  if (showBuilder) {
    return (
      <Layout>
        <div className="space-y-12 pb-32">
          <PageHeader 
            title="Montador" 
            description="Construção de Protocolo"
            action={
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowBuilder(false); resetBuilder(); }}>
                   Cancelar
                </Button>
                <Button onClick={handleSave} className="px-6" disabled={saving}>
                  {saving ? '...' : 'Finalizar'}
                </Button>
              </div>
            }
          />

          <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
            <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
              <CardContent className="p-5 md:p-8 space-y-8">
                <div className="space-y-2">
                  <label className="text-[clamp(9px,1vw,11px)] font-black text-muted-foreground uppercase tracking-wider ml-1 opacity-80">IDENTIFICAÇÃO</label>
                  <Input
                    placeholder="NOME DO PROTOCOLO"
                    className="text-lg md:text-xl font-black bg-muted/20 border-border/50 focus-visible:ring-primary uppercase tracking-tight py-6 px-5 rounded-xl placeholder:opacity-40"
                    value={protocolName}
                    onChange={(e) => setProtocolName(e.target.value)}
                    maxLength={60}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[clamp(9px,1vw,11px)] font-black text-muted-foreground uppercase tracking-wider ml-1 opacity-80">FREQUÊNCIA SEMANAL</label>
                  <div className="flex gap-2.5 justify-center sm:justify-start flex-wrap">
                    {WEEK_DAYS.map((d) => (
                      <Button
                        key={d.key}
                        type="button"
                        variant={activeDays.includes(d.key) ? 'default' : 'outline'}
                        className="size-10 md:size-11"
                        onClick={() => toggleDay(d.key)}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragOver={({ active, over }: DragOverEvent) => {
              const overId = over?.id;
              if (!overId || active.id === overId) return;

              const findContainer = (id: any) => {
                if (workouts[id]) return id;
                return activeDays.find((day) => 
                  workouts[day]?.some((ex) => ex.id === id)
                );
              };

              const activeContainer = findContainer(active.id);
              const overContainer = findContainer(overId);

              if (!activeContainer || !overContainer || activeContainer === overContainer) {
                return;
              }

              setWorkouts((prev) => {
                const activeItems = prev[activeContainer];
                const overItems = prev[overContainer] || [];
                const activeIndex = activeItems.findIndex((ex) => ex.id === active.id);
                const overIndex = overItems.findIndex((ex) => ex.id === overId);

                let newIndex;
                if (workouts[overId]) {
                  newIndex = overItems.length;
                } else {
                  newIndex = overIndex >= 0 ? overIndex : overItems.length;
                }

                return {
                  ...prev,
                  [activeContainer]: activeItems.filter((ex) => ex.id !== active.id),
                  [overContainer]: [
                    ...overItems.slice(0, newIndex),
                    activeItems[activeIndex],
                    ...overItems.slice(newIndex)
                  ]
                };
              });
            }}
            onDragEnd={({ active, over }) => {
              if (!over) return;
              
              const findContainer = (id: any) => {
                if (workouts[id]) return id;
                return activeDays.find((day) => 
                  workouts[day]?.some((ex) => ex.id === id)
                );
              };

              const activeContainer = findContainer(active.id);
              const overContainer = findContainer(over.id);

              if (!activeContainer || !overContainer) return;

              if (activeContainer === overContainer) {
                const oldIndex = workouts[activeContainer].findIndex((ex) => ex.id === active.id);
                const newIndex = workouts[activeContainer].findIndex((ex) => ex.id === over.id);

                if (oldIndex !== newIndex) {
                  setWorkouts((prev) => ({
                    ...prev,
                    [activeContainer]: arrayMove(prev[activeContainer], oldIndex, newIndex),
                  }));
                }
              }
            }}
          >
            <div className="space-y-6">
              {activeDays.length === 0 && (
                <div className="py-20 text-center border border-dashed border-border/40 rounded-2xl opacity-60 bg-muted/5">
                  <p className="text-[clamp(10px,1.4vw,13px)] font-black uppercase tracking-wider">Selecione dias acima</p>
                </div>
              )}
              {activeDays.map((day) => (
                <Card key={day} className="bg-card border-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75 fill-mode-both">
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="font-black text-primary text-[clamp(10px,1.2vw,12px)] uppercase">{WEEK_DAYS.find((d) => d.key === day)?.label}</span>
                        </div>
                        <span className="font-black text-foreground text-[clamp(10px,1.2vw,12px)] uppercase tracking-wider opacity-80">Sessão</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="outline" className="border-primary/20 text-primary" onClick={() => handleAddExercise(day)}><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <SortableContext items={(workouts[day] || []).map((ex) => ex.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-3">
                        {(workouts[day] || []).map((ex, idx) => (
                          <DraggableExercise 
                            key={ex.id} 
                            ex={ex} 
                            idx={idx} 
                            day={day} 
                            onUpdate={handleExerciseChange}
                          />
                        ))}
                        {(workouts[day] || []).length === 0 && (
                          <div className="py-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/40">
                             <p className="text-[clamp(9px,1vw,11px)] font-mono text-muted-foreground/90 uppercase tracking-wider">Lista vazia</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DndContext>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-12 pb-32">
        <PageHeader 
          title="Treinos" 
          description="Gestão de Protocolos e Planilhas"
          action={
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowBuilder(true)}
                size="sm"
                className="px-5"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo
              </Button>
            </div>
          }
        />

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
          <div className="px-1 flex items-center justify-between group">
             <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
               <Zap className="w-3.5 h-3.5 text-primary" />
               Vinculados
             </h3>
              <span className="text-[clamp(9px,1vw,11px)] font-mono text-muted-foreground opacity-80 uppercase tracking-wider">Total: {protocols.length}</span>
          </div>

        {loading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3 bg-card/10 rounded-2xl border border-border/50">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-mono text-[clamp(9px,1vw,11px)] uppercase tracking-wider opacity-80">Sincronizando...</p>
          </div>
        ) : protocols.length === 0 ? (
          <div className="text-center py-24 bg-card/10 rounded-2xl border border-dashed border-border/60 flex flex-col items-center gap-5">
            <div className="bg-muted/50 p-4 rounded-2xl">
              <ClipboardList className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
               <h3 className="text-muted-foreground font-black text-[clamp(10px,1.4vw,13px)] uppercase tracking-tight">Nenhum protocolo</h3>
              <p className="text-muted-foreground/70 text-[clamp(9px,1vw,11px)] uppercase tracking-wider font-mono">Adicione um plano para começar.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {sortedProtocols.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    opacity: { duration: 0.2 }
                  }}
                >
                  <Card 
                    className="bg-card border-border hover:border-primary/20 transition-all group overflow-hidden rounded-2xl shadow-sm hover:scale-[1.01] active:scale-[0.99] h-full"
                  >
                    <CardContent className="p-0 flex flex-col divide-y divide-border/20">
                      <div className="flex items-center gap-3 p-4 md:p-5 min-w-0">
                      <div className={`w-10 h-10 md:w-11 md:h-11 border flex items-center justify-center rounded-xl transition-all ${p.isEnabled ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'bg-muted/20 border-border/40'}`}>
                        <Dumbbell className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${p.isEnabled ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-black text-sm md:text-base uppercase tracking-tight truncate transition-colors leading-tight ${p.isEnabled ? 'text-foreground group-hover:text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>{p.name}</h4>
                          <div className="flex items-center gap-2">
                             <Switch 
                                checked={p.isEnabled}
                                onCheckedChange={() => handleToggleEnabled(p.id)}
                                className="scale-75 origin-right"
                             />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1 h-1 rounded-full ${p.isEnabled ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                          <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground font-mono tracking-widest uppercase opacity-80">
                            {p.isEnabled ? 'Habilitado' : 'Desativado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex bg-muted/5 p-2 gap-2 justify-between items-center px-4">
                      <div className="flex gap-1">
                         <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="text-muted-foreground hover:text-foreground hover:bg-background"
                          onClick={() => handleEditProtocol(p.id)}
                        >
                          <ListTodo className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          onClick={() => handleDeleteProtocol(p.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:bg-primary/10"
                        onClick={() => navigate(`/workout/${p.id}`)}
                      >
                        {activeWorkoutIds.has(p.id) ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin-slow" />
                            Continuar
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            Iniciar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
        </section>
      </div>
    </Layout>
  );
}
