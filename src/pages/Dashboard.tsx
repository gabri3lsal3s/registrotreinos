import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { db, getExercisesByProtocol } from '../services/workoutDB';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Dumbbell, ArrowRight, Calendar, TrendingUp, Zap, RefreshCw } from "lucide-react"
import { useAuthStore } from '../services/authStore';

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
  const [stats, setStats] = useState({ weeklyWorkouts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      try {
        const now = new Date();

        const today = now.getDay(); // 0-6
        
        // 1. Get Today's Workout
        const allProtocols = await db.protocols
          .where('userId')
          .equals(user.id)
          .toArray();

        console.log(`[Dashboard] Total protocolos local: ${allProtocols.length}`);

        const enabledProtocols = allProtocols.filter(p => p.isEnabled);
        console.log(`[Dashboard] Protocolos habilitados: ${enabledProtocols.length}`);

        const dayKey = WEEK_DAYS[today].key;
        const dayLabel = WEEK_DAYS[today].label;
        console.log(`[Dashboard] Hoje é ${dayKey} (${dayLabel})`);

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
              console.log(`[Dashboard] Fallback: Protocolo "${p.name}" identificado como ativo por exercício.`);
              activeProtocol = p;
              break;
            }
          }
        }

        if (activeProtocol) {
          const exercises = await getExercisesByProtocol(activeProtocol.id);
          const filtered = exercises.filter(ex => ex.name.includes(`(${dayLabel})`));
          console.log(`[Dashboard] Protocolo ativo: ${activeProtocol.name}, Exercícios para hoje: ${filtered.length}`);
          
          if (filtered.length > 0) {
            setTodayWorkout({
              protocolName: activeProtocol.name,
              protocolId: activeProtocol.id,
              exercises: filtered
            });
          } else {
            console.log(`[Dashboard] Nenhum exercício encontrado para o dia ${dayLabel} no protocolo ${activeProtocol.name}`);
            setTodayWorkout(null);
          }
        } else {
          console.log(`[Dashboard] Nenhum protocolo habilitado para ${dayKey}`);
          setTodayWorkout(null);
        }

        // 2. Check for Active Workout
        const active = await db.workouts
          .where({ userId: user.id, status: 'active' })
          .first();
        
        if (active) {
          console.log(`[Dashboard] Existe um treino em andamento: ${active.id}`);
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

        // 3. Get Stats (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const history = await db.workouts
          .where('userId').equals(user.id)
          .and(w => w.date >= sevenDaysAgo.getTime() && w.status === 'completed')
          .toArray();
        
        setStats({
          weeklyWorkouts: history.length
        });

      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

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
              Meta Semanal
            </h3>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="relative overflow-hidden rounded-2xl border border-border shadow-sm bg-card flex flex-col justify-between min-h-[140px] hover:border-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col gap-2 justify-center h-full">
                <span className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-widest">Consistência</span>
                <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none">
                  {Math.round((stats.weeklyWorkouts / (user ? (useAuthStore.getState().weeklyGoal) : 5)) * 100)}%
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex-1">
                    <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] dark:shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (stats.weeklyWorkouts / (useAuthStore.getState().weeklyGoal)) * 100)}%` }} />
                  </div>
                  <span className="text-[clamp(9px,1vw,11px)] text-muted-foreground uppercase font-mono">{stats.weeklyWorkouts}/{useAuthStore.getState().weeklyGoal}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border shadow-sm bg-card flex flex-col justify-between min-h-[140px] hover:border-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col gap-2 justify-center h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-widest">Sessões (7D)</span>
                  <span className="text-[clamp(9px,1.2vw,11px)] text-primary font-mono font-bold">FEITO</span>
                </div>
                <p className="text-3xl md:text-4xl font-black text-foreground leading-tight tracking-tight">{stats.weeklyWorkouts} <span className="text-[12px] font-mono opacity-60 tracking-normal ml-1 uppercase">Treinos</span></p>
                <div className="flex gap-1.5 mt-3 overflow-hidden">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 min-w-[4px] rounded-full transition-all duration-500 ${i < stats.weeklyWorkouts ? 'bg-primary/80 shadow-[0_0_4px_rgba(16,185,129,0.3)]' : 'bg-muted/50'}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
}
