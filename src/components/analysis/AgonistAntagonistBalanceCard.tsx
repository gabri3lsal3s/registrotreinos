import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { MuscleBreakdownItem } from '../../types';

interface AgonistAntagonistBalanceCardProps {
  muscleBreakdown: MuscleBreakdownItem[];
}

interface MusclePair {
  name: string;
  groupA: { name: string; muscles: string[] };
  groupB: { name: string; muscles: string[] };
  idealRatio: string; // Ex: '1:1'
}

const PAIRS: MusclePair[] = [
  {
    name: 'Empurrar vs Puxar (Push / Pull)',
    groupA: { name: 'Empurrar (Peito/Ombro/Tríceps)', muscles: ['Peito', 'Ombros', 'Tríceps'] },
    groupB: { name: 'Puxar (Costas/Bíceps)', muscles: ['Costas', 'Bíceps'] },
    idealRatio: '1:1'
  },
  {
    name: 'Membros Inferiores (Anterior vs Posterior)',
    groupA: { name: 'Quadríceps (Anterior)', muscles: ['Pernas', 'Quadríceps'] },
    groupB: { name: 'Posterior / Glúteo', muscles: ['Posteriores', 'Glúteos'] },
    idealRatio: '1:1'
  },
  {
    name: 'Braços (Bíceps vs Tríceps)',
    groupA: { name: 'Bíceps (Flexores)', muscles: ['Bíceps'] },
    groupB: { name: 'Tríceps (Extensores)', muscles: ['Tríceps'] },
    idealRatio: '1:1'
  }
];

export function AgonistAntagonistBalanceCard({ muscleBreakdown }: AgonistAntagonistBalanceCardProps) {
  const muscleVolumeMap = useMemo(() => {
    const map = new Map<string, number>();
    muscleBreakdown.forEach((item) => {
      map.set(item.name.toLowerCase(), item.value);
    });
    return map;
  }, [muscleBreakdown]);

  const pairMetrics = useMemo(() => {
    return PAIRS.map((pair) => {
      const volA = pair.groupA.muscles.reduce(
        (acc, m) => acc + (muscleVolumeMap.get(m.toLowerCase()) || 0),
        0
      );
      const volB = pair.groupB.muscles.reduce(
        (acc, m) => acc + (muscleVolumeMap.get(m.toLowerCase()) || 0),
        0
      );

      const total = volA + volB;
      const pctA = total > 0 ? Math.round((volA / total) * 100) : 50;
      const pctB = total > 0 ? 100 - pctA : 50;
      
      const ratio = volB > 0 ? volA / volB : volA > 0 ? 2 : 1;
      const isBalanced = total === 0 || (ratio >= 0.75 && ratio <= 1.35);

      return {
        ...pair,
        volA,
        volB,
        total,
        pctA,
        pctB,
        ratio: Math.round(ratio * 10) / 10,
        isBalanced
      };
    });
  }, [muscleVolumeMap]);

  return (
    <Card className="rounded-2xl border-border/60 bg-card">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
              Balanço Agonista / Antagonista
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Equilíbrio de volume para saúde articular e postura
            </p>
          </div>
        </div>

        {/* Lista de Pares Comparativos */}
        <div className="space-y-3.5 pt-1">
          {pairMetrics.map((pair, idx) => (
            <div key={idx} className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-foreground leading-snug">
                  {pair.name}
                </span>
                <div className="flex items-center shrink-0">
                  {pair.isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      <CheckCircle2 className="w-3 h-3" /> Equilibrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" /> Desbalanço sutil
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Distribuição de Volume */}
              <div className="space-y-1.5">
                <div className="h-2.5 sm:h-3 w-full bg-muted/60 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pair.pctA}%` }}
                    title={`${pair.groupA.name}: ${pair.pctA}%`}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${pair.pctB}%` }}
                    title={`${pair.groupB.name}: ${pair.pctB}%`}
                  />
                </div>

                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-[10px] sm:text-[11px] font-mono text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 inline-block" />
                    <span className="truncate">{pair.groupA.name.split(' (')[0]}:</span>
                    <strong className="text-foreground shrink-0">{pair.pctA}%</strong>
                    <span className="text-muted-foreground/70 shrink-0">({Math.round(pair.volA)}kg)</span>
                  </span>
                  <span className="flex items-center xs:justify-end gap-1.5 min-w-0 truncate">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 inline-block xs:hidden" />
                    <span className="truncate">{pair.groupB.name.split(' (')[0]}:</span>
                    <strong className="text-foreground shrink-0">{pair.pctB}%</strong>
                    <span className="text-muted-foreground/70 shrink-0">({Math.round(pair.volB)}kg)</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 hidden xs:inline-block" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

