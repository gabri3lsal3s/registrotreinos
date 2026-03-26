import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import Layout from '../components/Layout';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

import { Moon, Zap } from "lucide-react"
import { PageHeader } from '../components/PageHeader';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();




  return (
    <Layout>
      <div className="space-y-12 pb-32">
        <PageHeader 
          title="Configuração" 
          description="Preferências e Ajustes" 
        />

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
          <header className="px-1 group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Interface
            </h3>
          </header>
          <div className="space-y-4">
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
          </div>
        </section>





        <div className="pt-6 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full max-w-sm rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-[11px] border border-border/40 hover:bg-muted/50 group"
          >
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
