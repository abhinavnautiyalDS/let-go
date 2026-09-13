"use client";

import { useEffect, useRef } from "react";
import { AudioManager, type RitualAudioName } from "../lib/audio/audioManager";

export function useAudio() {
  const managerRef = useRef<AudioManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new AudioManager();
  }

  useEffect(() => {
    return () => managerRef.current?.destroy();
  }, []);

  return {
    play: (name: RitualAudioName, volume = 1, loop = false) =>
      managerRef.current?.play(name, volume, loop),
    playOnce: (name: RitualAudioName, volume = 1) =>
      managerRef.current?.playOnce(name, volume),
    playLoop: (name: RitualAudioName, volume = 1) =>
      managerRef.current?.playLoop(name, volume),
    fade: (name: RitualAudioName, targetVolume: number, duration = 800, onDone?: () => void) =>
      managerRef.current?.fade(name, targetVolume, duration, onDone),
    stop: (name: RitualAudioName, fadeDuration = 0) =>
      managerRef.current?.stop(name, fadeDuration),
    setVolume: (name: RitualAudioName, volume: number) =>
      managerRef.current?.setVolume(name, volume),
    get: (name: RitualAudioName) => managerRef.current?.get(name) ?? null,
    stopAll: () => managerRef.current?.stopAll(),
  };
}
