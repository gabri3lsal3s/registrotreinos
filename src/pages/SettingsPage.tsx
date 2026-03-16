import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import Layout from '../components/Layout';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

import { toast } from 'sonner';
import { Moon, Settings as SettingsIcon, Zap, Activity, Target, TrendingUp, ChevronDown, ChevronUp, Download, ShieldCheck } from "lucide-react"
import { PageHeader } from '../components/PageHeader';

import { syncData, pullData } from '../services/syncService';
import { exportUserData } from '../lib/exportUtils';

export default function SettingsPage() {
  const { user, logout, weeklyGoal, setWeeklyGoal } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();


  return (
    <Layout>
      <div className="space-y-12 pb-32">
        <PageHeader 
          title="Configuração" 
          description="Preferências e Ajustes" 
        />

        <section className="space-y-4">
          <header className="px-1 group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Interface & Sincronização
            </h3>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
              <CardContent className="p-5">
                <div className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Modo Escuro</span>
                        <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Comforto visual</p>
                      </div>
                    </div>
                  </div>
                  <Switch 
                    checked={isDarkMode} 
                    onCheckedChange={(val: boolean) => setIsDarkMode(val)} 
                    className="scale-100 data-[state=checked]:bg-primary"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
              <CardContent className="p-5">
                <div className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Sincronizar</span>
                        <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Nuvem Supabase</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      toast.promise(Promise.all([syncData(), pullData()]), {
                        loading: 'Sincronizando...',
                        success: 'Tudo atualizado!',
                        error: 'Erro na sync.'
                      });
                    }}
                    className="border-primary/20 text-primary hover:bg-primary/5"
                  >
                    Sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <header className="px-1 group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Target className="w-3.5 h-3.5 text-primary" />
              Metas de Consistência
            </h3>
          </header>
          <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
            <CardContent className="p-5">
              <div className="flex justify-between items-center group">
                <div className="space-y-1">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Meta Semanal</span>
                      <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Dias de treino por semana</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-muted/20 border border-border/50 rounded-xl px-4 py-2">
                  <button onClick={() => setWeeklyGoal(Math.max(1, weeklyGoal - 1))} className="text-primary hover:scale-110 transition-transform"><ChevronDown className="w-5 h-5" /></button>
                  <span className="w-6 text-center font-black text-lg">{weeklyGoal}</span>
                  <button onClick={() => setWeeklyGoal(Math.min(7, weeklyGoal + 1))} className="text-primary hover:scale-110 transition-transform"><ChevronUp className="w-5 h-5" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <header className="px-1 group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-foreground transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Dados & Privacidade
            </h3>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
              <CardContent className="p-5">
                <div className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Exportar JSON</span>
                        <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Backup completo</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      if (user) {
                        toast.promise(exportUserData(user.id), {
                          loading: 'Preparando exportação...',
                          success: 'Download iniciado!',
                          error: 'Erro ao exportar.'
                        });
                      }
                    }}
                    className="border-primary/20 text-primary hover:bg-primary/5"
                  >
                    Exportar
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </section>

        <div className="pt-6 flex flex-col items-center gap-6">
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full max-w-sm rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-[11px] border border-border/40 hover:bg-muted/50 group"
          >
            <SettingsIcon className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-500" />
            Encerrar Sessão
          </Button>

          <div className="flex flex-col items-center gap-1 opacity-20">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase">Registro de Treinos</span>
            <span className="text-[8px] font-mono">v1.6.0-ULTIMATE</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
