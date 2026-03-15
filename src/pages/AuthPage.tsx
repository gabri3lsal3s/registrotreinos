import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, loginWithBiometrics, registerBiometry } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        await registerUser(email, password);
        // Após registrar, loga automaticamente ou pede biometria
        setMode('login');
        setError('Cadastro realizado! Faça login para continuar.');
      } else {
        const { user: loggedUser, token } = await loginUser(email, password);
        login(loggedUser, token);
        // Se o usuário não tiver biometria, podemos oferecer registrar
        if (!loggedUser.credentialId) {
          setShowBioPrompt(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const handleBiometric = async () => {
    setError('');
    try {
      const { user: bioUser, token } = await loginWithBiometrics();
      login(bioUser, token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro biométrico');
    }
  };

  const handleRegisterBio = async () => {
    if (!user) return;
    try {
      await registerBiometry(user.id);
      setShowBioPrompt(false);
      alert('Biometria cadastrada com sucesso!');
    } catch (err: unknown) {
      alert('Erro ao registrar biometria');
    }
  };

  if (showBioPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white p-4">
        <div className="bg-[#23262F] p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold mb-4 text-neonBlue">Biometria</h2>
          <p className="mb-6 opacity-80">Deseja cadastrar sua biometria para acessos futuros?</p>
          <div className="flex flex-col gap-3">
            <button onClick={handleRegisterBio} className="bg-limeGreen text-black font-bold py-2 rounded hover:brightness-110">
              Sim, cadastrar Agora
            </button>
            <button onClick={() => setShowBioPrompt(false)} className="bg-gray-600 text-white font-bold py-2 rounded">
              Pular por enquanto
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-4">
      <div className="bg-[#23262F] p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-neonBlue">
          {mode === 'login' ? 'Entrar' : 'Cadastrar'}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-mail"
            className="p-2 rounded bg-[#181A20] border border-[#333] focus:outline-neonBlue"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="p-2 rounded bg-[#181A20] border border-[#333] focus:outline-neonBlue"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button type="submit" className="bg-neonBlue text-black font-bold py-2 rounded hover:bg-limeGreen transition-colors">
            {mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
          <span className="relative px-2 bg-[#23262F] text-sm text-gray-500">OU</span>
        </div>

        <button onClick={handleBiometric} className="w-full bg-limeGreen text-black font-bold py-2 rounded hover:bg-neonBlue transition-colors flex items-center justify-center gap-2">
          <span>Entrar com biometria</span>
        </button>

        <div className="mt-6 text-center">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-neonBlue underline text-sm">
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
