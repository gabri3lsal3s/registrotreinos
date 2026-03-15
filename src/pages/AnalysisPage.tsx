import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalysisPage() {
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Simular busca de dados do WorkoutDB
    setTimeout(() => setDataLoaded(true), 500);
  }, []);

  const data = {
    labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    datasets: [
      {
        fill: true,
        label: 'Volume Total (kg)',
        data: [8500, 9200, 11000, 12450],
        borderColor: '#00F0FF', // neonBlue
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Evolução de Volume Semanal',
        color: '#FFF',
        font: { size: 16, weight: 'bold' }
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#666' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666' }
      }
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-neonBlue">Análise de Performance</h2>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#23262F] p-4 rounded-3xl border border-gray-800 shadow-xl">
            {dataLoaded ? <Line options={options as any} data={data} /> : <div className="h-40 flex items-center justify-center text-gray-500">Analizando...</div>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#23262F] p-4 rounded-2xl border border-gray-800 text-center">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Estimativa 1RM</span>
              <p className="text-2xl font-black text-limeGreen">114 <span className="text-xs font-normal">kg</span></p>
              <span className="text-[9px] text-gray-600 block">Supino Reto</span>
            </div>
            <div className="bg-[#23262F] p-4 rounded-2xl border border-gray-800 text-center">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Progresso Carga</span>
              <p className="text-2xl font-black text-neonBlue">+12%</p>
              <span className="text-[9px] text-gray-600 block">Últimos 30 dias</span>
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-neonBlue/20 to-limeGreen/20 border border-neonBlue/30 text-white font-bold py-5 rounded-3xl flex flex-col items-center justify-center gap-2 group hover:from-neonBlue/30 hover:to-limeGreen/30 transition-all">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonBlue to-limeGreen text-lg">Gerar Insights com IA</span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Análise avançada do seu processo evolutivo</p>
          </button>
        </div>
      </div>
    </Layout>
  );
}
