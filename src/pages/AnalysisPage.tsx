import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, BarChart3, Activity, Target, LineChart as LineChartIcon } from "lucide-react"
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
  LineChart 
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
  }
};

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
      <div className="space-y-8 pb-32">
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
            <section className="grid grid-cols-2 gap-4">
              <Card className="bg-card border border-border/50 rounded-2xl shadow-sm p-4 md:p-5 flex flex-col items-center text-center group hover:border-primary/20 transition-all">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[clamp(8px,1vw,10px)] font-black text-muted-foreground uppercase tracking-wider mb-1 opacity-80">Volume Total</span>
                <p className="text-xl md:text-2xl font-black text-foreground tracking-tight tabular-nums leading-none">
                  {formatVolume(data?.totalVolume || 0)}
                  <span className="text-[10px] opacity-50 ml-1 uppercase">KG</span>
                </p>
              </Card>
              <Card className="bg-card border border-border/50 rounded-2xl shadow-sm p-4 md:p-5 flex flex-col items-center text-center group hover:border-primary/20 transition-all">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[clamp(8px,1vw,10px)] font-black text-muted-foreground uppercase tracking-wider mb-1 opacity-80">Frequência</span>
                <p className="text-xl md:text-2xl font-black text-foreground tracking-tight tabular-nums leading-none">
                  {data?.frequency || 0}
                  <span className="text-[10px] opacity-50 ml-1 uppercase">SESSÕES</span>
                </p>
              </Card>
            </section>

            {/* Evolução por Exercício */}
            {data?.exerciseProgression.length && (
              <section className="space-y-6">
                <header className="px-1 flex items-center justify-between group">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <LineChartIcon className="w-4 h-4 text-emerald-600" />
                     Progressão por Exercício
                   </h3>
                   <span className="text-[9px] font-mono text-emerald-600 font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/30 px-2 py-1 rounded-md">TENÇÃO MECÂNICA</span>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.exerciseProgression.map((ex) => (
                    <Card key={ex.name} className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                      <CardContent className="p-6 space-y-4">
                        <header className="flex justify-between items-start">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground font-geist">{ex.name}</h4>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 px-2.5 py-1 rounded-lg">MAX: {Math.max(...ex.data.map(d => d.weight))}kg</span>
                        </header>
                        <ChartContainer config={chartConfig} className="h-[140px] w-full">
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
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-6">
              <section className="space-y-4">
                <header className="px-1 flex items-center justify-between group">
                   <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                      <TrendingUp className="w-4 h-4 text-primary" />
                     Volume Diário
                   </h3>
                </header>
                
                <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
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
                    </ChartContainer>
                  </CardContent>
                </Card>
              </section>

              {protocolId !== "all" && (
                <section className="space-y-4">
                  <header className="px-1 flex items-center justify-between group">
                    <h3 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2 group-hover:text-foreground transition-colors">
                        <Target className="w-4 h-4 text-primary" />
                      Média do Protocolo
                    </h3>
                  </header>
                  <div className="grid grid-cols-1 gap-4">
                    <Card className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[140px]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-60 mb-2 font-geist">Carga Média / Sessão</p>
                      <p className="text-4xl font-black tracking-tight tabular-nums font-geist">
                        {data?.frequency ? formatVolume(Math.round(data.totalVolume / data.frequency)) : 0}
                        <span className="text-[12px] ml-1 opacity-40 uppercase">KG</span>
                      </p>
                    </Card>
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
