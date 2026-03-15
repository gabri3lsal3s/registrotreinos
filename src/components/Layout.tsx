import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Início', icon: '🏠' },
    { path: '/protocols', label: 'Treinos', icon: '🏋️' },
    { path: '/analysis', label: 'Análise', icon: '📊' },
    { path: '/history', label: 'Histórico', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1c1f26]">
        <h1 className="text-xl font-bold text-neonBlue tracking-tight">TREINOS.<span className="text-limeGreen">IA</span></h1>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Sair</button>
      </header>
      
      <main className="max-w-4xl mx-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1c1f26] border-t border-gray-800 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all ${
              location.pathname === item.path ? 'text-neonBlue scale-110' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
