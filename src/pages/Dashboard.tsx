import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Layout, PageHeader, MetricCard } from '../components/common';
import { 
  db, 
  getExercisesByProtocol, 
  addBodyWeight, 
  getBodyWeightsByUser 
} from '../services/workoutDB';
import { fullSync } from '../services/syncService';
import { WEEK_DAYS, getDayKey, getDayLabel } from '../utils/constants';
import { Calendar, TrendingUp, LayoutDashboard } from "lucide-react";

import { 
  ActiveWorkoutBanner, 
  TodayWorkoutHero, 
  ConsistencyGrid, 
  BodyWeightQuickCard,
  type TodayWorkoutInfo,
  type ActiveWorkoutInfo
} from '../components/dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [todayWorkout, setTodayWorkout] = useState<TodayWorkoutInfo | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutInfo | null>(null);
  const [completedDayKeys, setCompletedDayKeys] = useState<string[]>([]);
  const [stats, setStats] = useState({ 
    weeklyWorkouts: 0, 
    monthlyWorkouts: 0,
    weeklyGoal: 5,
    monthlyGoal: 20
  });
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date();
      const todayLabel = getDayLabel(now);
      const todayKey = getDayKey(now);

      const allProtocols = (await db.protocols
        .where('userId')
        .equals(user.id)
        .toArray()).filter(p => !p.isArchived);

      const enabledProtocols = allProtocols.filter(p => p.isEnabled);

      let activeProtocol = null;
      for (const p of enabledProtocols) {
        const isScheduled = (p.daysOfWeek || []).includes(todayKey);
        
        if (isScheduled) {
          activeProtocol = p;
          break;
        }

        if (!p.daysOfWeek || p.daysOfWeek.length === 0) {
          const exercises = await getExercisesByProtocol(p.id);
          const hasToday = exercises.some(ex => ex.name.includes(`(${todayLabel})`));
          if (hasToday) {
            activeProtocol = p;
            break;
          }
        }
      }

      if (activeProtocol) {
        const exercises = await getExercisesByProtocol(activeProtocol.id);
        const filtered = exercises.filter(ex => ex.name.includes(`(${todayLabel})`));
        
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

      // Treino ativo em andamento
      const active = await db.workouts
        .where({ userId: user.id, status: 'active' })
        .first();
      
      if (active) {
        const protocol = await db.protocols.get(active.protocolId);
        const sets = await db.workoutSets.where('workoutId').equals(active.id).toArray();
        setActiveWorkout({
          ...active,
          protocolName: protocol?.name || 'Treino em Andamento',
          completedSets: sets.length
        });
      } else {
        setActiveWorkout(null);
      }

      // Cálculo de consistência e metas
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Início na segunda
      const startOfWeekTs = startOfWeek.getTime();

      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const completedWorkouts = await db.workouts
        .where('userId').equals(user.id)
        .and(w => w.status === 'completed')
        .toArray();

      const thisWeekWorkouts = completedWorkouts.filter(w => w.date >= startOfWeekTs);
      const monthlyWorkouts = completedWorkouts.filter(w => w.date >= firstDayOfMonth).length;

      // Dias da semana completados
      const daysDone = thisWeekWorkouts.map(w => {
        const d = new Date(w.date);
        return WEEK_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]?.key;
      }).filter(Boolean);
      setCompletedDayKeys(Array.from(new Set(daysDone)));

      const activeProtocols = allProtocols.filter(p => p.isEnabled);
      const weeklyGoal = activeProtocols.reduce((sum, p) => sum + (p.daysOfWeek?.length || 0), 0);

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      let monthlyGoal = 0;
      
      activeProtocols.forEach(p => {
        const pDays = p.daysOfWeek || [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(now.getFullYear(), now.getMonth(), d);
          const dayK = WEEK_DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]?.key;
          if (pDays.includes(dayK)) {
            monthlyGoal++;
          }
        }
      });

      setStats({
        weeklyWorkouts: thisWeekWorkouts.length,
        monthlyWorkouts,
        weeklyGoal: Math.max(1, weeklyGoal || 4),
        monthlyGoal: Math.max(1, monthlyGoal || 16)
      });

      // Último peso registrado
      const bwHistory = await getBodyWeightsByUser(user.id);
      if (bwHistory.length > 0) {
        setLatestWeight(bwHistory[bwHistory.length - 1].weight);
      }
    } catch (err) {
      console.error('[Dashboard] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleSaveWeight = async (weight: number) => {
    if (!user) return;
    try {
      await addBodyWeight({
        userId: user.id,
        weight,
        date: Date.now()
      });
      await fullSync();
      setLatestWeight(weight);
      toast.success('Peso registrado com sucesso!');
      window.dispatchEvent(new Event('refresh-analysis'));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar peso.');
      throw err;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <PageHeader 
          title="Dashboard" 
          description="Visão geral do seu progresso, consistência e treinos."
          icon={<LayoutDashboard className="w-5 h-5 text-primary" />}
        />

        {/* Banner de Treino Ativo (se houver) */}
        <ActiveWorkoutBanner
          activeWorkout={activeWorkout}
          onResume={(protocolId) => navigate(`/workout/${protocolId}`)}
        />

        {/* Hero Card do Treino de Hoje */}
        <TodayWorkoutHero
          todayWorkout={todayWorkout}
          todayLabel={getDayLabel(new Date())}
          onStart={(protocolId) => navigate(`/workout/${protocolId}`)}
          onNavigateProtocols={() => navigate('/protocols')}
        />

        {/* Grid de Consistência Semanal */}
        <ConsistencyGrid
          completedDayKeys={completedDayKeys}
          weeklyGoal={stats.weeklyGoal}
        />

        {/* Métricas Gerais */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <MetricCard
            label="Treinos na Semana"
            value={`${stats.weeklyWorkouts}/${stats.weeklyGoal}`}
            icon={<Calendar className="w-5 h-5 text-primary" />}
            progressPercent={Math.min(100, Math.round((stats.weeklyWorkouts / stats.weeklyGoal) * 100))}
            subValue={`${Math.min(100, Math.round((stats.weeklyWorkouts / stats.weeklyGoal) * 100))}%`}
          />
          <MetricCard
            label="Treinos no Mês"
            value={`${stats.monthlyWorkouts}/${stats.monthlyGoal}`}
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            progressPercent={Math.min(100, Math.round((stats.monthlyWorkouts / stats.monthlyGoal) * 100))}
            subValue={`${Math.min(100, Math.round((stats.monthlyWorkouts / stats.monthlyGoal) * 100))}%`}
          />
        </div>

        {/* Registro Rápido de Peso */}
        <BodyWeightQuickCard
          latestWeight={latestWeight}
          onSaveWeight={handleSaveWeight}
        />
      </div>
    </Layout>
  );
}
