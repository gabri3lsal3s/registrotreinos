// ...existing code...
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { getWorkoutHistory, db, getWorkoutSets, deleteWorkout, deleteWorkoutSet, updateWorkoutSet, updateExercise, getBodyWeightsByUser, updateBodyWeight, deleteBodyWeight } from '../services/workoutDB';
import { fullSync, deleteRemoteItem } from '../services/syncService';
import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, Clock, Zap, ChevronRight, Activity, ChevronDown, Dumbbell, Trash2, Scale } from "lucide-react"
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';

export default function HistoryPage() {
    const [editingDateId, setEditingDateId] = useState<string | null>(null);
    const [editingDateValue, setEditingDateValue] = useState<string>('');
    const [editingTimeValue, setEditingTimeValue] = useState<string>('');
    const [editingSetId, setEditingSetId] = useState<string | null>(null);
    const [editingSetWeight, setEditingSetWeight] = useState<string>('');
    const [editingSetReps, setEditingSetReps] = useState<string>('');
    const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
    const [editingWeightValue, setEditingWeightValue] = useState<string>('');
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [protocolsMap, setProtocolsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Record<string, any[]>>({});
  const [exercisesMap, setExercisesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;
    try {
      const histories = await getWorkoutHistory(user.id);
      const weights = await getBodyWeightsByUser(user.id);
      
      const mixed = [
        ...histories.map(h => ({ ...h, type: 'workout' as const })),
        ...weights.map(w => ({ ...w, type: 'weight' as const }))
      ].sort((a, b) => b.date - a.date);

      const protocols = await db.protocols.where('userId').equals(user.id).toArray();
      const pMap: Record<string, string> = {};
      protocols.forEach(p => {
        pMap[p.id] = p.name;
      });

      const exercises = await db.exercises.toArray();
      const exMap: Record<string, any> = {};
      exercises.forEach(ex => {
        exMap[ex.id] = ex;
      });
      
      setProtocolsMap(pMap);
      setExercisesMap(exMap);
      setHistory(mixed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(workoutId: string) {
    if (expandedId === workoutId) {
      setExpandedId(null);
      return;
    }

    if (!sessionDetails[workoutId]) {
      try {
        const sets = await getWorkoutSets(workoutId);
        // Sort all sets by timestamp to ensure performance order
        sets.sort((a, b) => a.timestamp - b.timestamp);

        const orderedExIds: string[] = [];
        const grouped: Record<string, any[]> = {};
        
        sets.forEach(s => {
          if (!grouped[s.exerciseId]) {
            grouped[s.exerciseId] = [];
            orderedExIds.push(s.exerciseId);
          }
          grouped[s.exerciseId].push(s);
        });

        const sortedGrouped = orderedExIds.map(id => [id, grouped[id]]);
        setSessionDetails(prev => ({ ...prev, [workoutId]: sortedGrouped }));
      } catch (err) {
        console.error(err);
      }
    }
    setExpandedId(workoutId);
  }

  async function handleDeleteWorkout(e: React.MouseEvent, workoutId: string) {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir este treino permanentemente?')) return;
    
    try {
      await deleteRemoteItem('workouts', workoutId);
      await deleteWorkout(workoutId);
      await fullSync();
      setHistory(prev => prev.filter(w => w.id !== workoutId));
      toast.success('Treino removido com sucesso.');
      // Dispara evento global para atualizar análise
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir treino.');
    }
  }

  // Edição discreta da data
  async function handleDateClick(e: React.MouseEvent, workout: any) {
    e.stopPropagation();
    setEditingDateId(workout.id);
    // Preenche valor inicial no formato yyyy-MM-dd e HH:mm
    const d = new Date(workout.date);
    setEditingDateValue(d.toISOString().slice(0, 10));
    setEditingTimeValue(d.toTimeString().slice(0,5));
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditingDateValue(e.target.value);
  }

  async function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditingTimeValue(e.target.value);
  }

  async function handleDateBlurOrSave(workout: any) {
    if (!editingDateValue || !editingTimeValue) {
      setEditingDateId(null);
      return;
    }
    try {
      // Nova data e hora
      const [year, month, day] = editingDateValue.split('-').map(Number);
      const [hour, minute] = editingTimeValue.split(':').map(Number);
      const newDate = new Date(workout.date);
      newDate.setFullYear(year, month - 1, day);
      newDate.setHours(hour, minute, 0, 0);
      const newTimestamp = newDate.getTime();
      await db.workouts.update(workout.id, { date: newTimestamp, isSynced: false });
      // Sincroniza com Supabase (bidirecional)
      await fullSync();
      setHistory(h => h.map(w => w.id === workout.id ? { ...w, date: newTimestamp } : w));
      setEditingDateId(null);
      toast.success('Data e horário do treino atualizados!');
      // Dispara evento global para atualizar análise
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err: any) {
      toast.error('Erro ao atualizar data/horário: ' + (err.message || err));
      setEditingDateId(null);
    }
  }

  async function handleBWDateBlurOrSave(item: any) {
    if (!editingDateValue || !editingTimeValue) {
      setEditingDateId(null);
      return;
    }
    try {
      const [year, month, day] = editingDateValue.split('-').map(Number);
      const [hour, minute] = editingTimeValue.split(':').map(Number);
      const newDate = new Date(item.date);
      newDate.setFullYear(year, month - 1, day);
      newDate.setHours(hour, minute, 0, 0);
      const newTimestamp = newDate.getTime();
      await updateBodyWeight(item.id, { date: newTimestamp });
      await fullSync();
      setHistory(h => h.map(w => w.id === item.id ? { ...w, date: newTimestamp } : w).sort((a, b) => b.date - a.date));
      setEditingDateId(null);
      toast.success('Data da pesagem atualizada!');
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err: any) {
      toast.error('Erro ao atualizar data: ' + (err.message || err));
      setEditingDateId(null);
    }
  }

  async function handleBWEditSave(item: any) {
    if (!editingWeightValue) {
      setEditingWeightId(null);
      return;
    }
    const val = parseFloat(editingWeightValue);
    if (isNaN(val) || val <= 0) return;
    try {
      await updateBodyWeight(item.id, { weight: val });
      await fullSync();
      setHistory(h => h.map(w => w.id === item.id ? { ...w, weight: val } : w));
      setEditingWeightId(null);
      toast.success('Peso atualizado com sucesso!');
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err: any) {
      toast.error('Erro ao editar peso: ' + (err.message || err));
    }
  }

  async function handleBWDelete(e: React.MouseEvent, item: any) {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir este registro de peso?')) return;
    try {
      await deleteRemoteItem('body_weights', item.id);
      await deleteBodyWeight(item.id);
      await fullSync();
      setHistory(prev => prev.filter(w => w.id !== item.id));
      toast.success('Registro de peso removido.');
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err) {
       console.error(err);
       toast.error('Erro ao excluir registro de peso.');
    }
  }

  async function handleSetEditClick(e: React.MouseEvent, set: any) {
    e.stopPropagation();
    setEditingSetId(set.id);
    setEditingSetWeight(String(set.weight));
    setEditingSetReps(String(set.reps));
  }

  async function handleSetEditSave(set: any) {
    if (!editingSetId || !editingSetWeight || !editingSetReps) {
      setEditingSetId(null);
      return;
    }
    // Edição otimista: atualiza UI imediatamente
    setSessionDetails(prev => {
      const newDetails = { ...prev };
      for (const [exId, sets] of Object.entries(newDetails)) {
        newDetails[exId] = sets.map(([exerciseId, arr]) => [exerciseId, arr.map((s: any) => s.id === set.id ? { ...s, weight: editingSetWeight, reps: editingSetReps } : s)]);
      }
      return newDetails;
    });
    setEditingSetId(null);
    try {
      await updateWorkoutSet(set.id, { weight: Number(editingSetWeight), reps: Number(editingSetReps) });
      
      // Update PR in exercise if hit
      const exercise = await db.exercises.get(set.exerciseId);
      if (exercise) {
        const weight = Number(editingSetWeight);
        const reps = Number(editingSetReps);
        const currentMaxWeight = Number(exercise.lastWeight || 0);
        const currentMaxReps = Number(exercise.lastReps || 0);

        if (weight > currentMaxWeight || (weight === currentMaxWeight && reps > currentMaxReps)) {
          await updateExercise(exercise.id, { 
            lastWeight: weight, 
            lastReps: reps 
          });
        }
      }

      await fullSync();
      toast.success('Set atualizado com sucesso.');
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err: any) {
      toast.error('Erro ao atualizar set: ' + (err.message || err));
    }
  }

  async function handleSetDelete(set: any) {
    if (!window.confirm('Deseja excluir este exercício da sessão?')) return;
    // Edição otimista: remove da UI imediatamente
    setSessionDetails(prev => {
      const newDetails = { ...prev };
      for (const [workoutId, exArr] of Object.entries(newDetails)) {
        newDetails[workoutId] = exArr.map(([exId, sets]: [string, any[]]) => [exId, sets.filter((s: any) => s.id !== set.id)]);
      }
      return newDetails;
    });
    setEditingSetId(null);
    try {
      await deleteRemoteItem('workout_sets', set.id);
      await deleteWorkoutSet(set.id);
      await fullSync();
      toast.success('Exercício removido!');
      window.dispatchEvent(new Event('refresh-analysis'));
      if (expandedId) toggleExpand(expandedId);
    } catch (err: any) {
      toast.error('Erro ao remover exercício: ' + (err.message || err));
    }
  }

  return (
    <Layout>
      <div className="space-y-12 pb-32">
        <PageHeader 
          title="Histórico" 
          description="Histórico de Atividade" 
        />

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
          <header className="px-1 flex items-center justify-between group">
             <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-tight flex items-center gap-2 group-hover:text-foreground transition-colors">
                 <Clock className="w-3.5 h-3.5 text-primary" />
                Sessões Realizadas
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[clamp(9px,1vw,11px)] font-mono text-muted-foreground uppercase tracking-wider leading-none">Total: {history.length}</span>
              </div>
          </header>
        
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3 bg-card/10 rounded-2xl border border-border">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-mono text-[clamp(9px,1vw,11px)] uppercase tracking-wider opacity-80">Sincronizando...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-24 bg-card/10 rounded-2xl border border-dashed border-border/60 flex flex-col items-center gap-5">
            <div className="bg-muted p-4 rounded-xl">
               <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
               <h3 className="text-muted-foreground font-black text-[clamp(10px,1.2vw,13px)] uppercase tracking-tight">Nada por aqui</h3>
                <p className="text-muted-foreground/80 text-[clamp(9px,1vw,11px)] uppercase tracking-wider font-mono">Treinos aparecerão aqui após finalizados.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item, index) => {
              if (item.type === 'weight') {
                return (
                  <Card 
                    key={`bw-${item.id}`} 
                    className={`bg-card border transition-all cursor-pointer group overflow-hidden rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] duration-300 ${
                      expandedId === item.id ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-border hover:border-primary/60 shadow-sm'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <CardContent className="p-0">
                      <div className="p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                          <div className="w-11 h-11 border border-border/60 flex flex-col items-center justify-center bg-muted/20 group-hover:bg-primary/5 transition-all rounded-xl flex-shrink-0">
                            {editingDateId === item.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'absolute', left: 0, top: 0, zIndex: 10, minWidth: 44, minHeight: 44, background: 'rgba(255,255,255,0.95)', borderRadius: 8, boxShadow: '0 2px 8px 0 #0001' }}>
                                <input
                                  type="date"
                                  className="rounded-lg border border-primary/40 bg-background text-foreground text-center text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40 transition-all mb-0.5"
                                  style={{ width: 80, marginBottom: 2 }}
                                  value={editingDateValue}
                                  onChange={handleDateChange}
                                  autoFocus
                                  onClick={e => e.stopPropagation()}
                                />
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="time"
                                    className="rounded-lg border border-primary/40 bg-background text-foreground text-center text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    style={{ width: 70 }}
                                    value={editingTimeValue}
                                    onChange={handleTimeChange}
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <button
                                    className="ml-1 text-muted-foreground/40 hover:text-primary transition-colors text-xs border border-primary/30 rounded px-1 py-0.5"
                                    title="Concluir edição"
                                    onClick={e => { e.stopPropagation(); handleBWDateBlurOrSave(item); }}
                                    style={{ background: 'none', cursor: 'pointer' }}
                                  >
                                    ✔
                                  </button>
                                </div>
                              </div>
                            ) : null}
                            <span
                              className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-none tabular-nums"
                              onClick={e => handleDateClick(e, item)}
                              style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                            >
                              {new Date(item.date).getDate()}
                            </span>
                            <span
                              className="text-[clamp(8px,1vw,10px)] text-muted-foreground uppercase font-black opacity-90 mt-0.5 leading-none"
                              onClick={e => handleDateClick(e, item)}
                              style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                            >
                              {new Date(item.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1 pl-[2px]">
                               <Scale className="w-3 h-3 text-primary" />
                              <h4 className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                                Registro de Peso
                              </h4>
                            </div>
                            <div className="flex items-center gap-3 opacity-90">
                              <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground font-mono uppercase tracking-wider">
                                {item.weight} kg
                              </span>
                              <div className="w-1 h-1 rounded-full bg-border" />
                              <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground font-mono uppercase tracking-wider">
                                 {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleBWDelete(e, item)}
                             className="p-2 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedId === item.id ? (
                            <ChevronDown className="w-4 h-4 text-primary transition-all flex-shrink-0" />
                          ) : (
                             <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      {expandedId === item.id && (
                        <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="h-px bg-border/40 w-full" />
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Scale className="w-3 h-3 text-primary/60" />
                              <span className="text-[10px] font-black uppercase text-foreground/80 tracking-wider">
                                Peso Corporal Gravado
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-5">
                              <div
                                className="bg-muted/30 px-2 py-0.5 rounded-md border border-border/20 flex items-center gap-1.5 group relative"
                                onClick={e => e.stopPropagation()}
                              >
                                <span className="text-[9px] font-mono text-muted-foreground">VALOR</span>
                                {editingWeightId === item.id ? (
                                  <>
                                    <div className="relative inline-block w-16 mr-1">
                                      <input
                                        type="number"
                                        step="0.1"
                                        className="w-full rounded border border-primary/40 text-xs font-mono text-center bg-background text-foreground pr-4"
                                        value={editingWeightValue}
                                        onChange={e => setEditingWeightValue(e.target.value)}
                                        autoFocus
                                      />
                                      {editingWeightValue && (
                                        <span className="absolute right-1 top-1/2 -translate-y-1/2 font-black text-[9px] pointer-events-none text-muted-foreground">
                                          kg
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      className="ml-1 text-muted-foreground/40 hover:text-primary transition-colors text-xs border border-primary/30 rounded px-1 py-0.5"
                                      title="Concluir edição"
                                      onClick={e => { e.stopPropagation(); handleBWEditSave(item); }}
                                      style={{ background: 'none', cursor: 'pointer' }}
                                    >
                                      ✔
                                    </button>
                                  </>
                                ) : (
                                  <span
                                    className="text-[10px] font-black tabular-nums cursor-pointer hover:text-primary transition-colors"
                                    title="Clique para editar"
                                    onClick={e => { e.stopPropagation(); setEditingWeightId(item.id); setEditingWeightValue(String(item.weight)); }}
                                  >
                                    {item.weight}kg
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              }

              // Rendering Workout
              const workout = item;
              return (
              <Card 
                key={`wo-${workout.id}`} 
                className={`bg-card border transition-all cursor-pointer group overflow-hidden rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] duration-300 ${
                  expandedId === workout.id ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-border hover:border-primary/60 shadow-sm'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => toggleExpand(workout.id)}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                      <div className="w-11 h-11 border border-border/60 flex flex-col items-center justify-center bg-muted/20 group-hover:bg-primary/5 transition-all rounded-xl flex-shrink-0">
                        {editingDateId === workout.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'absolute', left: 0, top: 0, zIndex: 10, minWidth: 44, minHeight: 44, background: 'rgba(255,255,255,0.95)', borderRadius: 8, boxShadow: '0 2px 8px 0 #0001' }}>
                            <input
                              type="date"
                              className="rounded-lg border border-primary/40 bg-background text-foreground text-center text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40 transition-all mb-0.5"
                              style={{ width: 80, marginBottom: 2 }}
                              value={editingDateValue}
                              onChange={handleDateChange}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <input
                                type="time"
                                className="rounded-lg border border-primary/40 bg-background text-foreground text-center text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                style={{ width: 70 }}
                                value={editingTimeValue}
                                onChange={handleTimeChange}
                                onClick={e => e.stopPropagation()}
                              />
                              <button
                                className="ml-1 text-muted-foreground/40 hover:text-primary transition-colors text-xs border border-primary/30 rounded px-1 py-0.5"
                                title="Concluir edição"
                                onClick={e => { e.stopPropagation(); handleDateBlurOrSave(workout); }}
                                style={{ background: 'none', cursor: 'pointer' }}
                              >
                                ✔
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <span
                          className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-none tabular-nums"
                          onClick={e => handleDateClick(e, workout)}
                          style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                          title="Clique para editar a data"
                        >
                          {new Date(workout.date).getDate()}
                        </span>
                        <span
                          className="text-[clamp(8px,1vw,10px)] text-muted-foreground uppercase font-black opacity-90 mt-0.5 leading-none"
                          onClick={e => handleDateClick(e, workout)}
                          style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                          title="Clique para editar a data"
                        >
                          {new Date(workout.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <Activity className="w-3 h-3 text-primary" />
                          <h4 className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                            {protocolsMap[workout.protocolId] || 'Protocolo Removido'}
                          </h4>
                        </div>
                         <div className="flex items-center gap-3 opacity-90">
                          <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                             <Zap className="w-3 h-3 text-primary" /> Sessão
                          </span>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground font-mono uppercase tracking-wider">
                             {new Date(workout.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDeleteWorkout(e, workout.id)}
                         className="p-2 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedId === workout.id ? (
                        <ChevronDown className="w-4 h-4 text-primary transition-all flex-shrink-0" />
                      ) : (
                         <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {expandedId === workout.id && sessionDetails[workout.id] && (
                    <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-border/40 w-full" />
                      {sessionDetails[workout.id].map(([exId, sets]: [string, any[]]) => (
                        <div key={exId} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-3 h-3 text-primary/60" />
                            <span className="text-[10px] font-black uppercase text-foreground/80 tracking-wider">
                              {exercisesMap[exId]?.name?.split(' (')[0] || 'Exercício Removido'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {sets.map((s, si) => (
                              <div
                                key={s.id}
                                className="bg-muted/30 px-2 py-0.5 rounded-md border border-border/20 flex items-center gap-1.5 group relative"
                                onClick={e => {
                                  // Evita propagação para não fechar o card ao clicar em editar/excluir/concluir
                                  e.stopPropagation();
                                }}
                              >
                                <span className="text-[9px] font-mono text-muted-foreground">S{si + 1}</span>
                                {editingSetId === s.id ? (
                                  <>
                                    <input
                                      type="number"
                                      className="w-12 rounded border border-primary/40 text-xs font-mono text-center mr-1"
                                      value={editingSetWeight}
                                      onChange={e => setEditingSetWeight(e.target.value)}
                                      style={{ width: 45 }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <span className="font-black text-xs">kg</span>
                                    <input
                                      type="number"
                                      className="w-10 rounded border border-primary/40 text-xs font-mono text-center mx-1"
                                      value={editingSetReps}
                                      onChange={e => setEditingSetReps(e.target.value)}
                                      style={{ width: 35 }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <span className="font-black text-xs">{exercisesMap[exId]?.category === 'time' ? 's' : 'reps'}</span>
                                    <button
                                      className="ml-1 text-muted-foreground/40 hover:text-destructive transition-colors text-xs"
                                      title="Excluir exercício"
                                      onClick={e => { e.stopPropagation(); handleSetDelete(s); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="ml-1 text-muted-foreground/40 hover:text-primary transition-colors text-xs border border-primary/30 rounded px-1 py-0.5"
                                      title="Concluir edição"
                                      onClick={e => { e.stopPropagation(); handleSetEditSave(s); }}
                                      style={{ background: 'none', cursor: 'pointer' }}
                                    >
                                      ✔
                                    </button>
                                  </>
                                ) : (
                                  <span
                                    className="text-[10px] font-black tabular-nums cursor-pointer hover:text-primary transition-colors"
                                    title="Clique para editar"
                                    onClick={e => { e.stopPropagation(); handleSetEditClick(e, s); }}
                                  >
                                    {s.weight > 0 ? `${s.weight}kg x ` : ''}{s.reps}{exercisesMap[exId]?.category === 'time' ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
        </section>
      </div>
    </Layout>
  );
}
