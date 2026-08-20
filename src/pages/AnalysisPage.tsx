import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Layout, PageHeader, InfoTooltip } from '../components/common';
import { ConsistencyHeatmap, AgonistAntagonistBalanceCard } from '../components/analysis';
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, LineChart as LineChartIcon, Scale, Dumbbell } from "lucide-react";
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
  PolarRadiusAxis,
  ResponsiveContainer
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

export default function AnalysisPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
  const [period, setPeriod] = useState<AnalysisPeriod>('week');

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
  }, [user, period, loadData]);

  const selectedExercise = data?.exerciseProgression?.find(ex => ex.name === selectedExerciseName);
  const lastPoint = selectedExercise && selectedExercise.data.length > 0
    ? selectedExercise.data[selectedExercise.data.length - 1]
    : null;
  const topWeight = selectedExercise && selectedExercise.data.length > 0
    ? Math.max(...selectedExercise.data.map(d => d.weight))
    : 0;

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
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

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
              Carregando dados analíticos...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 0. Mapa Anual de Consistência (Heatmap 52 Semanas) */}
            {data && data.allWorkoutDays && (
              <ConsistencyHeatmap workoutDays={data.allWorkoutDays} />
            )}

            {/* 1. Progresso Holístico (Radar) */}
            {data && data.hasEnoughRadarData && data.radarData && data.radarData.length > 0 && (
              <section className="space-y-3">
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
                  <span className="text-xs font-mono text-muted-foreground font-bold uppercase">Métricas Agregadas</span>
                </header>

                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                      <div className="w-full lg:w-1/2 flex justify-center">
                        <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[300px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radarData}>
                              <PolarGrid strokeOpacity={0.1} />
                              <PolarAngleAxis 
                                dataKey="axis" 
                                tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700, opacity: 0.7 }}
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
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>

                      <div className="w-full lg:w-1/2 grid grid-cols-2 gap-x-6 gap-y-4 px-2">
                        {data.radarData.map((item) => {
                          const breakdownIndex = data.muscleBreakdown.findIndex(m => m.name.toUpperCase().includes(item.axis.toUpperCase().slice(0,3)));
                          const dotColor = breakdownIndex !== -1 ? COLORS[breakdownIndex % COLORS.length] : "var(--primary)";
                          
                          return (
                            <div key={item.axis} className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                <span className="text-xs font-bold text-foreground truncate">{item.fullLabel}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-primary ml-4">
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

            {/* 2. Distribuição Muscular */}
            {data && data.muscleBreakdown.length > 0 && (
              <section className="space-y-3">
                <header className="px-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-primary" />
                      Distribuição Muscular
                    </h3>
                    <InfoTooltip 
                      title="Equilíbrio de Volume" 
                      content="Mostra como seu esforço semanal está distribuído entre os grupos musculares." 
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-bold uppercase">Equilíbrio de Séries</span>
                </header>
                
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                      <div className="w-full lg:w-1/2 flex justify-center">
                        <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[300px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                              <Pie
                                data={data.muscleBreakdown}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                stroke="none"
                              >
                                {data.muscleBreakdown.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>

                      <div className="w-full lg:w-1/2 grid grid-cols-2 gap-2.5">
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

            {/* 3. Progressão de Carga e Peso */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Volume de Treino */}
              <section className="space-y-3">
                <header className="px-1 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                    <LineChartIcon className="w-4 h-4 text-primary" />
                    Volume de Treino
                  </h3>
                </header>
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={data?.progressData} margin={{ left: 16, right: 16 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                          <XAxis 
                            dataKey="date" 
                            stroke="currentColor" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            tick={{ fontWeight: 700, fontSize: 10, opacity: 0.6 }}
                            interval="preserveStartEnd"
                            minTickGap={5}
                          />
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Bar 
                            dataKey="volume" 
                            fill="var(--primary)" 
                            radius={[6, 6, 0, 0]} 
                            opacity={0.85}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </section>

              {/* Evolução do Peso Corporal */}
              {data && data.bodyWeightProgression && data.bodyWeightProgression.length > 0 && (
                <section className="space-y-3">
                  <header className="px-1 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-500" />
                      Evolução do Peso Corporal
                    </h3>
                  </header>
                  <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <LineChart data={data.bodyWeightProgression} margin={{ left: 16, right: 16 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis 
                              dataKey="date" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false}
                              tick={{ fontWeight: 700, fontSize: 10, opacity: 0.6 }}
                              interval="preserveStartEnd"
                              minTickGap={5}
                            />
                            <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="weight" 
                              stroke="var(--primary)" 
                              strokeWidth={3}
                              dot={{ fill: 'var(--primary)', r: 4 }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                              name="Peso (kg)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </section>
              )}
            </div>

            {/* 4. Progressão por Exercício Selecionado */}
            {data && data.exerciseProgression && data.exerciseProgression.length > 0 && (
              <section className="space-y-3">
                <header className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Progressão por Exercício (1RM & Carga)
                    </h3>
                  </div>

                  <div className="w-full sm:w-64">
                    <Select 
                      value={selectedExerciseName || ''} 
                      onValueChange={(val) => setSelectedExerciseName(val)}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 text-xs font-bold">
                        <SelectValue placeholder="Selecione um exercício" />
                      </SelectTrigger>
                      <SelectContent className="text-xs font-bold max-h-60">
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
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-foreground">
                          {selectedExercise.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs font-mono font-bold">
                          <span className="text-primary">
                            1RM: {lastPoint?.e1rm ? `${lastPoint.e1rm.toFixed(1)} kg` : '-'}
                          </span>
                          <span className="text-muted-foreground">
                            Top Set: {topWeight > 0 ? `${topWeight} kg` : '-'}
                          </span>
                        </div>
                      </div>

                      <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <LineChart data={selectedExercise.data} margin={{ left: 16, right: 16 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis 
                              dataKey="date" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false}
                              tick={{ fontWeight: 700, fontSize: 10, opacity: 0.6 }}
                              interval="preserveStartEnd"
                              minTickGap={5}
                            />
                            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="weight" 
                              stroke="var(--primary)" 
                              strokeWidth={3}
                              dot={{ fill: 'var(--primary)', r: 4 }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
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
                        </ResponsiveContainer>
                      </ChartContainer>
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
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
