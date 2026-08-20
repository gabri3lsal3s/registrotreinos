import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BAR_OPTIONS, 
  calculatePlates, 
  PLATE_STYLES, 
  DEFAULT_PLATES 
} from '../../utils/plateCalculator';
import { triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';
import { Scale, Check, AlertCircle } from 'lucide-react';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight: number;
  onApplyWeight: (weight: number) => void;
}

export function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeight,
  onApplyWeight
}: PlateCalculatorModalProps) {
  const [selectedBar, setSelectedBar] = useState(20);
  const [targetWeight, setTargetWeight] = useState(initialWeight || 60);

  const result = calculatePlates(targetWeight, selectedBar, DEFAULT_PLATES);

  const handleAdjustWeight = (delta: number) => {
    triggerHaptic('light');
    if (delta > 0) playAudioCue('increment');
    else playAudioCue('decrement');
    setTargetWeight((prev) => Math.max(selectedBar, Math.round((prev + delta) * 10) / 10));
  };

  const handleSelectBar = (weight: number) => {
    triggerHaptic('medium');
    playAudioCue('click');
    setSelectedBar(weight);
    if (targetWeight < weight) {
      setTargetWeight(weight);
    }
  };

  const handleApply = () => {
    triggerHaptic('success');
    playAudioCue('set_complete');
    onApplyWeight(result.achievedWeight);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[94vw] max-h-[90vh] flex flex-col p-5 sm:p-6 rounded-3xl bg-card border-border/70 shadow-2xl overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground">
                Calculadora de Anilhas
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Distribuição exata para montagem de barra por lado
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-3">
          {/* 1. Escolha do Tipo de Barra */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Tipo de Barra / Base
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {BAR_OPTIONS.map((bar) => (
                <button
                  key={bar.id}
                  type="button"
                  onClick={() => handleSelectBar(bar.weight)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-left flex flex-col ${
                    selectedBar === bar.weight
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className="truncate">{bar.name.split(' (')[0]}</span>
                  <span className="font-mono text-[10px] opacity-80">{bar.weight}kg</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Carga Alvo & Ajustes Rápidos */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Carga Total Desejada (kg)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min={selectedBar}
                value={targetWeight}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || selectedBar)}
                onFocus={(e) => e.target.select()}
                className="h-12 text-center text-xl font-black font-mono rounded-xl bg-background border-border/60 focus-visible:ring-primary"
              />
            </div>
            {/* Botoeira de Micro-incrementos de Carga */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[-10, -5, -2.5, 2.5, 5, 10].map((delta) => (
                <motion.button
                  key={delta}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => handleAdjustWeight(delta)}
                  className="flex-1 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-mono font-bold text-muted-foreground hover:text-foreground border border-border/30 transition-colors"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 3. Visualização Esquemática da Barra Carregada */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Por Lado da Barra:
              </span>
              <span className="text-sm font-black font-mono text-primary">
                {result.weightPerSide} kg
              </span>
            </div>

            {/* Representação Gráfica da Barra */}
            <div className="h-28 bg-card rounded-xl border border-border/50 flex items-center justify-center p-3 overflow-x-auto relative">
              {/* Eixo Central da Barra */}
              <div className="absolute h-3 bg-zinc-400 dark:bg-zinc-600 rounded-full w-[90%] z-0" />
              
              {/* Batente / Colarinho */}
              <div className="h-14 w-3.5 bg-zinc-500 dark:bg-zinc-400 rounded-sm z-10 mr-1 shadow-sm shrink-0" />

              {/* Pilha de Anilhas (da mais pesada para a mais leve) */}
              <div className="flex items-center gap-1 z-10 overflow-x-auto py-1">
                {result.platesPerSide.length === 0 ? (
                  <span className="text-xs font-mono text-muted-foreground italic px-3">
                    Barra vazia (0 anilhas)
                  </span>
                ) : (
                  result.platesPerSide.map((plateWeight, idx) => {
                    const style = PLATE_STYLES[plateWeight] || {
                      bg: 'bg-primary',
                      border: 'border-primary',
                      text: 'text-primary-foreground',
                      heightClass: 'h-16'
                    };
                    return (
                      <motion.div
                        key={`${plateWeight}-${idx}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`w-7 sm:w-8 ${style.heightClass} ${style.bg} ${style.border} ${style.text} border-2 rounded-md flex flex-col items-center justify-center shrink-0 shadow-md`}
                        title={`${plateWeight}kg`}
                      >
                        <span className="text-[10px] font-mono font-black leading-none select-none">
                          {plateWeight}
                        </span>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detalhamento Textual das Anilhas */}
            {result.platesPerSide.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from(new Set(result.platesPerSide)).map((w) => {
                  const count = result.platesPerSide.filter((p) => p === w).length;
                  return (
                    <span
                      key={w}
                      className="px-2.5 py-1 rounded-lg bg-card border border-border/60 text-xs font-mono font-bold text-foreground flex items-center gap-1"
                    >
                      <span className="text-primary font-black">{count}x</span> {w}kg
                    </span>
                  );
                })}
              </div>
            )}

            {/* Alerta de Resto / Impossibilidade de Fechar o Peso Exato */}
            {result.remainder > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Diferença de {result.remainder}kg não atingível com as anilhas disponíveis. Carga mais próxima: {result.achievedWeight}kg.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border-border/60 font-bold"
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
          >
            <Check className="w-4 h-4" />
            Aplicar Carga ({result.achievedWeight}kg)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
