import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook para manter a tela do dispositivo ligada durante a sessão de treino ativa
 * usando a Screen Wake Lock API nativa.
 */
export function useWakeLock(enabled: boolean = true) {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || !enabled) return;
    try {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsLocked(true);

        wakeLockRef.current.addEventListener('release', () => {
          setIsLocked(false);
        });
      }
    } catch (err) {
      console.warn('[WakeLock] Não foi possível ativar Screen Wake Lock:', err);
      setIsLocked(false);
    }
  }, [enabled]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignora erros ao liberar
      } finally {
        wakeLockRef.current = null;
        setIsLocked(false);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && enabled) {
          requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
