import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";
import { registerUser, loginUser, registerBiometry } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Fingerprint, Zap, ArrowRight, ShieldCheck } from "lucide-react"

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/') {
      navigate('/');
    }
  }, [isAuthenticated, navigate, location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        await registerUser(email, password);
        setMode('login');
        setError('Cadastro realizado. Efetue login.');
      } else {
        const { user: loggedUser, token } = await loginUser(email, password);
        login(loggedUser, token);
        setShowBioPrompt(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na autenticação');
    }
  };

  const handleRegisterBio = async () => {
    if (!user) return;
    try {
      await registerBiometry(user.id);
      setShowBioPrompt(false);
    } catch (err: unknown) {
      // Falha silenciosa ou log
    }
  };  if (showBioPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-[360px] border-border/50 bg-card rounded-3xl shadow-xl overflow-hidden outline outline-1 outline-primary/5 animate-in fade-in zoom-in duration-500">
          <CardHeader className="text-center pb-8 pt-10 border-b border-border/30">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl animate-pulse">
                <ShieldCheck className="w-7 h-7" />
              </div>
            </div>
            <CardTitle className="text-[clamp(16px,2vw,20px)] font-black text-foreground uppercase tracking-[0.2em]">
              Segurança
            </CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[clamp(9px,1vw,11px)] tracking-widest uppercase mt-3">
              Vincular biometria ao perfil?
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 flex flex-col gap-3 p-8">
            <Button onClick={handleRegisterBio} className="w-full">
              Sim, Ativar
            </Button>
            <Button variant="ghost" onClick={() => setShowBioPrompt(false)} className="w-full text-muted-foreground hover:text-foreground">
              Pular
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 selection:bg-primary/30">
      <Card className="w-full max-w-[360px] border-border/50 bg-card rounded-[2rem] shadow-2xl overflow-hidden outline outline-1 outline-primary/5 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <header className="bg-primary p-1.5 text-[clamp(8px,0.8vw,10px)] font-black text-primary-foreground text-center uppercase tracking-[0.5em] border-b border-primary/20">
          CORE_LOG SESSÃO SEGURA
        </header>
        <CardHeader className="text-center pt-10 pb-8">
          <div className="flex justify-center mb-5">
             <div className="p-4 bg-primary shadow-lg shadow-primary/20 text-primary-foreground rounded-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
               <Zap className="w-7 h-7" />
             </div>
          </div>
          <CardTitle className="text-[clamp(20px,2.5vw,24px)] font-black text-foreground tracking-[0.2em] uppercase leading-none">
            {mode === 'login' ? 'Acesso' : 'Registro'}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[clamp(9px,1vw,11px)] tracking-[0.3em] uppercase mt-4 opacity-60">
            PERFORMANCE CONTROL
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5 px-8 pb-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="E-MAIL"
                className="bg-muted/10 border-none focus-visible:ring-primary h-12 font-black uppercase text-[clamp(10px,1.2vw,12px)] rounded-xl px-5 tracking-widest placeholder:opacity-30 transition-all outline outline-1 outline-border/20 focus-visible:outline-primary/40"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="SENHA"
                className="bg-muted/10 border-none focus-visible:ring-primary h-12 font-black uppercase text-[clamp(10px,1.2vw,12px)] rounded-xl px-5 tracking-widest placeholder:opacity-30 transition-all outline outline-1 outline-border/20 focus-visible:outline-primary/40"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div className="text-destructive text-[clamp(9px,1vw,11px)] font-black text-center uppercase tracking-[0.1em] mt-1 bg-destructive/5 py-3 rounded-xl border border-destructive/10">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full mt-2">
              {mode === 'login' ? 'Acessar' : 'Criar Conta'}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/20"></div>
            </div>
            <span className="relative px-4 bg-card text-[clamp(9px,1vw,11px)] text-muted-foreground/30 font-black tracking-[0.3em] left-1/2 -translate-x-1/2 uppercase leading-none">
              OU
            </span>
          </div>

          <Button 
            variant="outline" 
            onClick={() => toast.info('Integração em nuvem pendente.')} 
            className="w-full border-none outline outline-1 outline-border/20 bg-muted/5 text-muted-foreground hover:bg-primary/5 hover:text-primary gap-3"
          >
            <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Biometria Local
          </Button>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/10 bg-muted/5 py-5">
          <Button variant="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-muted-foreground/50 text-[clamp(9px,1vw,11px)] font-black uppercase tracking-[0.15em] hover:text-primary transition-colors h-auto p-0">
            {mode === 'login' ? 'Não tem perfil? Criar agora' : 'Já tem perfil? Acessar'}
          </Button>
        </CardFooter>
      </Card>
      
      <footer className="mt-10 flex items-center gap-4 group cursor-default">
        <div className="w-2 h-2 bg-primary rounded-full group-hover:animate-ping"></div>
        <p className="text-[clamp(9px,1vw,11px)] text-muted-foreground/30 font-mono uppercase tracking-[0.3em] font-black">
          CORE_ENGINE: <span className="text-foreground/30 tracking-normal font-bold">v1.5.0-STABLE</span>
        </p>
      </footer>
    </div>
  );
}
