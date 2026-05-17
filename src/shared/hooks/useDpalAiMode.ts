import { useCallback, useEffect, useState } from 'react';
import {
  clearAiHealthCache,
  getAiHealth,
  isAiConfigured,
  isAiLive,
  type AiHealthResponse,
  LIVE_AI_UNAVAILABLE_USER_MESSAGE,
} from '../../services/dpalAiClient';

export type DpalAiConnectionStatus = 'checking' | 'live' | 'offline';

export type UseDpalAiModeResult = {
  status: DpalAiConnectionStatus;
  /** True only when health confirms live AI — false while checking. */
  geminiLive: boolean;
  isChecking: boolean;
  health: AiHealthResponse | null;
  configured: boolean;
  userFallbackMessage: string;
  refresh: (force?: boolean) => Promise<boolean>;
  ensureLiveBeforeSend: () => Promise<boolean>;
};

export function useDpalAiMode(): UseDpalAiModeResult {
  const [status, setStatus] = useState<DpalAiConnectionStatus>('checking');
  const [health, setHealth] = useState<AiHealthResponse | null>(null);

  const refresh = useCallback(async (force = false): Promise<boolean> => {
    if (!isAiConfigured()) {
      setHealth(null);
      setStatus('offline');
      return false;
    }
    setStatus('checking');
    if (force) clearAiHealthCache();
    const nextHealth = await getAiHealth(force);
    setHealth(nextHealth);
    const live = await isAiLive(force);
    setStatus(live ? 'live' : 'offline');
    return live;
  }, []);

  const ensureLiveBeforeSend = useCallback(async (): Promise<boolean> => {
    if (status === 'live') return true;
    return refresh(true);
  }, [refresh, status]);

  useEffect(() => {
    let cancelled = false;
    void refresh().then((live) => {
      if (cancelled && !live) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return {
    status,
    geminiLive: status === 'live',
    isChecking: status === 'checking',
    health,
    configured: isAiConfigured(),
    userFallbackMessage: LIVE_AI_UNAVAILABLE_USER_MESSAGE,
    refresh,
    ensureLiveBeforeSend,
  };
}
