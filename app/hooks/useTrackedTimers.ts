"use client";

import { useCallback, useEffect, useRef } from "react";

export function useTrackedTimers() {
  const timeouts = useRef(new Set<ReturnType<typeof window.setTimeout>>());
  const intervals = useRef(new Set<ReturnType<typeof window.setInterval>>());

  const timeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeouts.current.delete(id);
      callback();
    }, delay);
    timeouts.current.add(id);
    return id;
  }, []);

  const interval = useCallback((callback: () => void, delay: number) => {
    const id = window.setInterval(callback, delay);
    intervals.current.add(id);
    return id;
  }, []);

  const clearTimeoutTracked = useCallback((id: ReturnType<typeof window.setTimeout>) => {
    window.clearTimeout(id);
    timeouts.current.delete(id);
  }, []);

  const clearIntervalTracked = useCallback((id: ReturnType<typeof window.setInterval>) => {
    window.clearInterval(id);
    intervals.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    timeouts.current.forEach((id) => window.clearTimeout(id));
    intervals.current.forEach((id) => window.clearInterval(id));
    timeouts.current.clear();
    intervals.current.clear();
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return {
    timeout,
    interval,
    clearTimeout: clearTimeoutTracked,
    clearInterval: clearIntervalTracked,
    clearAll,
  };
}
