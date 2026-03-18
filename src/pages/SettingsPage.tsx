// Função utilitária para importar protocolo Upper/Lower (sexta e sábado)
async function handleImportUpperLowerProtocol(user: any, toast: any) {
  if (!user) return;
  try {
    const protocolId = await createProtocol({
      name: 'Upper/Lower (Calistenia, Elásticos, Pilates)',
      userId: user.id,
      isEnabled: false,
      daysOfWeek: ['fri', 'sat']
    });

    // Sexta-feira: Upper Body
    const upperExercises = [
      { name: 'Flexão de braços (Padrão ou Declinada com pés no sofá)', sets: 4, reps: 0, dayOfWeek: 'fri' },
      { name: 'Remada com elástico (sentado, elástico nos pés)', sets: 4, reps: 15, dayOfWeek: 'fri' },
      { name: 'Flexão Pike (foco em ombros)', sets: 3, reps: 12, dayOfWeek: 'fri' },
      { name: 'Crucifixo inverso com elástico (em pé)', sets: 3, reps: 15, dayOfWeek: 'fri' },
      { name: 'Flexão Diamante (mãos juntas, foco tríceps)', sets: 3, reps: 15, dayOfWeek: 'fri' },
      { name: 'Rosca direta com elástico', sets: 3, reps: 15, dayOfWeek: 'fri' },
      { name: 'Magic Circle / Anel de Pilates (pressão no peito)', sets: 3, reps: 1, dayOfWeek: 'fri' },
    ];
    // Sábado: Lower Body & Core
    const lowerExercises = [
      { name: 'Agachamento Búlgaro (pé de trás no sofá)', sets: 4, reps: 12, dayOfWeek: 'sat' },
      { name: 'Elevação Pélvica Unilateral', sets: 4, reps: 15, dayOfWeek: 'sat' },
      { name: 'Flexão de isquiotibiais (Hamstring curl)', sets: 3, reps: 15, dayOfWeek: 'sat' },
      { name: 'Agachamento Sissy (foco em quadríceps)', sets: 3, reps: 12, dayOfWeek: 'sat' },
      { name: 'Panturrilha unilateral em um degrau', sets: 4, reps: 20, dayOfWeek: 'sat' },
      { name: 'Roll-up ou Teaser (Pilates)', sets: 3, reps: 12, dayOfWeek: 'sat' },
      { name: 'Prancha (apoiado na bola de Pilates)', sets: 3, reps: 1, dayOfWeek: 'sat' },
    ];
    let order = 0;
    for (const ex of upperExercises) {
      await addExercise({
        protocolId,
        name: ex.name,
        order: order++,
        dayOfWeek: ex.dayOfWeek,
        sets: ex.sets,
        reps: ex.reps,
      });
    }
    for (const ex of lowerExercises) {
      await addExercise({
        protocolId,
        name: ex.name,
        order: order++,
        dayOfWeek: ex.dayOfWeek,
        sets: ex.sets,
        reps: ex.reps,
      });
    }
    await fullSync();
    toast.success('Protocolo Upper/Lower importado!');
  } catch (err) {
    console.error(err);
    toast.error('Erro ao importar protocolo Upper/Lower.');
  }
}
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import Layout from '../components/Layout';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

import { Moon, Zap, Target, TrendingUp, ChevronDown, ChevronUp, Database } from "lucide-react"
import { PageHeader } from '../components/PageHeader';
import { createProtocol, addExercise } from '../services/workoutDB';
import { fullSync } from '../services/syncService';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { logout, weeklyGoal, setWeeklyGoal, user } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();

  async function handleImportProtocol() {
    if (!user) return;
    try {
      const protocolId = await createProtocol({
        name: "Protocolo 5 Dias - Gabriel",
        userId: user.id,
        isEnabled: false,
        daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri']
      });

      const schedule = [
        { 
          day: 'Seg', 
          exs: [
            { name: 'Supino reto barra', weight: 20 },
            { name: 'Remada curvada barra', weight: 10 },
            { name: 'Desenvolvimento halteres', weight: 14 },
            { name: 'Remada unilateral', weight: 14 },
            { name: 'Elevação lateral', weight: 0 },
            { name: 'Rosca direta barra', weight: 10 },
            { name: 'Tríceps pulley', weight: 20 }
          ]
        },
        { 
          day: 'Ter', 
          exs: [
            { name: 'Agachamento livre/guiado', weight: 40 },
            { name: 'Leg press', weight: 80 },
            { name: 'Stiff', weight: 12 },
            { name: 'Elevação pélvica', weight: 25 },
            { name: 'Mesa flexora', weight: 35 },
            { name: 'Panturrilha em pé', weight: 12 },
            { name: 'Abdominal prancha', weight: 0 }
          ]
        },
        { 
          day: 'Qua', 
          exs: [
            { name: 'Supino inclinado halteres', weight: 20 },
            { name: 'Puxada frontal', weight: 40 },
            { name: 'Desenvolvimento máquina', weight: 20 },
            { name: 'Voador', weight: 45 },
            { name: 'Elevação lateral', weight: 0 },
            { name: 'Rosca alternada', weight: 12 },
            { name: 'Tríceps francês', weight: 12 }
          ]
        },
        { 
          day: 'Qui', 
          exs: [
            { name: 'Hack squat', weight: 60 },
            { name: 'Afundo búlgaro', weight: 0 },
            { name: 'Mesa flexora', weight: 35 },
            { name: 'Glúteo máquina', weight: 0 },
            { name: 'Panturrilha sentado', weight: 40 },
            { name: 'Abdominal cabo', weight: 0 }
          ]
        },
        { 
          day: 'Sex', 
          exs: [
            { name: 'Afundo caminhando', weight: 0 },
            { name: 'Supino halteres', weight: 20 },
            { name: 'Remada com halteres', weight: 14 },
            { name: 'Desenvolvimento militar', weight: 14 },
            { name: 'Face pull', weight: 0 },
            { name: 'Glúteo kickback', weight: 0 },
            { name: 'Panturrilha em pé', weight: 12 },
            { name: 'Prancha lateral', weight: 0 }
          ]
        }
      ];

      for (const dayData of schedule) {
        for (let i = 0; i < dayData.exs.length; i++) {
          const ex = dayData.exs[i];
          await addExercise({
            protocolId,
            name: `${ex.name} (${dayData.day})`,
            order: i,
            lastWeight: ex.weight
          });
        }
      }

      await fullSync();
      toast.success('Protocolo importado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao importar protocolo.');
    }
  }



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

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
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

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <header className="px-1 group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Database className="w-3.5 h-3.5 text-primary" />
              Ferramentas Temporárias
            </h3>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Importar Gabriel A-E</span>
                      <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Protocolo 5 dias completo</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleImportProtocol}
                    className="w-full rounded-xl h-12 font-black uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    Importar 5 Dias
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Ferramenta: Upper/Lower</span>
                      <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Protocolo sexta e sábado</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => handleImportUpperLowerProtocol(user, toast)}
                    className="w-full rounded-xl h-12 font-black uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    Importar Upper/Lower
                  </Button>
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
