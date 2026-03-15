import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { getWorkoutHistory, db, getWorkoutSets, deleteWorkout } from '../services/workoutDB';
import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, Clock, Zap, ChevronRight, Activity, ChevronDown, Dumbbell, Trash2 } from "lucide-react"
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';

export default function HistoryPage() {
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
      setHistory(histories);
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
        // Group sets by exercise
        const grouped: Record<string, any[]> = {};
        sets.forEach(s => {
          if (!grouped[s.exerciseId]) grouped[s.exerciseId] = [];
          grouped[s.exerciseId].push(s);
        });
        setSessionDetails(prev => ({ ...prev, [workoutId]: Object.entries(grouped) }));
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
      await deleteWorkout(workoutId);
      setHistory(prev => prev.filter(w => w.id !== workoutId));
      toast.success('Treino removido com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir treino.');
    }
  }

  return (
    <Layout>
      <div className="space-y-12 pb-32">
        <PageHeader 
          title="Histórico" 
          description="Histórico de Atividade" 
        />

        <section className="space-y-4">
          <header className="px-1 flex items-center justify-between group">
             <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-tight flex items-center gap-2 group-hover:text-foreground transition-colors">
                 <Clock className="w-3.5 h-3.5 text-primary" />
                Sessões Realizadas
              </h3>
              <span className="text-[clamp(9px,1vw,11px)] font-mono text-muted-foreground uppercase tracking-wider leading-none">Total: {history.length}</span>
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
            {history.map((workout) => (
              <Card 
                key={workout.id} 
                className={`bg-card border transition-all cursor-pointer group overflow-hidden rounded-2xl shadow-sm hover:shadow-md ${
                  expandedId === workout.id ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-border hover:border-primary/60 shadow-sm'
                }`}
                onClick={() => toggleExpand(workout.id)}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                      <div className="w-11 h-11 border border-border/60 flex flex-col items-center justify-center bg-muted/20 group-hover:bg-primary/5 transition-all rounded-xl flex-shrink-0">
                        <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-none tabular-nums">{new Date(workout.date).getDate()}</span>
                        <span className="text-[clamp(8px,1vw,10px)] text-muted-foreground uppercase font-black opacity-90 mt-0.5 leading-none">{new Date(workout.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
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
                              <div key={s.id} className="bg-muted/30 px-2 py-0.5 rounded-md border border-border/20 flex items-center gap-1.5">
                                <span className="text-[9px] font-mono text-muted-foreground">S{si + 1}</span>
                                <span className="text-[10px] font-black tabular-nums">{s.weight}kg x {s.reps}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </section>
      </div>
    </Layout>
  );
}
