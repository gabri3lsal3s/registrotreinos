import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Dumbbell, 
  ClipboardList, 
  TrendingUp, 
  Settings, 
  Moon, 
  Sun, 
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../services/authStore';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmDialog } from './ConfirmDialog';

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { syncStatus } = useAuthStore();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isConnected = isOnline && syncStatus !== 'error';

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/protocols', label: 'Treinos', icon: Dumbbell },
    { path: '/history', label: 'Histórico', icon: ClipboardList },
    { path: '/analysis', label: 'Análises', icon: TrendingUp },
    { path: '/settings', label: 'Ajustes', icon: Settings },
  ];

  const isWorkoutPage = location.pathname.startsWith('/workout');
  const showNav = !isWorkoutPage;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* 1. Sidebar Desktop (Fixa na lateral esquerda em md/lg+) */}
      {showNav && (
        <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 border-r border-border/50 bg-card/60 backdrop-blur-xl z-40 p-5 justify-between select-none">
          {/* Topo: Logo & Status Confiável */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-sm uppercase tracking-wider text-foreground leading-tight truncate">
                  Registro Treinos
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {syncStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="w-2.5 h-2.5 text-primary animate-spin" />
                      <span className="text-[10px] font-mono font-bold text-primary uppercase">
                        Sincronizando
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-amber-500'}`} />
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                        {isConnected ? 'Online' : 'Offline'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Vertical de Navegação */}
            <nav className="space-y-1.5 pt-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-black'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Sidebar Desktop: Usuário, Tema e Logout */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            {/* Alternador de Tema */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all"
            >
              <span className="flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
                {isDarkMode ? 'Modo Escuro' : 'Modo Claro'}
              </span>
              <span className="text-[10px] font-mono uppercase opacity-60">Alternar</span>
            </button>

            {/* Informações do Usuário & Logout */}
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block leading-none">
                  Conta
                </span>
                <span className="font-mono text-xs font-bold text-foreground truncate block mt-0.5 max-w-[130px]">
                  {user?.email || 'Usuário'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setLogoutDialogOpen(true)}
                className="h-9 w-9 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                title="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Área de Conteúdo Principal */}
      <main className={`flex-1 w-full transition-all duration-300 ${
        showNav ? 'md:pl-64 pb-36 md:pb-12' : 'pb-12'
      }`}>
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          {children}
        </div>
      </main>

      {/* 3. Bottom Navigation Mobile (Apenas em telas pequenas < md) */}
      {showNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-border/40 px-3 py-2.5 z-50 safe-area-bottom">
          <div className="max-w-md mx-auto flex justify-between items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 py-1 rounded-xl flex-1 transition-all duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-all leading-none ${
                    isActive ? 'opacity-100 font-black' : 'opacity-60'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Confirmação de Logout */}
      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Encerrar sessão?"
        description="Deseja realmente sair da sua conta? Todos os dados locais sincronizados permanecerão salvos na nuvem."
        confirmLabel="Sair da Conta"
        variant="destructive"
        onConfirm={logout}
      />
    </div>
  );
}

export default Layout;
