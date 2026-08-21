import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDataReactivity } from '../hooks/useDataReactivity';
import { Layout, PageHeader, InfoTooltip } from '../components/common';
import { ConsistencyHeatmap, AgonistAntagonistBalanceCard } from '../components/analysis';
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, LineChart as LineChartIcon, Scale, Dumbbell, Calendar, Zap, Award } from "lucide-react";
import { getAnalysisSummary, type AnalysisSummary } from '../services/analysisService';
import type { AnalysisPeriod } from '../types';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

const chartConfig: ChartConfig = {
  volume: {
    label: "Volume",
    color: "var(--primary)",
  },
  weight: {
    label: "Top Set",
    color: "var(--primary)",
  },
  e1rm: {
    label: "1RM Est.",
    color: "#34d399",
  },
  muscle: {
    label: "Grupo Muscular",
    color: "var(--primary)",
  }
};

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7', '#10b981'];

type AnalysisTabSection = 'overview' | 'muscles' | 'progression';

export default function AnalysisPage() {
  const { user } = useAuth();
  const dataVersion = useDataReactivity();
  const [data, setData] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
  const [period, setPeriod] = useState<AnalysisPeriod>('week');
  const [activeTab, setActiveTab] = useState<AnalysisTabSection>('overview');

  const loadData = useCallback(async (p: AnalysisPeriod) => {
    if (!user) return;
    setLoading(true);
    try {
      const summary = await getAnalysisSummary(user.id, p);
      setData(summary);
      if (summary.exerciseProgression && summary.exerciseProgression.length > 0) {
        const validExs = summary.exerciseProgression.filter(ex => ex.data.length > 1);
        if (validExs.length > 0) {
          setSelectedExerciseName(prev => {
            const isCurrentValid = prev && validExs.some(ex => ex.name === prev);
            return isCurrentValid ? prev : validExs[0].name;
          });
        } else {
          setSelectedExerciseName(null);
        }
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData(period);
    }
  }, [user, period, dataVersion, loadData]);

  const selectedExercise = useMemo(() => {
    return data?.exerciseProgression?.find(ex => ex.name === selectedExerciseName) || null;
  }, [data, selectedExerciseName]);

  const exerciseStats = useMemo(() => {
    if (!selectedExercise || selectedExercise.data.length === 0) {
      return { lastPoint: null, topWeight: 0, maxE1rm: 0, totalSessions: 0 };
    }
    const lastPoint = selectedExercise.data[selectedExercise.data.length - 1];
    const topWeight = Math.max(...selectedExercise.data.map(d => d.weight || 0));
    const maxE1rm = Math.max(...selectedExercise.data.map(d => d.e1rm || 0));
    const totalSessions = selectedExercise.data.length;
    return { lastPoint, topWeight, maxE1rm, totalSessions };
  }, [selectedExercise]);

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-5 sm:space-y-6">
        <PageHeader 
          title="Análises e Estatísticas" 
          description="Acompanhe sua progressão de cargas, volume e evolução corporal."
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          action={
            <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalysisPeriod)} className="w-full sm:w-60">
              <TabsList className="bg-muted/40 p-1 rounded-xl h-10 w-full font-bold text-xs uppercase tracking-wider border border-border/20 grid grid-cols-4">
                <TabsTrigger value="week" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs">7D</TabsTrigger>
                <TabsTrigger value="month" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs">30D</TabsTrigger>
                <TabsTrigger value="year" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs">1A</TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs">Total</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {/* Sub-navegação em Abas Temáticas */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisTabSection)} className="w-full">
          <TabsList className="bg-muted/30 p-1 rounded-xl h-11 w-full font-bold text-xs uppercase tracking-wider border border-border/30 grid grid-cols-3">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-[11px] sm:text-xs flex items-center justify-center gap-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Frequência</span>
            </TabsTrigger>
            <TabsTrigger value="muscles" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-[11px] sm:text-xs flex items-center justify-center gap-1.5 truncate">
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Músculos</span>
            </TabsTrigger>
            <TabsTrigger value="progression" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs text-[11px] sm:text-xs flex items-center justify-center gap-1.5 truncate">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Cargas & 1RM</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
              Carregando dados analíticos...
            </p>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-300">
            {/* ========================================================= */}
            {/* ABA 1: FREQUÊNCIA E VOLUME GERAL                           */}
            {/* ========================================================= */}
            {activeTab === 'overview' && (
              <div className="space-y-5 sm:space-y-6">
                {/* 1.1. Mapa Anual de Consistência (Heatmap 52 Semanas / Mês Mobile) */}
                {data && data.allWorkoutDays && (
                  <ConsistencyHeatmap workoutDays={data.allWorkoutDays} />
                )}

                {/* 1.2. Volume e Peso Corporal */}
                <div className={cn("grid grid-cols-1 gap-4 sm:gap-5", data?.bodyWeightProgression && data.bodyWeightProgression.length > 0 && "lg:grid-cols-2")}>
                  {/* Volume de Treino */}
                  <section className="space-y-2.5 sm:space-y-3">
                    <header className="px-1 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                        <LineChartIcon className="w-4 h-4 text-primary" />
                        Volume Total de Treino
                      </h3>
                      <span className="text-[11px] font-mono text-muted-foreground font-bold">kg totais</span>
                    </header>
                    <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                      <CardContent className="p-3.5 sm:p-5">
                        {data?.progressData && data.progressData.length > 0 ? (
                          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px] w-full">
                            <BarChart data={data.progressData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                              <XAxis 
                                dataKey="date" 
                                stroke="currentColor" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fontWeight: 700, fontSize: 10, opacity: 0.6 }}
                                interval="preserveStartEnd"
                                minTickGap={10}
                              />
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <Bar 
                                dataKey="volume" 
                                fill="var(--primary)" 
                                radius={[6, 6, 0, 0]} 
                                opacity={0.85}
                              />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
                            Nenhum dado de volume registrado no período.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </section>

                  {/* Evolução do Peso Corporal */}
                  {data && data.bodyWeightProgression && data.bodyWeightProgression.length > 0 && (
                    <section className="space-y-2.5 sm:space-y-3">
                      <header className="px-1 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                          <Scale className="w-4 h-4 text-blue-500" />
                          Evolução do Peso Corporal
                        </h3>
                        <span className="text-[11px] font-mono text-muted-foreground font-bold">kg</span>
                      </header>
                      <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                        <CardContent className="p-3.5 sm:p-5">
                          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px] w-full">
                            <LineChart data={data.bodyWeightProgression} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                              <XAxis 
                                dataKey="date" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fontWeight: 700, fontSize: 10, opacity: 0.6 }}
                                interval="preserveStartEnd"
                                minTickGap={10}
                              />
                              <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line 
                                type="monotone" 
                                dataKey="weight" 
                                stroke="var(--primary)" 
                                strokeWidth={3}
                                dot={{ fill: 'var(--primary)', r: 3.5 }}
                                activeDot={{ r: 5.5, strokeWidth: 0 }}
                                name="Peso (kg)"
                              />
                            </LineChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </section>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 2: EQUILÍBRIO E DISTRIBUIÇÃO MUSCULAR                 */}
            {/* ========================================================= */}
            {activeTab === 'muscles' && (
              <div className="space-y-5 sm:space-y-6">
                {/* 2.1. Progresso Holístico (Radar) */}
                {data && data.hasEnoughRadarData && data.radarData && data.radarData.length > 0 && (
                  <section className="space-y-2.5 sm:space-y-3">
                    <header className="px-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" />
                          Progresso Holístico
                        </h3>
                        <InfoTooltip 
                          title="Análise Spider" 
                          content="Compara seu estado inicial (sombra pontilhada) com o atual (área sólida). Mostra a expansão da sua performance em Superiores, Inferiores, Peso e Consistência." 
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground font-bold uppercase">Spider</span>
                    </header>

                    <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                      <CardContent className="p-3.5 sm:p-5">
                        <div className="flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-6">
                          <div className="w-full lg:w-1/2 flex justify-center">
                            <ChartContainer config={chartConfig} className="h-[210px] sm:h-[250px] w-full max-w-[280px] sm:max-w-[320px]">
                              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data.radarData}>
                                <PolarGrid strokeOpacity={0.15} />
                                <PolarAngleAxis 
                                  dataKey="axis" 
                                  tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700, opacity: 0.8 }}
                                />
                                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                  name="Início"
                                  dataKey="start"
                                  stroke="#f59e0b"
                                  fill="#f59e0b"
                                  fillOpacity={0.05}
                                  strokeWidth={2}
                                  strokeDasharray="4 4"
                                />
                                <Radar
                                  name="Atual"
                                  dataKey="atual"
                                  stroke="var(--primary)"
                                  fill="var(--primary)"
                                  fillOpacity={0.2}
                                  strokeWidth={3}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                              </RadarChart>
                            </ChartContainer>
                          </div>

                          <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {data.radarData.map((item) => {
                              const breakdownIndex = data.muscleBreakdown.findIndex(m => m.name.toUpperCase().includes(item.axis.toUpperCase().slice(0,3)));
                              const dotColor = breakdownIndex !== -1 ? COLORS[breakdownIndex % COLORS.length] : "var(--primary)";
                              
                              return (
                                <div key={item.axis} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30">
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                    <span className="text-xs font-bold text-foreground truncate">{item.fullLabel}</span>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-primary shrink-0">
                                    {item.change === 0 ? 'Estável' : `${item.change > 0 ? '+' : ''}${Math.abs(item.change).toFixed(1)}%`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                )}

                {/* 2.2. Distribuição Muscular */}
                {data && data.muscleBreakdown.length > 0 && (
                  <section className="space-y-2.5 sm:space-y-3">
                    <header className="px-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-primary" />
                          Distribuição de Séries por Músculo
                        </h3>
                        <InfoTooltip 
                          title="Equilíbrio de Volume" 
                          content="Mostra como seu esforço semanal está distribuído entre os grupos musculares." 
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground font-bold uppercase">Séries</span>
                    </header>
                    
                    <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                      <CardContent className="p-3.5 sm:p-5">
                        <div className="flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-6">
                          <div className="w-full lg:w-1/2 flex justify-center">
                            <ChartContainer config={chartConfig} className="h-[210px] sm:h-[250px] w-full max-w-[260px] sm:max-w-[300px]">
                              <PieChart>
                                <Pie
                                  data={data.muscleBreakdown}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={55}
                                  outerRadius={75}
                                  paddingAngle={4}
                                  stroke="none"
                                >
                                  {data.muscleBreakdown.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              </PieChart>
                            </ChartContainer>
                          </div>

                          <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {data.muscleBreakdown.map((item, index) => (
                              <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30 text-xs">
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                  <span className="font-bold text-foreground truncate">{item.name}</span>
                                </div>
                                <span className="font-mono font-bold text-primary shrink-0">{item.value} séries</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Balanço Agonista / Antagonista */}
                    <AgonistAntagonistBalanceCard muscleBreakdown={data.muscleBreakdown} />
                  </section>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 3: PROGRESSÃO DE CARGAS E 1RM                         */}
            {/* ========================================================= */}
            {activeTab === 'progression' && (
              <div className="space-y-5 sm:space-y-6">
                {data && data.exerciseProgression && data.exerciseProgression.length > 0 ? (
                  <section className="space-y-3 sm:space-y-4">
                    <header className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Progressão Individual por Exercício
                        </h3>
                      </div>

                      <div className="w-full sm:w-72">
                        <Select 
                          value={selectedExerciseName || ''} 
                          onValueChange={(val) => setSelectedExerciseName(val)}
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-background border-border/60 text-xs font-bold shadow-xs">
                            <SelectValue placeholder="Selecione um exercício" />
                          </SelectTrigger>
                          <SelectContent className="text-xs font-bold max-h-64">
                            {data.exerciseProgression.map((ex) => (
                              <SelectItem key={ex.name} value={ex.name}>
                                {ex.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </header>

                    {selectedExercise ? (
                      <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                        <CardContent className="p-3.5 sm:p-5 space-y-4">
                          {/* Nome do Exercício */}
                          <div className="border-b border-border/30 pb-3">
                            <h4 className="font-black text-sm sm:text-base text-foreground leading-tight">
                              {selectedExercise.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                              Histórico de força e 1RM estimado em sessões concluídas
                            </p>
                          </div>

                          {/* Mini Cards de Destaque de Performance */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                1RM Estimado
                              </span>
                              <span className="font-mono font-black text-sm sm:text-base text-primary">
                                {exerciseStats.lastPoint?.e1rm ? `${exerciseStats.lastPoint.e1rm.toFixed(1)} kg` : '-'}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
                                <Award className="w-3 h-3 text-amber-500" /> Recorde 1RM
                              </span>
                              <span className="font-mono font-black text-sm sm:text-base text-foreground">
                                {exerciseStats.maxE1rm > 0 ? `${exerciseStats.maxE1rm.toFixed(1)} kg` : '-'}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Top Set Atual
                              </span>
                              <span className="font-mono font-black text-sm sm:text-base text-foreground">
                                {exerciseStats.lastPoint?.weight ? `${exerciseStats.lastPoint.weight} kg` : '-'}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
                                <Zap className="w-3 h-3 text-primary" /> Registros
                              </span>
                              <span className="font-mono font-black text-sm sm:text-base text-foreground">
                                {exerciseStats.totalSessions} {exerciseStats.totalSessions === 1 ? 'sessão' : 'sessões'}
                              </span>
                            </div>
                          </div>

                          {/* Gráfico de Linha */}
                          <div className="pt-2">
                            <ChartContainer config={chartConfig} className="h-[210px] sm:h-[240px] w-full">
                              <LineChart data={selectedExercise.data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                                <XAxis 
                                  dataKey="date" 
                                  fontSize={10} 
                                  tickLine={false} 
                                  axisLine={false}
                                  tick={{ fontWeight: 700, fontSize: 10, opacity: 0.6 }}
                                  interval="preserveStartEnd"
                                  minTickGap={10}
                                />
                                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line 
                                  type="monotone" 
                                  dataKey="weight" 
                                  stroke="var(--primary)" 
                                  strokeWidth={3}
                                  dot={{ fill: 'var(--primary)', r: 3.5 }}
                                  activeDot={{ r: 5.5, strokeWidth: 0 }}
                                  name="Carga (kg)"
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="e1rm" 
                                  stroke="#34d399" 
                                  strokeWidth={2}
                                  strokeDasharray="4 4"
                                  dot={false}
                                  name="1RM Estimado (kg)"
                                />
                              </LineChart>
                            </ChartContainer>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="p-8 text-center border-dashed border-border/50 bg-muted/10 rounded-2xl">
                        <p className="text-xs text-muted-foreground font-medium">
                          Selecione um exercício com múltiplos treinos registrados para visualizar o gráfico de progressão.
                        </p>
                      </Card>
                    )}
                  </section>
                ) : (
                  <Card className="p-8 text-center border-dashed border-border/50 bg-muted/10 rounded-2xl">
                    <p className="text-xs text-muted-foreground font-medium">
                      Nenhum exercício com dados históricos suficientes para análise de carga.
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

