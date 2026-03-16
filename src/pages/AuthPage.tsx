import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";
import { 
  registerUser, 
  loginUser 
} from '../services/authService';
import { fullSync } from '../services/syncService';
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
import { ArrowRight as ArrowRightIcon } from "lucide-react"



export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
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

    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      if (mode === 'register') {
        await registerUser(email, password);
        setMode('login');
        setError('Cadastro realizado. Efetue login.');
      } else {
        const { user: loggedUser, token } = await loginUser(email, password);
        login(loggedUser, token);
        
        // Sync completo após login
        toast.promise(fullSync(), {
          loading: 'Sincronizando seus dados...',
          success: 'Dados sincronizados!',
          error: 'Erro na sincronização.'
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na autenticação');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 selection:bg-primary/30">
      <Card className="w-full max-w-[360px] border-border/50 bg-card rounded-[2rem] shadow-2xl overflow-hidden outline outline-1 outline-primary/5 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-700 ease-out">
        <CardHeader className="text-center pt-10 pb-8">
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 bg-white shadow-xl shadow-black/5 rounded-[2rem] flex items-center justify-center overflow-hidden border border-border/5">
               <img src="/logo.png" alt="Performance Control Logo" className="w-12 h-12 object-contain" />
             </div>
          </div>
          <CardTitle 
            key={`${mode}-title`}
            className="text-[clamp(20px,2.5vw,24px)] font-black text-foreground tracking-[0.2em] uppercase leading-none animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {mode === 'login' ? 'Acesso' : 'Registro'}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[clamp(9px,1vw,11px)] tracking-[0.3em] uppercase mt-4 opacity-60">
            PERFORMANCE CONTROL
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5 px-8 pb-8">
          <form 
            key={`${mode}-form`}
            onSubmit={handleSubmit} 
            className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="E-MAIL"
                className="focus-visible:ring-primary h-12 rounded-xl px-5 text-center"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="SENHA"
                className="focus-visible:ring-primary h-12 rounded-xl px-5 text-center"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Input
                  type="password"
                  placeholder="CONFIRMAR SENHA"
                  className="focus-visible:ring-primary h-12 rounded-xl px-5 text-center"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            
            {error && (
              <div className="text-destructive text-[clamp(9px,1vw,11px)] font-black text-center uppercase tracking-[0.1em] mt-1 bg-destructive/5 py-3 rounded-xl border border-destructive/10">
                {error}
              </div>
            )}
            
            <div>
              <Button type="submit" className="w-full mt-2 group">
              {mode === 'login' ? 'Acessar' : 'Criar Conta'}
              <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/10 bg-muted/5 py-5">
          <Button 
            key={`${mode}-toggle`}
            variant="link" 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
            className="text-muted-foreground/50 text-[clamp(9px,1vw,11px)] font-black uppercase tracking-[0.15em] hover:text-primary transition-colors h-auto p-0 animate-in fade-in duration-500"
          >
            {mode === 'login' ? 'Não tem perfil? Criar agora' : 'Já tem perfil? Acessar'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
