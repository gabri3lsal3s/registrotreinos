import { useState, useEffect } from 'react';
import { syncEventBus } from '../services/eventBus';

/**
 * Hook reativo que escuta mutações locais no banco Dexie e conclusões de sincronização
 * para invalidar e recarregar dados de telas de forma instantânea e sem lag.
 */
export function useDataReactivity(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleMutation = () => {
      setVersion(v => v + 1);
    };

    const unsubMutated = syncEventBus.subscribe('DATA_MUTATED', handleMutation);
    const unsubSync = syncEventBus.subscribe('SYNC_COMPLETED', handleMutation);
    const unsubAnalysis = syncEventBus.subscribe('ANALYSIS_INVALIDATED', handleMutation);

    const handleWindowEvent = () => {
      setVersion(v => v + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('refresh-analysis', handleWindowEvent);
      window.addEventListener('refresh-workout-data', handleWindowEvent);
      window.addEventListener('workout-data-mutated', handleWindowEvent);
    }

    return () => {
      unsubMutated();
      unsubSync();
      unsubAnalysis();
      if (typeof window !== 'undefined') {
        window.removeEventListener('refresh-analysis', handleWindowEvent);
        window.removeEventListener('refresh-workout-data', handleWindowEvent);
        window.removeEventListener('workout-data-mutated', handleWindowEvent);
      }
    };
  }, []);

  return version;
}
