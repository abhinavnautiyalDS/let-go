"use client";

import { useCallback, useState } from "react";
import type { RitualSession, RitualStage, RitualType } from "@/app/lib/ritual/types";

const createSession = (text = ""): RitualSession => ({
  id: crypto.randomUUID(),
  ritual: { type: "let-go" as RitualType, version: 1 },
  input: { text },
  progress: {
    stage: "intro",
    startedAt: new Date().toISOString(),
  },
  unlock: { card: false },
});

export function useRitual(initialText = "") {
  const [session, setSession] = useState<RitualSession>(() => createSession(initialText));

  const setStage = useCallback((stage: RitualStage) => {
    setSession((current) => ({
      ...current,
      progress: {
        ...current.progress,
        stage,
        ...(stage === "complete" ? { completedAt: new Date().toISOString() } : {}),
      },
    }));
  }, []);

  const setInput = useCallback((text: string) => {
    setSession((current) => ({ ...current, input: { text } }));
  }, []);

  const unlockCard = useCallback((paymentId: string) => {
    setSession((current) => ({
      ...current,
      unlock: { card: true, paymentId },
      progress: { ...current.progress, stage: "card" },
    }));
  }, []);

  const reset = useCallback(() => {
    setSession(createSession());
  }, []);

  return {
    session,
    stage: session.progress.stage,
    setStage,
    setInput,
    unlockCard,
    reset,
  };
}
