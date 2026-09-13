export type RitualStage =
  | "intro"
  | "observing"
  | "writing"
  | "burning"
  | "release"
  | "complete"
  | "checkout"
  | "card"
  | "finished";

export type RitualType = "let-go";

export interface RitualSession {
  id: string;
  ritual: {
    type: RitualType;
    version: number;
  };
  input: {
    text: string;
  };
  progress: {
    stage: RitualStage;
    startedAt: string;
    completedAt?: string;
  };
  unlock: {
    card: boolean;
    paymentId?: string;
  };
}

export interface ReleaseCardData {
  ritualType: RitualType;
  text?: string;
  completedAt: string;
}
