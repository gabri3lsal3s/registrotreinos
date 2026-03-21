import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { Card, CardContent } from "@/components/ui/card"
import { Activity, TrendingUp, LineChart as LineChartIcon, Scale } from "lucide-react"
import { PageHeader } from '../components/PageHeader';
import { getAnalysisSummary, type AnalysisSummary } from '../services/analysisService';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
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

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857'];

export default function AnalysisPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [protocolId, setProtocolId] = useState<string>("all");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, protocolId]);

  // Atualiza análise ao receber evento global
  useEffect(() => {
    function handleRefresh() {
      if (user) loadData();
    }
    window.addEventListener('refresh-analysis', handleRefresh);
    return () => {
      window.removeEventListener('refresh-analysis', handleRefresh);
    };
  }, [user, protocolId]);

  async function loadData() {
    setLoading(true);
    try {
      const selectedId = protocolId === "all" ? undefined : protocolId;
      const summary = await getAnalysisSummary(user!.id, selectedId);
      setData(summary);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatVolume = (v: number) => {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toString();
  };

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader 
          title="Análise" 
          description="Performance e Progressão"
          action={
            <Select value={protocolId} onValueChange={setProtocolId}>
              <SelectTrigger className="w-[180px] bg-background border-border/40 font-black text-[10px] uppercase tracking-wider h-10 rounded-xl shadow-none">
                <SelectValue placeholder="Protocolo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 font-bold uppercase text-[10px]">
                <SelectItem value="all">TODOS OS PROTOCOLOS</SelectItem>
                {data?.protocols.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground animate-pulse">Analisando sua evolução...</p>
          </div>
        ) : (
          <>

            {/* Muscle Breakdown */}
            {data && data.muscleBreakdown.length > 0 && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                  <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                    <Activity className="w-4 h-4 text-primary" />
                    Distribuição Muscular (Volume)
                  </h3>
                </header>
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="w-full md:w-1/2 h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.muscleBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {data.muscleBreakdown.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 grid grid-cols-1 gap-2">
                        {data.muscleBreakdown.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold">{formatVolume(item.value)} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Evolução por Exercício (Somente para Protocolo Específico) */}
            {data && data.exerciseProgression.length > 0 && protocolId !== "all" && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[450ms] fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <LineChartIcon className="w-4 h-4 text-emerald-600" />
                     Progressão por Exercício
                   </h3>
                   <span className="text-[9px] font-mono text-emerald-600 font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/30 px-2 py-1 rounded-md">TENÇÃO MECÂNICA</span>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.exerciseProgression.map((ex) => (
                    <Card 
                      key={ex.name} 
                      className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                    >
                      <CardContent className="p-6 space-y-4">
                        <header className="flex justify-between items-start">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground font-geist">{ex.name}</h4>
                          <div className="flex items-center gap-2">
                            {ex.data[ex.data.length - 1]?.relativeStrength && ex.data[ex.data.length - 1].relativeStrength! > 0 && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 px-2.5 py-1 rounded-lg">FORÇA: {(ex.data[ex.data.length - 1].relativeStrength!).toFixed(1)}x</span>
                            )}
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 px-2.5 py-1 rounded-lg">MAX: {Math.max(...ex.data.map(d => d.weight))}kg</span>
                          </div>
                        </header>
                        <ChartContainer config={chartConfig} className="h-[140px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ex.data}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                              <XAxis 
                                dataKey="date" 
                                fontSize={8} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fontWeight: 800, fill: 'currentColor', opacity: 0.5 }}
                              />
                              <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line 
                                type="monotone" 
                                dataKey="weight" 
                                stroke="var(--primary)" 
                                strokeWidth={3}
                                dot={{ fill: 'var(--primary)', r: 3 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                name="Carga Máxima"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="e1rm" 
                                stroke="#34d399" 
                                strokeWidth={1}
                                strokeDasharray="4 4"
                                dot={false}
                                opacity={0.6}
                                name="1RM Estimado"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Evolução por Grupo Muscular (Somente na Visão Global) */}
            {data && data.muscleGroupProgression && data.muscleGroupProgression.length > 0 && protocolId === "all" && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[450ms] fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <LineChartIcon className="w-4 h-4 text-emerald-600" />
                     Progressão por Grupo Muscular
                   </h3>
                   <span className="text-[9px] font-mono text-emerald-600 font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/30 px-2 py-1 rounded-md">VOLUME TOTAL</span>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.muscleGroupProgression.map((mg) => (
                    <Card 
                      key={mg.name} 
                      className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                    >
                      <CardContent className="p-6 space-y-4">
                        <header className="flex justify-between items-start">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground font-geist">{mg.name}</h4>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 px-2.5 py-1 rounded-lg">MAX: {Math.max(...mg.data.map(d => d.volume))}kg</span>
                        </header>
                        <ChartContainer config={chartConfig} className="h-[140px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mg.data}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                              <XAxis 
                                dataKey="date" 
                                fontSize={8} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fontWeight: 800, fill: 'currentColor', opacity: 0.5 }}
                              />
                              <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line 
                                type="monotone" 
                                dataKey="volume" 
                                stroke="var(--primary)" 
                                strokeWidth={3}
                                dot={{ fill: 'var(--primary)', r: 3 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                name="Volume"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-6">
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[500ms] fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <TrendingUp className="w-4 h-4 text-primary" />
                     Volume Diário
                   </h3>
                </header>
                
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                  </CardContent>
                </Card>
              </section>

            {/* Evolução do Peso Corporal (Somente na Visão Global) */}
            {data && data.bodyWeightProgression && data.bodyWeightProgression.length > 0 && protocolId === "all" && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[600ms] fill-mode-both">
                <header className="px-1 flex items-center justify-between group">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <Scale className="w-4 h-4 text-primary" />
                     Evolução do Peso Corporal
                   </h3>
                </header>

                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
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
          </>
        )}
      </div>
    </Layout>
  );
}
