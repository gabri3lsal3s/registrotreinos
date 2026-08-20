import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

export interface DayWorkoutData {
  date: string; // YYYY-MM-DD
  volume: number;
  workoutsCount: number;
  protocolNames?: string[];
}

interface ConsistencyHeatmapProps {
  workoutDays: DayWorkoutData[];
  year?: number;
}

export function ConsistencyHeatmap({ workoutDays, year: initialYear }: ConsistencyHeatmapProps) {
  const [selectedYear, setSelectedYear] = useState(initialYear || dayjs().year());
  const [hoveredDay, setHoveredDay] = useState<DayWorkoutData | null>(null);

  // Mapear dias para acesso O(1)
  const daysMap = useMemo(() => {
    const map = new Map<string, DayWorkoutData>();
    workoutDays.forEach((d) => map.set(d.date, d));
    return map;
  }, [workoutDays]);

  // Gerar todos os 365/366 dias do ano selecionado
  const calendarWeeks = useMemo(() => {
    const startOfYear = dayjs(`${selectedYear}-01-01`);
    const endOfYear = dayjs(`${selectedYear}-12-31`);
    
    // Começar na segunda-feira da primeira semana
    let current = startOfYear.startOf('week');
    const weeks: { date: string; dayOfMonth: number; isCurrentYear: boolean; data?: DayWorkoutData }[][] = [];

    while (current.isBefore(endOfYear) || current.isSame(endOfYear, 'day') || weeks.length < 52) {
      const week: { date: string; dayOfMonth: number; isCurrentYear: boolean; data?: DayWorkoutData }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.format('YYYY-MM-DD');
        week.push({
          date: dateStr,
          dayOfMonth: current.date(),
          isCurrentYear: current.year() === selectedYear,
          data: daysMap.get(dateStr)
        });
        current = current.add(1, 'day');
      }
      weeks.push(week);
      if (current.year() > selectedYear && current.day() === 0) break;
    }
    return weeks;
  }, [selectedYear, daysMap]);

  // Métricas do Ano
  const yearStats = useMemo(() => {
    let totalWorkouts = 0;
    let totalVolume = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const startOfYear = dayjs(`${selectedYear}-01-01`);
    const endOfYear = dayjs(`${selectedYear}-12-31`);
    const today = dayjs();

    let cur = startOfYear;
    while (cur.isBefore(endOfYear) || cur.isSame(endOfYear, 'day')) {
      const dateStr = cur.format('YYYY-MM-DD');
      const hasWorkout = daysMap.has(dateStr);

      if (hasWorkout) {
        const data = daysMap.get(dateStr)!;
        totalWorkouts += data.workoutsCount || 1;
        totalVolume += data.volume || 0;
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }

      cur = cur.add(1, 'day');
    }

    // Streak atual até hoje
    let back = today;
    while (daysMap.has(back.format('YYYY-MM-DD')) || (back.isSame(today, 'day') && !daysMap.has(back.format('YYYY-MM-DD')))) {
      if (daysMap.has(back.format('YYYY-MM-DD'))) {
        currentStreak++;
        back = back.subtract(1, 'day');
      } else if (back.isSame(today, 'day')) {
        back = back.subtract(1, 'day');
      } else {
        break;
      }
    }

    return {
      totalWorkouts,
      totalVolume,
      maxStreak,
      currentStreak
    };
  }, [selectedYear, daysMap]);

  const getCellColor = (data?: DayWorkoutData, isCurrentYear?: boolean) => {
    if (!isCurrentYear) return 'opacity-10 pointer-events-none bg-muted/20 border-transparent';
    if (!data || data.workoutsCount === 0) return 'bg-muted/30 border-border/30 hover:border-border/80';

    const vol = data.volume;
    if (vol >= 15000) return 'bg-emerald-400 border-emerald-300 shadow-xs shadow-emerald-400/40 text-zinc-950';
    if (vol >= 8000) return 'bg-emerald-500 border-emerald-400 text-white';
    if (vol >= 3000) return 'bg-emerald-600 border-emerald-500 text-white';
    return 'bg-emerald-800/80 border-emerald-700 text-emerald-200';
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <Card className="rounded-2xl border-border/60 bg-card overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Cabeçalho do Heatmap */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                Mapa Anual de Consistência
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                {yearStats.totalWorkouts} treinos registrados em {selectedYear}
              </p>
            </div>
          </div>

          {/* Navegação de Ano */}
          <div className="flex items-center gap-1.5 bg-muted/30 rounded-xl p-1 border border-border/40">
            <button
              type="button"
              onClick={() => setSelectedYear(y => y - 1)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-xs px-2 text-foreground">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear(y => y + 1)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Próximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges de Frequência & Streak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Total de Sessões
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-foreground">
              {yearStats.totalWorkouts} treinos
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Volume Total
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-primary">
              {(yearStats.totalVolume / 1000).toFixed(1)}k kg
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" /> Streak Atual
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-amber-500">
              {yearStats.currentStreak} {yearStats.currentStreak === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-primary" /> Maior Streak
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-foreground">
              {yearStats.maxStreak} dias
            </span>
          </div>
        </div>

        {/* Grid de 52 Semanas (Heatmap Scrollável) */}
        <div className="overflow-x-auto pb-2 pt-1 no-scrollbar">
          <div className="min-w-[680px]">
            {/* Linha dos Meses */}
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5 px-6">
              {months.map(m => (
                <span key={m}>{m}</span>
              ))}
            </div>

            {/* Grid 7 linhas (dias da semana) x 52+ colunas (semanas) */}
            <div className="flex gap-1">
              {/* Labels dos Dias (Seg, Qua, Sex) */}
              <div className="flex flex-col justify-between text-[9px] font-bold text-muted-foreground pr-1 py-0.5 select-none h-24">
                <span>Seg</span>
                <span>Qua</span>
                <span>Sex</span>
                <span>Dom</span>
              </div>

              {/* Matriz das Semanas */}
              <div className="flex gap-1 flex-1">
                {calendarWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1">
                    {week.map((day, dIdx) => (
                      <div
                        key={`${wIdx}-${dIdx}`}
                        onMouseEnter={() => day.data && setHoveredDay(day.data)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => day.data && setHoveredDay(day.data)}
                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm border transition-all cursor-pointer ${getCellColor(
                          day.data,
                          day.isCurrentYear
                        )}`}
                        title={`${day.date}${day.data ? `: ${Math.round(day.data.volume)}kg` : ''}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legenda de Intensidade */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-muted/30 border border-border/30" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-800 border border-emerald-700" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600 border border-emerald-500" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-400 border border-emerald-300" />
            <span>Mais Volume</span>
          </div>

          {hoveredDay && (
            <div className="font-mono text-foreground font-bold truncate max-w-[200px]">
              {dayjs(hoveredDay.date).format('DD/MM')}: {Math.round(hoveredDay.volume)}kg ({hoveredDay.workoutsCount} treino)
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
