import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Play, Pause, Plus, Minus, X, Timer, Volume2 } from 'lucide-react';
import { playRestFinishedNotification, playBeep, triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';

interface FloatingRestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function FloatingRestTimer({
  initialSeconds = 90,
  isOpen,
  onClose,
  onComplete
}: FloatingRestTimerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <FloatingRestTimerModal
          key={`${isOpen}-${initialSeconds}`}
          initialSeconds={initialSeconds}
          onClose={onClose}
          onComplete={onComplete}
        />
      )}
    </AnimatePresence>
  );
}

function FloatingRestTimerModal({
  initialSeconds,
  onClose,
  onComplete
}: {
  initialSeconds: number;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  // Timestamp no qual o descanso terminará
  const [endTime, setEndTime] = useState(() => Date.now() + initialSeconds * 1000);

  // Contagem regressiva precisa baseada em timestamp delta (resiliente ao background/bloqueio)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = endTime - now;
      const left = Math.max(0, Math.ceil(diffMs / 1000));

      setRemainingSeconds(left);

      // Bipe curto nos últimos 3 segundos
      if (left <= 3 && left > 0) {
        playBeep(440, 0.05);
        triggerHaptic('light');
      }

      if (left <= 0) {
        clearInterval(interval);
        playRestFinishedNotification();
        if (onComplete) onComplete();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, endTime, onComplete]);

  const addTime = useCallback((seconds: number) => {
    triggerHaptic('light');
    if (seconds > 0) {
      playAudioCue('increment');
    } else {
      playAudioCue('decrement');
    }
    const next = Math.max(0, remainingSeconds + seconds);
    setRemainingSeconds(next);
    setEndTime(Date.now() + next * 1000);
    setTotalSeconds((tot) => Math.max(tot, next));
  }, [remainingSeconds]);

  const toggleRunning = useCallback(() => {
    triggerHaptic('light');
    playAudioCue('click');
    if (!isRunning) {
      setEndTime(Date.now() + remainingSeconds * 1000);
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isRunning, remainingSeconds]);

  const handleSelectPreset = useCallback((sec: number) => {
    triggerHaptic('medium');
    playAudioCue('click');
    const now = Date.now();
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
    setEndTime(now + sec * 1000);
    setIsRunning(true);
  }, []);

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 0;
  const isFinished = remainingSeconds === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm"
    >
      <div className={`relative overflow-hidden rounded-2xl border ${isFinished ? 'border-primary bg-primary/20 shadow-primary/20' : 'border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl'} p-3.5 shadow-2xl transition-all`}>
        {/* Barra de progresso de fundo */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="flex items-center justify-between gap-3">
          {/* Ícone e Tempo */}
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl flex items-center justify-center ${isFinished ? 'bg-primary text-primary-foreground animate-bounce' : 'bg-primary/10 text-primary'}`}>
              {isFinished ? <Volume2 className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                {isFinished ? 'Descanso Concluído!' : 'Tempo de Descanso'}
              </span>
              <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-tight">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Controles Rápidos */}
          <div className="flex items-center gap-1.5">
            {!isFinished && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addTime(-15)}
                  disabled={remainingSeconds <= 15}
                  className="h-9 px-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs font-bold active:scale-95"
                  title="Diminuir 15 segundos"
                >
                  <Minus className="w-3 h-3 mr-0.5" />15s
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addTime(30)}
                  className="h-9 px-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs font-bold active:scale-95"
                  title="Aumentar 30 segundos"
                >
                  <Plus className="w-3 h-3 mr-0.5" />30s
                </Button>

                <Button
                  type="button"
                  variant={isRunning ? 'secondary' : 'default'}
                  size="icon"
                  onClick={toggleRunning}
                  className="h-9 w-9 rounded-lg active:scale-90"
                  title={isRunning ? 'Pausar' : 'Retomar'}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-9 w-9 rounded-lg bg-muted/40 hover:bg-destructive/20 hover:text-destructive text-muted-foreground active:scale-90"
              title="Fechar timer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Presets Rápidos de 1-Toque */}
        {!isFinished && (
          <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-border/30 overflow-x-auto no-scrollbar">
            <span className="text-[9px] uppercase font-bold text-muted-foreground mr-0.5 shrink-0">
              Presets:
            </span>
            {[30, 45, 60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSelectPreset(sec)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 transition-all active:scale-95 ${
                  totalSeconds === sec && isRunning
                    ? 'bg-primary text-primary-foreground font-black shadow-xs'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
