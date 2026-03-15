import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import Layout from '../components/Layout';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Moon, Settings as SettingsIcon, Zap, Trash2 } from "lucide-react"
import { PageHeader } from '../components/PageHeader';
import { clearAllData, createProtocol, addExercise } from '../services/workoutDB';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const navigate = useNavigate();

  async function handleReset() {
    if (!user) return;
    if (!window.confirm('CUIDADO: Isso irá apagar PERMANENTEMENTE todos os seus protocolos e treinos realizados. Deseja continuar?')) {
      return;
    }

    try {
      await clearAllData(user.id);
      
      const todayIdx = new Date().getDay();
      const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const todayLabel = labels[todayIdx];

      // Add test protocol
      const protocolId = await createProtocol({
        userId: user.id,
        name: 'Protocolo de Teste',
      });

      const testExercises = [
        { name: 'Supino Reto', order: 0, lastWeight: 60 },
        { name: 'Agachamento Livre', order: 1, lastWeight: 80 },
        { name: 'Puxada Frente', order: 2, lastWeight: 50 },
      ];

      for (const ex of testExercises) {
        await addExercise({
          protocolId,
          ...ex,
          name: `${ex.name} (${todayLabel})`
        });
      }

      toast.success('Aplicativo resetado com sucesso!');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao resetar aplicativo.');
    }
  }

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
              Interface
            </h3>
          </header>
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
        </section>

        <section className="space-y-4">
          <header className="px-1 group">
            <h3 className="text-[clamp(10px,1.2vw,12px)] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-foreground transition-colors">
              <SettingsIcon className="w-3.5 h-3.5 text-primary" />
              Sistema
            </h3>
          </header>
          <Card className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden outline outline-1 outline-primary/5">
            <CardContent className="p-5">
              <div className="flex justify-between items-center group">
                <div className="space-y-1">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10 text-destructive">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-[clamp(11px,1.4vw,14px)] uppercase tracking-tight text-foreground">Limpar Tudo</span>
                      <p className="text-[clamp(9px,1.2vw,11px)] text-muted-foreground font-mono uppercase tracking-widest opacity-60 mt-0.5">Resetar dados e histórico</p>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                >
                  Resetar
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="pt-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-10"
            aria-label="Sair da conta"
          >
            <SettingsIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
            Encerrar Sessão
          </Button>
        </div>
      </div>
    </Layout>
  );
}
