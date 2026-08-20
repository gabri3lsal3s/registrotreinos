import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { triggerHaptic } from '../../utils/sensoryFeedback';
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

  const handleNavClick = () => {
    triggerHaptic('light');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* 1. Sidebar Desktop (Fixa na lateral esquerda em md/lg+) */}
      {showNav && (
        <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 border-r border-border/80 bg-background/95 backdrop-blur-xl z-40 p-5 justify-between select-none">
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

            {/* Menu Vertical de Navegação com Indicador Deslizante */}
            <nav className="space-y-1.5 pt-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-150 group relative ${
                      isActive
                        ? 'text-primary-foreground font-black'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavPillDesktop"
                        className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25 z-0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3 w-full">
                      <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Sidebar Desktop: Usuário, Tema e Logout */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            {/* Alternador de Tema */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsDarkMode(!isDarkMode);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all active:scale-[0.98] border border-border/40"
            >
              <span className="flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
                {isDarkMode ? 'Modo OLED' : 'Modo Claro'}
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
                onClick={() => {
                  triggerHaptic('medium');
                  setLogoutDialogOpen(true);
                }}
                className="h-9 w-9 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors active:scale-90"
                title="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Área de Conteúdo Principal com Transição Fluida de Página */}
      <main className={`flex-1 w-full transition-all duration-300 ${
        showNav ? 'md:pl-64 pb-36 md:pb-12' : 'pb-12'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Bottom Navigation Mobile com Indicador Deslizante */}
      {showNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-border/80 px-1.5 xs:px-3 py-1.5 z-50 safe-area-bottom">
          <div className="max-w-md mx-auto flex justify-between items-center gap-0.5 xs:gap-1 relative">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`min-w-0 relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl flex-1 transition-colors select-none ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPillMobile"
                      className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20 z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <div className="relative z-10 p-0.5 transition-transform duration-150 shrink-0">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-primary' : ''}`} />
                  </div>
                  <span className={`relative z-10 text-[9.5px] xs:text-[10.5px] font-bold uppercase tracking-tight text-center truncate max-w-full leading-tight mt-0.5 px-0.5 transition-opacity ${
                    isActive ? 'opacity-100 font-black text-primary' : 'opacity-70'
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
