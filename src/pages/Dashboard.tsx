import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { syncData } from '../services/syncService';
import { useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  async function handleSync() {
    setSyncStatus('syncing');
    try {
      await syncData();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-1">Olá, <span className="text-limeGreen">{user?.email.split('@')[0]}</span></h2>
            <p className="text-gray-400">Pronto para a evolução de hoje?</p>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className={`p-3 rounded-2xl border transition-all ${
              syncStatus === 'syncing' ? 'bg-gray-800 animate-pulse border-gray-700' : 
              syncStatus === 'success' ? 'bg-limeGreen/20 border-limeGreen text-limeGreen font-bold' :
              syncStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' :
              'bg-[#23262F] border-gray-800 hover:border-neonBlue'
            }`}
          >
            {syncStatus === 'syncing' ? '⌛' : syncStatus === 'success' ? '✅' : syncStatus === 'error' ? '❌' : '☁️'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#23262F] p-5 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neonBlue/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-neonBlue/10 transition-all"></div>
            <h3 className="text-lg font-bold text-neonBlue mb-2">Próximo Treino</h3>
            <p className="text-2xl font-black mb-4">A - Peito & Tríceps</p>
            <button 
              onClick={() => navigate('/protocols')}
              className="w-full bg-neonBlue text-black font-bold py-3 rounded-xl hover:bg-limeGreen transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Escolher Treino
            </button>
          </div>

          <div className="bg-[#23262F] p-5 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-limeGreen mb-2">Seus Ganhos</h3>
              <p className="text-sm text-gray-400 mb-4">Volume total essa semana</p>
            </div>
            <div className="text-4xl font-black">12.450 <span className="text-sm font-normal text-gray-500">kg</span></div>
          </div>
        </div>

        <section className="mt-10 text-center py-10 border-2 border-dashed border-gray-800 rounded-3xl">
          <div className="text-4xl mb-4">📈</div>
          <h4 className="text-lg font-bold mb-2 text-gray-300">Nenhum dado recente</h4>
          <p className="text-gray-500 text-sm max-w-[200px] mx-auto">Comece um treino para visualizar sua progressão via IA.</p>
        </section>
      </div>
    </Layout>
  );
}
