import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, Plus, Minus, RotateCcw, Timer, Volume2, Save } from 'lucide-react';
import { playRestFinishedNotification, playBeep, triggerHaptic, playAudioCue } from '../../utils/sensoryFeedback';

interface WorkoutBottomDockProps {
  totalCompletedSets: number;
  onOpenFinishModal: () => void;
  defaultSeconds?: number;
  timerTrigger?: number;
  onTimerComplete?: () => void;
}

export function WorkoutBottomDock({
  totalCompletedSets,
  onOpenFinishModal,
  defaultSeconds = 90,
  timerTrigger,
  onTimerComplete
}: WorkoutBottomDockProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState(() => Date.now() + defaultSeconds * 1000);

  const onTimerCompleteRef = useRef(onTimerComplete);
  const prevTriggerRef = useRef(timerTrigger);
  
  useEffect(() => {
    onTimerCompleteRef.current = onTimerComplete;
  }, [onTimerComplete]);

  // Dispara o timer automaticamente quando timerTrigger mudar (ex: ao concluir uma série)
  useEffect(() => {
    if (timerTrigger && timerTrigger > 0 && timerTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = timerTrigger;
      const timer = setTimeout(() => {
        const now = Date.now();
        setRemainingSeconds(totalSeconds);
        setEndTime(now + totalSeconds * 1000);
        setIsRunning(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [timerTrigger, totalSeconds]);

  // Contagem regressiva precisa baseada em timestamp delta
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
        setIsRunning(false);
        playRestFinishedNotification();
        if (onTimerCompleteRef.current) {
          onTimerCompleteRef.current();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, endTime]);

  const startTimer = useCallback(() => {
    triggerHaptic('medium');
    playAudioCue('click');
    const duration = remainingSeconds > 0 ? remainingSeconds : totalSeconds;
    const now = Date.now();
    setRemainingSeconds(duration);
    setEndTime(now + duration * 1000);
    setIsRunning(true);
  }, [remainingSeconds, totalSeconds]);

  const pauseTimer = useCallback(() => {
    triggerHaptic('light');
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    triggerHaptic('medium');
    playAudioCue('click');
    const now = Date.now();
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setEndTime(now + totalSeconds * 1000);
  }, [totalSeconds]);

  const adjustTime = useCallback((seconds: number) => {
    triggerHaptic('light');
    if (seconds > 0) {
      playAudioCue('increment');
    } else {
      playAudioCue('decrement');
    }
    const now = Date.now();
    if (isRunning) {
      const next = Math.max(0, remainingSeconds + seconds);
      setRemainingSeconds(next);
      setEndTime(now + next * 1000);
      setTotalSeconds((tot) => Math.max(tot, next));
    } else {
      const next = Math.max(15, totalSeconds + seconds);
      setTotalSeconds(next);
      setRemainingSeconds(next);
    }
  }, [isRunning, remainingSeconds, totalSeconds]);

  const handleSelectPreset = useCallback((sec: number) => {
    triggerHaptic('medium');
    playAudioCue('click');
    const now = Date.now();
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
    setEndTime(now + sec * 1000);
    setIsRunning(true);
  }, []);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isFinished = remainingSeconds === 0;
  const progressPercent =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
      : 0;

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg pointer-events-none">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {/* Seção Fixa do Timer de Descanso */}
        <div className={`relative p-2 sm:p-2.5 border-b border-border/50 transition-colors ${
          isFinished ? 'bg-primary/20' : isRunning ? 'bg-muted/30' : 'bg-muted/10'
        }`}>
          {/* Barra de progresso do descanso */}
          {(isRunning || isFinished) && (
            <div
              className="absolute top-0 left-0 h-1 bg-primary transition-all duration-300 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          )}

          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Ícone e Tempo */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div
                className={`p-1.5 sm:p-2 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isFinished
                    ? 'bg-primary text-primary-foreground animate-bounce'
                    : isRunning
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isFinished ? (
                  <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                ) : (
                  <Timer className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none truncate">
                  {isFinished
                    ? 'Descanso Concluído!'
                    : isRunning
                    ? 'Em Descanso'
                    : 'Tempo de Descanso'}
                </span>
                <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-foreground leading-tight">
                  {formattedTime}
                </span>
              </div>
            </div>

            {/* Controles do Descanso */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Botões de ajuste (-15s / +30s) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => adjustTime(-15)}
                disabled={isRunning ? remainingSeconds <= 15 : totalSeconds <= 15}
                className="h-8 px-1.5 sm:px-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-[11px] sm:text-xs font-bold"
                title="Diminuir 15 segundos"
              >
                <Minus className="w-3 h-3 mr-0.5" />15s
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => adjustTime(30)}
                className="h-8 px-1.5 sm:px-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-[11px] sm:text-xs font-bold"
                title="Aumentar 30 segundos"
              >
                <Plus className="w-3 h-3 mr-0.5" />30s
              </Button>

              {/* Ação de Iniciar / Pausar / Retomar / Resetar */}
              {isFinished ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={resetTimer}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 bg-primary text-primary-foreground"
                  title="Reiniciar descanso"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Reiniciar</span>
                </Button>
              ) : isRunning ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={pauseTimer}
                  className="h-8 w-8 rounded-lg shrink-0"
                  title="Pausar descanso"
                >
                  <Pause className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={startTimer}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                  title="Iniciar descanso"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Iniciar</span>
                </Button>
              )}

              {/* Botão de Reset (quando pausado ou em andamento) */}
              {(isRunning || (remainingSeconds < totalSeconds && !isFinished)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetTimer}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted shrink-0"
                  title="Reiniciar timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Presets Rápidos de Descanso de 1-Toque */}
          <div className="flex items-center gap-1.5 pt-1.5 px-1 border-t border-border/30 overflow-x-auto no-scrollbar">
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
        </div>

        {/* Barra de Finalização e Resumo de Séries */}
        <div className="p-2 sm:p-2.5 flex items-center justify-between gap-3">
          <div className="px-2 sm:px-3 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
              Concluídas
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-foreground leading-tight">
              {totalCompletedSets} séries
            </span>
          </div>

          <Button
            type="button"
            onClick={onOpenFinishModal}
            className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/25 flex items-center gap-2 active:scale-95 transition-all shrink-0"
          >
            <Save className="w-4 h-4" />
            Finalizar Treino
          </Button>
        </div>
      </div>
    </div>
  );
}
