/**
 * Utilitário de feedback sonoro e tátil 100% offline utilizando Web Audio API e Vibration API.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Toca um bipe sintético puro.
 */
export function playBeep(frequency = 880, duration = 0.15, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Fade-in e Fade-out suaves para evitar cliques sonoros
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('[Audio] Erro ao sintetizar som:', err);
  }
}

/**
 * Toca sequência comemorativa de término de descanso (dois bips ascendentes + vibração).
 */
export function playRestFinishedNotification() {
  // Bipe 1
  playBeep(659.25, 0.12); // E5
  // Bipe 2
  setTimeout(() => {
    playBeep(880, 0.25); // A5
  }, 140);

  // Vibração se suportada pelo dispositivo
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 80, 200]);
    } catch {
      // Ignora restrições do navegador
    }
  }
}

/**
 * Vibração de feedback de toque suave (ex: ao marcar série).
 */
export function triggerHapticFeedback(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignora
    }
  }
}
