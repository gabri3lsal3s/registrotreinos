import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Check, Save } from 'lucide-react';
import { parseLocaleNumber } from '../../utils/workoutMath';

interface BodyWeightQuickCardProps {
  latestWeight: number | null;
  onSaveWeight: (weight: number) => Promise<void>;
}

export function BodyWeightQuickCard({
  latestWeight,
  onSaveWeight
}: BodyWeightQuickCardProps) {
  const [weightInput, setWeightInput] = useState(latestWeight ? String(latestWeight) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseLocaleNumber(weightInput);
    if (val <= 0) return;

    setIsSaving(true);
    try {
      await onSaveWeight(val);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch {
      // Ignora
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card rounded-3xl p-5 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground leading-tight">
              Peso Corporal
            </h4>
            <span className="text-xs text-muted-foreground font-mono">
              {latestWeight ? `Último registro: ${latestWeight.toFixed(1)} kg` : 'Nenhum registro ainda'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-28">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 78.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="h-11 rounded-xl text-center font-bold text-base bg-background border-border/50 pr-8"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
              KG
            </span>
          </div>

          <Button
            type="submit"
            disabled={isSaving || !weightInput.trim()}
            className={`h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              isSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {isSuccess ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Salvo!
              </>
            ) : isSaving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Registrar
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
