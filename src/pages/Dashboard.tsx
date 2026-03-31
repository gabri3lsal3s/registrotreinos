import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { db, getExercisesByProtocol, addBodyWeight, getBodyWeightsByUser } from '../services/workoutDB';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Dumbbell, ArrowRight, Calendar, TrendingUp, Zap, RefreshCw, Scale, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const WEEK_DAYS = [
  { key: 'sun', label: 'Dom' },
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
];

import { PageHeader } from '../components/PageHeader';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [stats, setStats] = useState({ 
    weeklyWorkouts: 0, 
    monthlyWorkouts: 0,
    weeklyGoal: 5,
    monthlyGoal: 20
  });
  const [loading, setLoading] = useState(true);
  const [currentWeight, setCurrentWeight] = useState<string>('');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      try {
        const now = new Date();

        const today = now.getDay(); // 0-6
        
        // 1. Get Today's Workout
          const allProtocols = (await db.protocols
            .where('userId')
            .equals(user.id)
            .toArray()).filter(p => !p.isArchived);

        const enabledProtocols = allProtocols.filter(p => p.isEnabled);

        const dayKey = WEEK_DAYS[today].key;
        const dayLabel = WEEK_DAYS[today].label;

        // Find protocol scheduled for today (or fallback to checking exercises if daysOfWeek is missing)
        let activeProtocol = null;
        for (const p of enabledProtocols) {
          const isScheduled = (p.daysOfWeek || []).includes(dayKey);
          
          if (isScheduled) {
            activeProtocol = p;
            break;
          }

          // Fallback: If daysOfWeek is missing, check exercises if any match today's label
          if (!p.daysOfWeek || p.daysOfWeek.length === 0) {
            const exercises = await getExercisesByProtocol(p.id);
            const hasToday = exercises.some(ex => ex.name.includes(`(${dayLabel})`));
            if (hasToday) {
              activeProtocol = p;
              break;
            }
          }
        }

        if (activeProtocol) {
          const exercises = await getExercisesByProtocol(activeProtocol.id);
          const filtered = exercises.filter(ex => ex.name.includes(`(${dayLabel})`));
          
          if (filtered.length > 0) {
            setTodayWorkout({
              protocolName: activeProtocol.name,
              protocolId: activeProtocol.id,
              exercises: filtered
            });
          } else {
            setTodayWorkout(null);
          }
        } else {
          setTodayWorkout(null);
        }

        // 2. Check for Active Workout
        const active = await db.workouts
          .where({ userId: user.id, status: 'active' })
          .first();
        
        if (active) {
          const protocol = await db.protocols.get(active.protocolId);
          const sets = await db.workoutSets.where('workoutId').equals(active.id).toArray();
          setActiveWorkout({
            ...active,
            protocolName: protocol?.name || 'Protocolo Desconhecido',
            completedSets: sets.length
          });
        } else {
          setActiveWorkout(null);
        }

        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start of week
        const startOfWeekTs = startOfWeek.getTime();

        // Primeiro dia do mês atual
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const allWorkouts = await db.workouts
          .where('userId').equals(user.id)
          .and(w => w.status === 'completed')
          .toArray();

        const weeklyWorkouts = allWorkouts.filter(w => w.date >= startOfWeekTs).length;
        const monthlyWorkouts = allWorkouts.filter(w => w.date >= firstDayOfMonth).length;

        // 4. Calculate Dynamic Goals from Active Protocols
        const activeProtocols = allProtocols.filter(p => !p.isArchived && p.isEnabled);
        const weeklyGoal = activeProtocols.reduce((sum, p) => sum + (p.daysOfWeek?.length || 0), 0);

        // Monthly Goal: Count occurrences of scheduled days in current month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let monthlyGoal = 0;
        
        activeProtocols.forEach(p => {
          const pDays = p.daysOfWeek || [];
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(now.getFullYear(), now.getMonth(), d);
            const dayKey = WEEK_DAYS[date.getDay()].key;
            if (pDays.includes(dayKey)) {
              monthlyGoal++;
            }
          }
        });

        setStats({
          weeklyWorkouts,
          monthlyWorkouts,
          weeklyGoal: Math.max(1, weeklyGoal),
          monthlyGoal: Math.max(1, monthlyGoal)
        });

        // 4. Get Latest Body Weight
        const bwHistory = await getBodyWeightsByUser(user.id);
        if (bwHistory.length > 0) {
          const w = bwHistory[bwHistory.length - 1].weight;
          setLatestWeight(w);
          setCurrentWeight(w.toString());
        }

      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const handleSaveWeight = async () => {
    if (!user || !currentWeight) return;
    try {
      setSavingWeight(true);
      const val = parseFloat(currentWeight);
      if (isNaN(val) || val <= 0) return;
      
      await addBodyWeight({
        userId: user.id,
        weight: val,
        date: Date.now()
      });
      setLatestWeight(val);
      setWeightSaved(true);
      setTimeout(() => setWeightSaved(false), 2000);
    } catch (error) {
      console.error('Erro ao salvar peso:', error);
    } finally {
      setSavingWeight(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-12 pb-32">
        <PageHeader 
          title="Home" 
          description="Status e Atividade Geral" 
        />

        {/* Home Inteligente: Treino do Dia */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
          <header className="px-1 flex justify-between items-center group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Sessão Atual
            </h3>
            <span className="text-[clamp(9px,1vw,11px)] font-mono text-muted-foreground uppercase">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
            </span>
          </header>
          
          {loading ? (
            <Card className="rounded-2xl border border-border bg-card/50 animate-pulse h-24 shadow-sm"></Card>
          ) : activeWorkout ? (
            <Card className="rounded-2xl border border-border border-l-4 border-l-primary bg-primary/5 overflow-hidden shadow-lg group hover:bg-primary/10 transition-all cursor-pointer active:scale-[0.98] relative"
                  onClick={() => navigate(`/workout/${activeWorkout.protocolId}`)}>
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                Em Andamento
              </div>
              <CardContent className="p-4 md:p-6 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-lg md:text-xl font-black uppercase tracking-tight text-foreground">{activeWorkout.protocolName}</h4>
                    <p className="text-[clamp(10px,1.2vw,12px)] text-primary font-mono uppercase tracking-widest">{activeWorkout.completedSets} séries enviadas para nuvem</p>
                  </div>
                  <div className="bg-primary p-2.5 rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
                    <RefreshCw className="w-5 h-5 animate-spin-slow" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary font-black text-[clamp(10px,1.2vw,12px)] uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">
                  Continuar Treino <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </CardContent>
            </Card>
          ) : todayWorkout ? (
            <Card className="rounded-2xl border border-border border-l-4 border-l-primary bg-card overflow-hidden shadow-sm group hover:border-primary/40 transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => navigate(`/workout/${todayWorkout.protocolId}`)}>
              <CardContent className="p-4 md:p-6 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-lg md:text-xl font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">{todayWorkout.protocolName}</h4>
                    <p className="text-[clamp(10px,1.2vw,12px)] text-muted-foreground font-mono uppercase tracking-widest">{todayWorkout.exercises.length} exercícios</p>
                  </div>
                  <div className="bg-primary/10 p-2.5 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary font-black text-[clamp(10px,1.2vw,12px)] uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">
                  Iniciar Sessão <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-border bg-muted/40 shadow-sm overflow-hidden relative border-l-4 border-l-primary/30">
              <CardContent className="p-6 md:p-8 flex items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                    <Zap className="w-3 h-3" /> Recuperação Ativa
                  </div>
                  <h4 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">Dia de Descanso</h4>
                  <p className="text-[clamp(10px,1.2vw,13px)] text-muted-foreground/90 uppercase tracking-widest font-mono">Nenhum treino programado para hoje.</p>
                </div>
                <div className="hidden sm:block">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center bg-primary/5">
                    <Calendar className="w-6 h-6 text-primary/40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
          <header className="px-1">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
                Metas Definidas
            </h3>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="relative overflow-hidden rounded-2xl border border-border shadow-sm bg-card flex flex-col justify-between min-h-[140px] hover:border-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col gap-2 justify-center h-full">
                <span className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-widest">Consistência Semanal</span>
                <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none">
                  {Math.round((stats.weeklyWorkouts / stats.weeklyGoal) * 100)}%
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex-1">
                    <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] dark:shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (stats.weeklyWorkouts / stats.weeklyGoal) * 100)}%` }} />
                  </div>
                  <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground uppercase font-mono">{stats.weeklyWorkouts}/{stats.weeklyGoal}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border shadow-sm bg-card flex flex-col justify-between min-h-[140px] hover:border-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col gap-2 justify-center h-full">
                <span className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-widest">Consistência Mensal</span>
                <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none">
                  {Math.round((stats.monthlyWorkouts / stats.monthlyGoal) * 100)}%
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex-1">
                    <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] dark:shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (stats.monthlyWorkouts / stats.monthlyGoal) * 100)}%` }} />
                  </div>
                  <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground uppercase font-mono">{stats.monthlyWorkouts}/{stats.monthlyGoal}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[300ms] fill-mode-both">
          <header className="px-1">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-primary" />
                Saúde & Corpo
            </h3>
          </header>
          <Card className="rounded-2xl border border-border shadow-sm bg-card hover:border-primary/20 transition-all duration-300 p-5 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6">
               <div className="space-y-1">
                 <h4 className="text-[clamp(11px,1.4vw,14px)] font-black text-foreground uppercase tracking-tight">Peso Corporal</h4>
                 <p className="text-[clamp(10px,1.2vw,12px)] text-muted-foreground uppercase tracking-widest font-mono">Último registro: {latestWeight ? `${latestWeight} kg` : 'Nenhum'}</p>
               </div>
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-32">
                   <Input 
                     type="number" 
                     step="0.1" 
                     placeholder="Ex: 75.5"
                     value={currentWeight}
                     onChange={e => setCurrentWeight(e.target.value)}
                     className="w-full text-center pl-6 pr-6 font-mono font-bold text-lg h-12 rounded-xl bg-background border-border/50 focus:border-primary/30 transition-colors"
                   />
                   {currentWeight && (
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-[clamp(10px,1.2vw,12px)] pointer-events-none">
                       kg
                     </span>
                   )}
                 </div>
                 <Button 
                   onClick={handleSaveWeight} 
                   disabled={savingWeight || !currentWeight || parseFloat(currentWeight) === latestWeight}
                   className="h-12 rounded-xl px-4 sm:px-6 font-black uppercase tracking-wider text-[11px] w-auto transition-all shrink-0"
                 >
                   {savingWeight ? <RefreshCw className="w-4 h-4 animate-spin" /> : weightSaved ? <Check className="w-4 h-4" /> : 'Salvar'}
                 </Button>
               </div>
            </div>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
