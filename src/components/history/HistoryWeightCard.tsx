import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Scale, Edit2, Trash2, Check, X } from 'lucide-react';
import type { BodyWeight } from '../../types';
import { parseLocaleNumber } from '../../utils/workoutMath';

interface HistoryWeightCardProps {
  item: BodyWeight;
  onUpdateWeight: (id: string, newWeight: number) => void;
  onDeleteWeight: (id: string) => void;
}

export function HistoryWeightCard({
  item,
  onUpdateWeight,
  onDeleteWeight
}: HistoryWeightCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [weightValue, setWeightValue] = useState(String(item.weight));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const date = new Date(item.date);
  const formattedDate = date.toLocaleDateString('pt-BR', { 
    weekday: 'short', 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleSave = () => {
    const val = parseLocaleNumber(weightValue);
    if (val > 0) {
      onUpdateWeight(item.id, val);
      setIsEditing(false);
    }
  };

  return (
    <>
      <Card className="border-border/50 bg-card hover:border-border/80 transition-all rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          {/* Ícone e Data */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                Registro de Peso
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-xs text-foreground capitalize">
                  {formattedDate}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formattedTime}
                </span>
              </div>
            </div>
          </div>

          {/* Valor e Ações */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-18 h-9 text-center font-bold text-sm rounded-lg"
                  autoFocus
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleSave}
                  className="h-9 w-9 text-primary hover:bg-primary/10 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setWeightValue(String(item.weight));
                    setIsEditing(false);
                  }}
                  className="h-9 w-9 text-muted-foreground hover:bg-muted rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xl font-black font-mono text-foreground">
                  {item.weight.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                </span>
                <div className="flex items-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 text-muted-foreground/60 hover:text-foreground rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir pesagem?"
        description={`Deseja excluir o registro de peso de ${item.weight} kg realizado em ${formattedDate}?`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => onDeleteWeight(item.id)}
      />
    </>
  );
}
