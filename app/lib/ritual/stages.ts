import type { RitualStage } from "./types";

export const RITUAL_STAGES: readonly RitualStage[] = [
  "intro",
  "observing",
  "writing",
  "burning",
  "release",
  "complete",
  "checkout",
  "card",
  "finished",
];

export const isPaidStage = (stage: RitualStage) => stage === "card" || stage === "finished";

export const canUnlockCard = (stage: RitualStage) =>
  stage === "complete" || stage === "checkout" || isPaidStage(stage);
