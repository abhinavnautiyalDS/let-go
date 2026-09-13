"use client";

import RitualEngine from "./ritual/RitualEngine";

/**
 * Thin route-facing entry point for the ritual scene.
 * Keep orchestration here; rendering engines and scene mechanics live under
 * components/ritual so they can be extracted without changing the route.
 */
export default function Scene01() {
  return <RitualEngine />;
}
