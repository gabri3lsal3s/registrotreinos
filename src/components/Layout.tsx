import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Dumbbell, ClipboardList, TrendingUp, Settings } from "lucide-react"

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/protocols', label: 'Treinos', icon: Dumbbell },
    { path: '/history', label: 'Histórico', icon: ClipboardList },
    { path: '/analysis', label: 'Análise', icon: TrendingUp },
    { path: '/settings', label: 'Configuração', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-40">
      <main className="max-w-5xl mx-auto px-5 pt-8 md:pt-12">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background/70 backdrop-blur-2xl border-t border-border/40 px-4 py-3 z-[100] safe-area-bottom">
        <div className="max-w-xl mx-auto flex justify-between items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 transition-all duration-300 group relative py-1 rounded-xl flex-1 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/5 rounded-xl -z-10" />
                )}
                <Icon className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${
                  isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(163,230,53,0.3)]' : 'group-hover:scale-110'
                } `} />
                <span className={`text-[clamp(10px,2vw,11px)] font-black uppercase tracking-wider transition-all leading-none mt-1 ${
                  isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
