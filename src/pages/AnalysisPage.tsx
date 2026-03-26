import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { Card, CardContent } from "@/components/ui/card"
import { Activity, TrendingUp, LineChart as LineChartIcon, Scale, HelpCircle } from "lucide-react"
import { PageHeader } from '../components/PageHeader';
import { getAnalysisSummary, type AnalysisSummary } from '../services/analysisService';
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
  ReferenceLine,
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
    color: "#34d399", // emerald-400 for better dark mode visibility
  },
  muscle: {
    label: "Grupo Muscular",
    color: "var(--primary)",
  }
};

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7', '#10b981'];

const InfoTooltip = ({ title, content }: { title: string, content: string }) => (
  <div className="group relative inline-block">
    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help group-hover:text-primary transition-colors flex-shrink-0" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
      <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-1.5">{title}</p>
      <p className="text-[9px] text-muted-foreground leading-relaxed font-medium lowercase first-letter:uppercase">{content}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-popover" />
    </div>
  </div>
);

export default function AnalysisPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('week');

  useEffect(() => {
    if (user) {
      loadData(period);
    }
  }, [user, period]);

  // Atualiza análise ao receber evento global
  useEffect(() => {
    function handleRefresh() {
      if (user) loadData(period);
    }
    window.addEventListener('refresh-analysis', handleRefresh);
    return () => {
      window.removeEventListener('refresh-analysis', handleRefresh);
    };
  }, [user, period]);

  async function loadData(p: 'week' | 'month' | 'year' | 'all') {
    setLoading(true);
    try {
      const summary = await getAnalysisSummary(user!.id, p);
      setData(summary);
      if (summary.exerciseProgression && summary.exerciseProgression.length > 0) {
        const validExs = summary.exerciseProgression.filter(ex => ex.data.length > 1);
        if (validExs.length > 0) {
          const isCurrentValid = selectedExerciseName && validExs.some(ex => ex.name === selectedExerciseName);
          if (!isCurrentValid) {
            setSelectedExerciseName(validExs[0].name);
          }
        } else {
          setSelectedExerciseName(null);
        }
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  }


  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader 
          title="Análise" 
          description="Performance e Progressão Global"
          action={
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-[200px]">
              <TabsList className="bg-muted/40 p-1 rounded-xl h-10 w-full font-black text-[9px] uppercase tracking-widest border border-border/20">
                <TabsTrigger value="week" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">7D</TabsTrigger>
                <TabsTrigger value="month" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">30D</TabsTrigger>
                <TabsTrigger value="year" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">1A</TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Início</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground animate-pulse">Analisando sua evolução...</p>
          </div>
        ) : (
          <>
            {/* 0. Progresso Holístico (Radar) */}
            {data && data.hasEnoughRadarData && data.radarData && data.radarData.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      Progresso Holístico
                    </h3>
                    <InfoTooltip 
                      title="Análise Spider" 
                      content="Compara seu estado inicial (sombra pontilhada) com o atual (área sólida). Mostra a expansão da sua performance em Superiores, Inferiores, Peso e Consistência." 
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground font-black uppercase tracking-wider">Métricas Agregadas</span>
                </header>

                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden mt-4">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                      {/* Chart Area */}
                      <div className="w-full lg:w-1/2 flex justify-center">
                        <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[300px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radarData}>
                              <PolarGrid strokeOpacity={0.1} />
                              <PolarAngleAxis 
                                dataKey="axis" 
                                tick={{ fill: 'currentColor', fontSize: 9, fontWeight: 900, opacity: 0.5 }}
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

                      <div className="w-full lg:w-1/2 grid grid-cols-2 gap-x-8 gap-y-6 px-4 py-2">
                         {data.radarData.map((item) => {
                           const breakdownIndex = data.muscleBreakdown.findIndex(m => m.name.toUpperCase().includes(item.axis.toUpperCase().slice(0,3)));
                           const dotColor = breakdownIndex !== -1 ? COLORS[breakdownIndex % COLORS.length] : "var(--primary)";
                           
                           return (
                             <div key={item.axis} className="flex flex-col gap-1 justification-center group hover:translate-x-1 transition-transform cursor-default">
                               <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: dotColor }} />
                                  <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-foreground transition-colors truncate">{item.fullLabel}</span>
                               </div>
                               <div className="flex items-baseline gap-2 ml-4">
                                 <span className="text-[9px] font-mono font-bold text-primary">
                                   {item.change === 0 ? 'ESTÁVEL' : `${item.change > 0 ? '+' : ''}${Math.abs(item.change).toFixed(1)}%`}
                                   {item.change !== 0 && (
                                     <span className="opacity-40 text-[8px] uppercase ml-1">{item.change > 0 ? 'evolut.' : 'reduc.'}</span>
                                   )}
                                 </span>
                               </div>
                             </div>
                           );
                         })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* 1. Muscle Distribution (Pie) */}
            {data && data.muscleBreakdown.length > 0 && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <Activity className="w-4 h-4 text-primary" />
                      Distribuição Muscular
                    </h3>
                    <InfoTooltip 
                      title="Equilíbrio de Volume" 
                      content="Mostra como seu esforço semanal está distribuído. Um equilíbrio adequado previne lesões e garante um desenvolvimento simétrico." 
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground font-black uppercase tracking-wider">EQUILÍBRIO DE VOLUME</span>
                </header>
                
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                      {/* Chart Area */}
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
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                  />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>

                      {/* Legend Area - Columns */}
                      <div className="w-full lg:w-1/2 grid grid-cols-2 gap-x-8 gap-y-4 px-4 py-2">
                         {data.muscleBreakdown.map((entry, index) => (
                           <div key={entry.name} className="flex flex-col gap-0.5 justify-center group hover:translate-x-1 transition-transform cursor-default">
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-foreground transition-colors truncate">{entry.name}</span>
                             </div>
                             <span className="text-[9px] font-mono font-bold text-primary ml-4">
                               {entry.avgWeight.toFixed(1)}kg <span className="opacity-40 text-[8px] uppercase">avg</span>
                             </span>
                           </div>
                         ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* 2. Volume and Weight Charts (Conditional Grid) */}
            <div className={`grid grid-cols-1 ${period === 'week' ? 'lg:grid-cols-2' : ''} gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both`}>
              <section className="space-y-4">
                <header className="px-1">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                     Volume Diário
                   </h3>
                </header>
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="w-full overflow-x-auto custom-scrollbar">
                      <div style={{ minWidth: data?.progressData && data.progressData.length > 20 ? `${data.progressData.length * 30}px` : '100%' }}>
                        <ChartContainer config={chartConfig} className="h-[220px] w-full">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={data?.progressData}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                              <XAxis 
                                dataKey="date" 
                                stroke="currentColor" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fontWeight: 900, fontSize: 9, opacity: 0.6 }}
                              />
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <Bar 
                                dataKey="volume" 
                                fill="var(--primary)" 
                                radius={[4, 4, 0, 0]} 
                                opacity={0.8}
                                activeBar={{ opacity: 1, scale: 1.05 }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {data && data.bodyWeightProgression && data.bodyWeightProgression.length > 0 && (
                <section className="space-y-4">
                  <header className="px-1">
                     <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                       Evolução do Peso Corporal
                     </h3>
                  </header>
                  <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <LineChart data={data.bodyWeightProgression}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis 
                              dataKey="date" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false}
                              tick={{ fontWeight: 900, fontSize: 9, opacity: 0.6 }}
                            />
                            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="weight" 
                              stroke="var(--primary)" 
                              strokeWidth={3}
                              dot={{ fill: 'var(--primary)', r: 3 }}
                              activeDot={{ r: 5, strokeWidth: 0 }}
                              name="Peso"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </section>
              )}
            </div>

            {/* 3. Evolução por Grupo Muscular */}
            {data && data.muscleGroupProgression && data.muscleGroupProgression.filter(mg => mg.data.length > 1).length > 0 && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[400ms] fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                   <div className="flex items-center gap-2">
                     <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                       Progressão por Grupo Muscular
                     </h3>
                     <InfoTooltip 
                       title="Volume e Força" 
                       content="Volume (Linha Sólida): Peso × Reps totais. | Força (Linha Pontilhada): Evolução da carga média relativa do grupo." 
                     />
                   </div>
                   <span className="text-[9px] font-mono text-muted-foreground font-black uppercase tracking-wider">VOLUME & FORÇA</span>
                </header>

                <div className={`grid gap-6 ${
                  data.muscleGroupProgression.filter(mg => mg.data.length > 1).length === 1 ? 'grid-cols-1' :
                  data.muscleGroupProgression.filter(mg => mg.data.length > 1).length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {data.muscleGroupProgression.filter(mg => mg.data.length > 1).map((mg) => {
                    const muscleColor = "var(--primary)";
                    
                    return (
                      <Card key={mg.name} className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-5 flex flex-col gap-4 flex-1">
                          <header className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: muscleColor }} />
                              <h4 className="text-[10px] font-black uppercase text-foreground/80 group-hover:text-foreground transition-colors">{mg.name}</h4>
                            </div>
                            {mg.strengthIncrease !== 0 && (
                              <div className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                mg.strengthIncrease > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                              }`}>
                                {mg.strengthIncrease > 0 ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3 rotate-180" />}
                                {mg.strengthIncrease > 0 ? '+' : ''}{mg.strengthIncrease.toFixed(1)}%
                              </div>
                            )}
                          </header>

                        <div className="w-full overflow-x-auto custom-scrollbar">
                          <div style={{ minWidth: mg.data && mg.data.length > 8 ? `${mg.data.length * 40}px` : '100%' }}>
                            <ChartContainer config={chartConfig} className="h-[140px] w-full">
                              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <LineChart data={mg.data}>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                                  <XAxis 
                                    dataKey="date" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fontWeight: 900, fontSize: 8, opacity: 0.5 }}
                                  />
                                  <YAxis yAxisId="left" hide domain={['dataMin - 100', 'dataMax + 100']} />
                                  <YAxis yAxisId="right" hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  
                                  {/* Baseline References */}
                                  {mg.baselineAvgVolume > 0 && (
                                    <ReferenceLine 
                                      yAxisId="left"
                                      y={mg.baselineAvgVolume} 
                                      stroke={muscleColor}
                                      strokeDasharray="3 3" 
                                      strokeOpacity={0.25} 
                                    />
                                  )}
                                  {mg.baselineAvgStrength > 0 && (
                                    <ReferenceLine 
                                      yAxisId="right"
                                      y={mg.baselineAvgStrength} 
                                      stroke={muscleColor} 
                                      strokeDasharray="2 2" 
                                      strokeOpacity={0.4} 
                                    />
                                  )}

                                  <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="volume" 
                                    stroke={muscleColor} 
                                    strokeWidth={3}
                                    dot={{ fill: muscleColor, r: 3 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                    name="Volume"
                                  />
                                  <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="avgRelativeStrength" 
                                    stroke={muscleColor} 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    opacity={0.4}
                                    dot={false}
                                    activeDot={false}
                                    name="Força Rel."
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. Evolução por Exercício com Seletor */}
            {data && data.exerciseProgression.filter(ex => ex.data.length > 1).length > 0 && selectedExerciseName && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[500ms] fill-mode-both pb-20">
                <header className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                   <div className="flex items-center gap-2">
                     <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                        <LineChartIcon className="w-4 h-4 text-emerald-600" />
                       Progressão por Exercício
                     </h3>
                     <InfoTooltip 
                       title="Métricas de Performance" 
                       content="Força Relativa: Carga vs Seu Peso. | Carga Máxima: Recorde Absoluto. | E1RM: Estimativa de Força Máxima Real baseada em reps." 
                     />
                   </div>
                   
                   <Select value={selectedExerciseName} onValueChange={setSelectedExerciseName}>
                    <SelectTrigger className="w-full sm:w-[250px] bg-card border-border/50 rounded-xl h-10 font-black text-[10px] uppercase tracking-wider shadow-sm">
                      <SelectValue placeholder="Selecione o exercício" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 font-bold uppercase text-[10px]">
                      {data.exerciseProgression.filter(ex => ex.data.length > 1).map(ex => (
                        <SelectItem key={ex.name} value={ex.name}>{ex.name}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                </header>
                
                {/* Tooltip logic moved to header icons */}

                <div className="grid grid-cols-1 gap-6">
                  {data.exerciseProgression.filter(ex => ex.name === selectedExerciseName).map((ex) => (
                    <Card 
                      key={ex.name} 
                      className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden"
                    >
                      <CardContent className="p-8 space-y-8">
                        <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-foreground font-geist mb-1">{ex.name}</h4>
                            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">Progressão Histórica</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ex.data[ex.data.length - 1]?.relativeStrength && ex.data[ex.data.length - 1].relativeStrength! > 0 && (
                              <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 px-4 py-2 rounded-xl">
                                <span className="text-[8px] font-black text-amber-600/60 uppercase">Força Relativa</span>
                                <span className="text-xs font-black text-amber-600">{(ex.data[ex.data.length - 1].relativeStrength!).toFixed(2)}x</span>
                              </div>
                            )}
                             <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 px-4 py-2 rounded-xl">
                                <span className="text-[8px] font-black text-emerald-600/60 uppercase">Carga Máxima</span>
                                <span className="text-xs font-black text-emerald-600">{Math.max(...ex.data.map(d => d.weight))}kg</span>
                              </div>
                              <div className="flex flex-col items-center bg-primary/5 border border-primary/10 px-4 py-2 rounded-xl">
                                <span className="text-[8px] font-black text-primary/60 uppercase">E1RM (Pico)</span>
                                <span className="text-xs font-black text-primary">{Math.max(...ex.data.map(d => d.e1rm)).toFixed(1)}kg</span>
                              </div>
                          </div>
                        </header>
                        <div className="w-full overflow-x-auto custom-scrollbar">
                          <div style={{ minWidth: ex.data && ex.data.length > 10 ? `${ex.data.length * 50}px` : '100%' }}>
                            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <LineChart data={ex.data}>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                                  <XAxis 
                                    dataKey="date" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fontWeight: 800, fill: 'currentColor', opacity: 0.5 }}
                                    padding={{ left: 20, right: 20 }}
                                  />
                                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Line 
                                    type="monotone" 
                                    dataKey="weight" 
                                    stroke="var(--primary)" 
                                    strokeWidth={4}
                                    dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: 'white' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Carga Máxima"
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="e1rm" 
                                    stroke="#34d399" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    opacity={0.6}
                                    name="1RM Estimado"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Aviso de Falta de Peso no Final se não houver gráficos no topo */}
            {data && data.bodyWeightProgression.length === 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
                <div className="mt-0.5">
                  <Activity className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-400">Peso Corporal Ausente</h4>
                  <p className="text-[10px] text-amber-700 dark:text-amber-500/90 mt-1 leading-relaxed max-w-[90%]">
                    Você ainda não registrou seu peso corporal. Ele é essencial para calcular o volume de exercícios combinados (peso do corpo) e por tempo (pranchas).
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
