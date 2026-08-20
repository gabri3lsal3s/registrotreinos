import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";
import { 
  registerUser, 
  loginUser, 
  ADMIN_TEST_USER 
} from '../services/authService';
import { fullSync } from '../services/syncService';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, Dumbbell } from "lucide-react";

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
        toast.success('Cadastro realizado com sucesso! Efetue login para continuar.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        const { user: loggedUser, token } = await loginUser(email, password);
        login(loggedUser, token);
        
        toast.promise(fullSync().catch(() => {}), {
          loading: 'Sincronizando seus dados...',
          success: 'Dados sincronizados!',
          error: 'Modo offline ativo.'
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na autenticação');
    }
  };

  const handleAdminTestLogin = () => {
    login(ADMIN_TEST_USER, 'test-admin-token-mock-123456');
    toast.success('Logado como Administrador de Teste!');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-sm border-border/50 bg-card rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pt-8 pb-4 space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
            <Dumbbell className="w-8 h-8" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-wider">
              {mode === 'login' ? 'Entrar na Conta' : 'Criar Nova Conta'}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium mt-1">
              Registro de Treinos • PWA Offline First
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6 pb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="seu.email@exemplo.com"
                className="h-11 rounded-xl"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-xl"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1 animate-in fade-in duration-300">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirmar Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-11 rounded-xl"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            
            {error && (
              <div className="text-destructive text-xs font-bold text-center py-2 px-3 rounded-xl bg-destructive/10 border border-destructive/20">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full h-12 rounded-xl mt-2 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
              {mode === 'login' ? 'Entrar' : 'Cadastrar'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Atalho rápido para teste */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAdminTestLogin}
              className="w-full h-11 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Entrar como Admin (Teste)
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/30 bg-muted/20 py-4">
          <Button 
            variant="link" 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
            className="text-muted-foreground text-xs font-bold hover:text-foreground h-auto p-0"
          >
            {mode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já possui uma conta? Entrar'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
