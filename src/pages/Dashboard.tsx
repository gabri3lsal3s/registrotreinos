import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useDataReactivity } from '../hooks/useDataReactivity';
import { Layout, PageHeader, MetricCard } from '../components/common';
import { 
  db, 
  getExercisesByProtocol, 
  addBodyWeight, 
  getBodyWeightsByUser,
  cancelActiveWorkout,
  deleteWorkout
} from '../services/workoutDB';
import { fullSync, deleteWorkoutFromCloud } from '../services/syncService';
import { syncEventBus } from '../services/eventBus';
import { WEEK_DAYS, getDayKey, getDayLabel } from '../utils/constants';
import { toTimestamp } from '../utils/workoutMath';
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
  const dataVersion = useDataReactivity();

  const [todayWorkout, setTodayWorkout] = useState<TodayWorkoutInfo | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutInfo | null>(null);
  const [completedDayKeys, setCompletedDayKeys] = useState<string[]>([]);
  const [stats, setStats] = useState({ 
    weeklyWorkouts: 0, 
    monthlyWorkouts: 0,
    weeklyGoal: 4,
    monthlyGoal: 16
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
        .filter(p => !p.isDeleted)
        .toArray());

      const enabledProtocols = allProtocols.filter(p => p.isEnabled !== false);

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

      // Treino ativo em andamento
      const currentActive = await db.workouts
        .where('userId')
        .equals(user.id)
        .filter(w => !w.isDeleted && w.status === 'active')
        .first();

      if (currentActive) {
        const sets = await db.workoutSets
          .where('workoutId')
          .equals(currentActive.id)
          .filter(s => !s.isDeleted && s.completed)
          .toArray();

        if (sets.length === 0) {
          await deleteWorkout(currentActive.id);
          setActiveWorkout(null);
        } else {
          let protocolName = 'Treino';

          if (currentActive.protocolId) {
            const prot = await db.protocols.get(currentActive.protocolId);
            if (prot) protocolName = prot.name;
          }

          setActiveWorkout({
            ...currentActive,
            protocolName,
            completedSets: sets.length
          });
        }
      } else {
        setActiveWorkout(null);
      }

      // Informações para o card "Treino de Hoje"
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

      // Buscar histórico para mapa de consistência e métricas
      const rawWorkouts = await db.workouts
        .where('userId')
        .equals(user.id)
        .filter(w => !w.isDeleted && w.status !== 'cancelled' && w.status !== 'active')
        .toArray();

      const allWorkouts = rawWorkouts.map(w => ({
        ...w,
        date: toTimestamp(w.date)
      }));

      // Início e fim da semana corrente (Domingo 00:00 até Sábado 23:59)
      const sundayStart = new Date(now);
      sundayStart.setDate(now.getDate() - now.getDay());
      sundayStart.setHours(0, 0, 0, 0);

      const saturdayEnd = new Date(sundayStart);
      saturdayEnd.setDate(sundayStart.getDate() + 6);
      saturdayEnd.setHours(23, 59, 59, 999);

      const thisWeekWorkouts = allWorkouts.filter(w => {
        return w.date >= sundayStart.getTime() && w.date <= saturdayEnd.getTime();
      });

      // Mapear os dias da semana concluídos nesta semana ('sun', 'mon', 'tue', etc.)
      const thisWeekCompletedKeys = [...new Set(thisWeekWorkouts.map(w => {
        const d = new Date(w.date);
        return getDayKey(d);
      }))];
      setCompletedDayKeys(thisWeekCompletedKeys);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyWorkouts = allWorkouts.filter(w => w.date >= startOfMonth.getTime()).length;

      let weeklyGoal = 0;
      let monthlyGoal = 0;
      enabledProtocols.forEach(p => {
        const pDays = p.daysOfWeek || [];
        weeklyGoal += pDays.length;
        
        for (let d = 1; d <= 30; d++) {
          const date = new Date(now.getFullYear(), now.getMonth(), d);
          if (date.getMonth() !== now.getMonth()) break;
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
  }, [user, dataVersion, loadDashboardData]);

  const handleSaveWeight = async (weight: number) => {
    if (!user) return;
    try {
      const id = await addBodyWeight({
        userId: user.id,
        weight,
        date: Date.now()
      });
      setLatestWeight(weight);
      syncEventBus.emitDataMutated({ table: 'body_weights', action: 'create', recordId: id });
      toast.success('Peso registrado com sucesso!');
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar peso.');
      throw err;
    }
  };

  const handleDiscardActiveWorkout = async (workoutId: string) => {
    try {
      await cancelActiveWorkout(workoutId);
      await deleteWorkoutFromCloud(workoutId);
      setActiveWorkout(null);
      toast.success('Treino em andamento descartado.');
      loadDashboardData();
      fullSync().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao descartar treino.');
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
          onDiscard={handleDiscardActiveWorkout}
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
