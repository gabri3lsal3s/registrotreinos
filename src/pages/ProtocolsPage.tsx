import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { getProtocolsByUser, createProtocol, type Protocol } from '../services/workoutDB';

export default function ProtocolsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [newProtocolName, setNewProtocolName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProtocols();
    }
  }, [user]);

  async function loadProtocols() {
    if (!user) return;
    try {
      const data = await getProtocolsByUser(user.id);
      setProtocols(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProtocol(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newProtocolName.trim()) return;
    
    try {
      await createProtocol({
        userId: user.id,
        name: newProtocolName.trim(),
      });
      setNewProtocolName('');
      loadProtocols();
    } catch (err) {
      alert('Erro ao criar protocolo');
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-neonBlue">Meus Protocolos</h2>

        <form onSubmit={handleCreateProtocol} className="mb-8 flex gap-2">
          <input
            type="text"
            placeholder="Novo Protocolo (ex: ABC 2.0)"
            className="flex-1 bg-[#23262F] border border-gray-800 p-3 rounded-xl focus:outline-neonBlue"
            value={newProtocolName}
            onChange={(e) => setNewProtocolName(e.target.value)}
          />
          <button type="submit" className="bg-limeGreen text-black font-bold px-6 rounded-xl hover:brightness-110 transition-all">
            Adicionar
          </button>
        </form>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Carregando...</div>
        ) : protocols.length === 0 ? (
          <div className="text-center py-20 bg-[#23262F]/50 rounded-3xl border border-dashed border-gray-800">
            <p className="text-gray-400">Você ainda não tem protocolos criados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {protocols.map((protocol) => (
              <div 
                key={protocol.id} 
                className="bg-[#23262F] p-5 rounded-2xl border border-gray-800 flex justify-between items-center group hover:border-neonBlue transition-all cursor-pointer"
                onClick={() => navigate(`/protocols/${protocol.id}`)}
              >
                <div>
                  <h3 className="font-bold text-lg">{protocol.name}</h3>
                  <p className="text-sm text-gray-500">Criado em {new Date(protocol.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-neonBlue opacity-0 group-hover:opacity-100 transition-all">
                  Ver Exercícios →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
