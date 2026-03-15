import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { 
  db, 
  getExercisesByProtocol, 
  startWorkout, 
  addWorkoutSet 
} from '../services/workoutDB';
import { syncData } from '../services/syncService';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  Save,
  ChevronDown,
  ChevronUp
} from "lucide-react"

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface WorkoutExercise {
  id: string;
  name: string;
  order: number;
  lastWeight?: number;
  sets: number;
  completedSets: boolean[];
  setsData: { weight: string; reps: string }[];
}

export default function WorkoutPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [protocolName, setProtocolName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  useEffect(() => {
    async function loadWorkoutData() {
      if (!user || !protocolId) return;
      try {
        const protocol = await db.protocols.get(protocolId);
        if (!protocol) {
          toast.error('Protocolo não encontrado.');
          navigate('/');
          return;
        }
        setProtocolName(protocol.name);

        const allExercises = await getExercisesByProtocol(protocolId);
        let dayLabel = selectedDay;
        if (!dayLabel) {
          dayLabel = WEEK_DAYS[new Date().getDay()];
        }

        // Filter exercises for selected day and initialize set state
        const dayExercises = allExercises
          .filter(ex => ex.name.includes(`(${dayLabel})`))
          .map(ex => {
            const setNum = (ex as any).sets || 3;
            return {
              ...ex,
              sets: setNum,
              completedSets: new Array(setNum).fill(false),
              setsData: new Array(setNum).fill(null).map(() => ({ 
                weight: String(ex.lastWeight || 0), 
                reps: '10' 
              }))
            };
          });

        setExercises(dayExercises);
        if (dayExercises.length > 0) {
          setExpandedExercise(dayExercises[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar treino.');
      } finally {
        setLoading(false);
      }
    }
    loadWorkoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, protocolId, selectedDay, navigate]);

  const handleSetToggle = (exIdx: number, setIdx: number) => {
    const newExercises = [...exercises];
    const isNowCompleted = !newExercises[exIdx].completedSets[setIdx];
    newExercises[exIdx].completedSets[setIdx] = isNowCompleted;
    setExercises(newExercises);
  };

  const updateSetData = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    const newExercises = [...exercises];
    newExercises[exIdx].setsData[setIdx][field] = value;
    setExercises(newExercises);
  };

  const finishWorkout = async () => {
    if (!user || !protocolId) return;
    
    const totalCompleted = exercises.reduce((acc, ex) => 
      acc + ex.completedSets.filter(Boolean).length, 0);
    
    if (totalCompleted === 0) {
      toast.error('Complete pelo menos uma série antes de finalizar.');
      return;
    }

    try {
      const workoutId = await startWorkout({
        userId: user.id,
        protocolId,
      });

      for (const ex of exercises) {
        for (let i = 0; i < ex.sets; i++) {
          if (ex.completedSets[i]) {
            await addWorkoutSet({
              workoutId,
              exerciseId: ex.id,
              weight: Number(ex.setsData[i].weight),
              reps: Number(ex.setsData[i].reps),
              completed: true,
            });
          }
        }
        // Update baseline weight for next time
        const maxWeight = Math.max(...ex.setsData.map(s => Number(s.weight)));
        if (maxWeight > 0) {
          await db.exercises.update(ex.id, { lastWeight: maxWeight });
        }
      }

      await syncData();
      toast.success('Treino finalizado e salvo!');
      navigate('/history');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar treino.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 pb-40">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div>
              <h2 className="text-xl font-black uppercase text-foreground leading-none">{protocolName}</h2>
              <p className="text-[10px] text-primary font-mono uppercase tracking-wider mt-1">Sessão Ativa</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-muted-foreground">Dia:</span>
            {WEEK_DAYS.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={selectedDay === d ? 'default' : 'outline'}
                className="px-2 py-1 text-xs"
                onClick={() => setSelectedDay(d)}
              >
                {d}
              </Button>
            ))}
            <Button
              size="sm"
              variant={!selectedDay ? 'default' : 'outline'}
              className="px-2 py-1 text-xs"
              onClick={() => setSelectedDay(null)}
            >
              Hoje
            </Button>
          </div>
        </header>

        <div className="space-y-4">
          {exercises.map((ex, exIdx) => (
            <Card 
              key={ex.id} 
              className={`rounded-2xl border transition-all duration-300 ${
                expandedExercise === ex.id ? 'border-primary ring-1 ring-primary/20 bg-card shadow-md' : 'border-border opacity-100 bg-card'
              }`}
            >
              <header 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${
                    ex.completedSets.every(Boolean) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {exIdx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm uppercase tracking-tight truncate pr-4">{ex.name.split(' (')[0]}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-90">
                        {ex.completedSets.filter(Boolean).length} / {ex.sets} séries
                      </p>
                      {ex.lastWeight && ex.lastWeight > 0 && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Ant: {ex.lastWeight}kg</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {expandedExercise === ex.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </header>

              {expandedExercise === ex.id && (
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="grid grid-cols-[1fr_2fr_2fr_1fr] gap-2 px-2 text-[8px] font-black text-muted-foreground uppercase tracking-wider opacity-70">
                    <span>Série</span>
                    <span className="text-center">Carga (kg)</span>
                    <span className="text-center">Reps</span>
                    <span className="text-right">Ok</span>
                  </div>
                  {ex.completedSets.map((isDone, setIdx) => (
                    <div 
                      key={setIdx} 
                      className={`grid grid-cols-[1fr_2fr_2fr_1fr] items-center gap-2 p-2 rounded-xl transition-colors ${
                        isDone ? 'bg-primary/10' : 'bg-muted'
                      }`}
                    >
                       <span className="text-sm font-black text-muted-foreground/80 tabular-nums">#{setIdx + 1}</span>
                      <input 
                        type="number"
                        className="bg-background border border-border/50 rounded-lg h-9 text-center font-black text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                        value={ex.setsData[setIdx].weight}
                        onChange={(e) => updateSetData(exIdx, setIdx, 'weight', e.target.value)}
                      />
                      <input 
                        type="number"
                        className="bg-background border border-border/50 rounded-lg h-9 text-center font-black text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                        value={ex.setsData[setIdx].reps}
                        onChange={(e) => updateSetData(exIdx, setIdx, 'reps', e.target.value)}
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleSetToggle(exIdx, setIdx)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                            isDone ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110' : 'bg-background border border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 opacity-20" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Action Button */}
        <div className="fixed bottom-24 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-[60]">
          <div className="max-w-xl mx-auto">
            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-wider shadow-2xl shadow-primary/30 gap-3"
              onClick={finishWorkout}
            >
              <Save className="w-5 h-5" /> Finalizar Treino
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
