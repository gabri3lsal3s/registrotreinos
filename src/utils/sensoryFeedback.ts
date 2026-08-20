/**
 * Sistema Sensorial Centralizado: Feedback tátil (Vibration API) e sonoro (Web Audio API).
 * 100% Offline-first, sintetizado em tempo real com envelopes ADSR suaves (zero assets de áudio externos).
 */

export interface SensorySettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  volume: number; // 0.0 a 1.0
}

const DEFAULT_SENSORY_SETTINGS: SensorySettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  volume: 0.3
};

let cachedSettings: SensorySettings | null = null;
let audioCtx: AudioContext | null = null;

export function getSensorySettings(): SensorySettings {
  if (cachedSettings) return cachedSettings;
  if (typeof window === 'undefined') return DEFAULT_SENSORY_SETTINGS;

  try {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      cachedSettings = {
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SENSORY_SETTINGS.soundEnabled,
        hapticsEnabled: typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : DEFAULT_SENSORY_SETTINGS.hapticsEnabled,
        volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SENSORY_SETTINGS.volume
      };
      return cachedSettings;
    }
  } catch (_e) {
    // Fallback silencioso
  }

  cachedSettings = { ...DEFAULT_SENSORY_SETTINGS };
  return cachedSettings;
}

export function saveSensorySettings(updates: Partial<SensorySettings>): SensorySettings {
  const current = getSensorySettings();
  const next: SensorySettings = { ...current, ...updates };
  cachedSettings = next;

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('app_settings');
      let allSettings = {};
      if (saved) {
        allSettings = JSON.parse(saved);
      }
      localStorage.setItem('app_settings', JSON.stringify({ ...allSettings, ...next }));
    } catch (_e) {
      // Ignora erro de quota
    }
  }

  return next;
}

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

export type HapticPreset = 'light' | 'medium' | 'heavy' | 'success' | 'celebration' | 'warning';

const HAPTIC_PRESETS: Record<HapticPreset, number | number[]> = {
  light: 15,
  medium: 30,
  heavy: 50,
  success: [25, 40, 55],
  celebration: [50, 40, 50, 40, 120],
  warning: [35, 30, 35]
};

/**
 * Dispara vibração háptica tátil no dispositivo respeitando as preferências do usuário.
 */
export function triggerHaptic(preset: HapticPreset | number | number[] = 'light') {
  const settings = getSensorySettings();
  if (!settings.hapticsEnabled) return;

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      const pattern = typeof preset === 'string' ? HAPTIC_PRESETS[preset] || 15 : preset;
      navigator.vibrate(pattern);
    } catch {
      // Ignora restrições do navegador
    }
  }
}

export type AudioCueType = 
  | 'click' 
  | 'increment' 
  | 'decrement' 
  | 'set_complete' 
  | 'set_uncomplete' 
  | 'rest_finished' 
  | 'pr_celebration' 
  | 'workout_finished';

/**
 * Toca um som de sintetizador Web Audio puro e leve.
 */
export function playAudioCue(cue: AudioCueType) {
  const settings = getSensorySettings();
  if (!settings.soundEnabled || settings.volume <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseVol = Math.max(0.01, Math.min(1.0, settings.volume));

    switch (cue) {
      case 'click': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12 * baseVol, ctx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
        break;
      }

      case 'increment': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2 * baseVol, ctx.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
        break;
      }

      case 'decrement': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18 * baseVol, ctx.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
        break;
      }

      case 'set_complete': {
        // Acorde esmeralda ascendente suave (E5 -> G#5 -> B5)
        const notes = [659.25, 830.61, 987.77];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + i * 0.04;
          const dur = 0.14;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.25 * baseVol, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + dur);
        });
        break;
      }

      case 'set_uncomplete': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15 * baseVol, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
        break;
      }

      case 'rest_finished': {
        // Bipe 1 (E5)
        playTone(ctx, 659.25, 0.12, 0.3 * baseVol, 0);
        // Bipe 2 (A5)
        playTone(ctx, 880.00, 0.22, 0.35 * baseVol, 0.14);
        break;
      }

      case 'pr_celebration': {
        // Fanfarra triunfal: C5 -> E5 -> G5 -> C6
        const fanfare = [523.25, 659.25, 783.99, 1046.50];
        fanfare.forEach((freq, idx) => {
          playTone(ctx, freq, 0.18, (0.2 + idx * 0.05) * baseVol, idx * 0.08);
        });
        break;
      }

      case 'workout_finished': {
        // Harmonia final comemorativa
        const chord = [523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq) => {
          playTone(ctx, freq, 0.5, 0.25 * baseVol, 0);
        });
        break;
      }
    }
  } catch (err) {
    console.warn('[AudioCue] Erro ao sintetizar som:', err);
  }
}

function playTone(ctx: AudioContext, frequency: number, duration: number, gainVal: number, delay = 0) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + delay;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration);
}

// ==========================================
// Compatibilidade Legada com audioFeedback.ts
// ==========================================

export function playBeep(frequency = 880, duration = 0.15, type: OscillatorType = 'sine') {
  const settings = getSensorySettings();
  if (!settings.soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3 * settings.volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silencioso
  }
}

export function playRestFinishedNotification() {
  playAudioCue('rest_finished');
  triggerHaptic('celebration');
}

export function triggerHapticFeedback(pattern: number | number[] = 50) {
  triggerHaptic(pattern);
}
