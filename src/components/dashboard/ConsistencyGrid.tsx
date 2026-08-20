import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Flame } from 'lucide-react';
import { WEEK_DAYS } from '../../utils/constants';

interface ConsistencyGridProps {
  completedDayKeys: string[];
  weeklyGoal: number;
}

export function ConsistencyGrid({
  completedDayKeys,
  weeklyGoal
}: ConsistencyGridProps) {
  const completedCount = completedDayKeys.length;
  const progressPercent = weeklyGoal > 0 ? Math.min(100, Math.round((completedCount / weeklyGoal) * 100)) : 0;

  return (
    <Card className="border-border/50 bg-card rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground leading-tight">
              Consistência Semanal
            </h4>
            <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider">
              {completedCount} de {weeklyGoal} treinos concluídos
            </span>
          </div>
        </div>

        <span className="font-black font-mono text-sm text-primary">
          {progressPercent}%
        </span>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Grid de Dias da Semana */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {WEEK_DAYS.map((day) => {
          const isDone = completedDayKeys.includes(day.key);

          return (
            <div
              key={day.key}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                isDone
                  ? 'bg-primary/10 border-primary/40 text-primary font-bold'
                  : 'bg-muted/10 border-border/30 text-muted-foreground/50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase mb-1">
                {day.label}
              </span>
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 fill-primary/20" />
              ) : (
                <Circle className="w-4 h-4 stroke-[1.5]" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
