"use client";

import { useCallback, useEffect, useRef } from "react";

export function useTrackedTimers() {
  const timeouts = useRef(new Set<number>());
  const intervals = useRef(new Set<number>());

  const setTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeouts.current.delete(id);
      callback();
    }, delay);
    timeouts.current.add(id);
    return id;
  }, []);

  const setTrackedInterval = useCallback((callback: () => void, delay: number) => {
    const id = window.setInterval(callback, delay);
    intervals.current.add(id);
    return id;
  }, []);

  const clearTrackedInterval = useCallback((id: number) => {
    window.clearInterval(id);
    intervals.current.delete(id);
  }, []);

  const clearTrackedTimeout = useCallback((id: number) => {
    window.clearTimeout(id);
    timeouts.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    timeouts.current.forEach((id) => window.clearTimeout(id));
    intervals.current.forEach((id) => window.clearInterval(id));
    timeouts.current.clear();
    intervals.current.clear();
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return {
    setTrackedTimeout,
    setTrackedInterval,
    clearTrackedTimeout,
    clearTrackedInterval,
    clearAll,
  };
}
