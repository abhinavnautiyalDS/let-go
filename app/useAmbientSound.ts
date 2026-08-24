"use client";

import { useEffect, useRef } from "react";

/**
 * useAmbientSound
 *
 * A thin sound layer matching the "Sound Journey" in goal.md. I can't
 * generate or fetch actual audio assets, so this hook is a real,
 * working scaffold: drop files at the paths below and every phase
 * transition already calls the right one, at the right volume, with
 * a fade instead of a hard cut.
 *
 * Expected files (all loopable ambience should be seamless loops):
 *   /public/sounds/room-tone.mp3     - very low room hum, loops
 *   /public/sounds/rain.mp3          - soft rain, loops
 *   /public/sounds/wind-fabric.mp3   - occasional curtain rustle, one-shot
 *   /public/sounds/pen-write.mp3     - soft looping pen/paper texture
 *   /public/sounds/paper-tap.mp3     - one-shot, on Enter
 *   /public/sounds/fire-crackle.mp3  - loop, fades in as burn starts
 *   /public/sounds/chord-warm.mp3    - one-shot warm chord, on worldLit
 *   /public/sounds/bird-distant.mp3  - one-shot / sparse loop, post-light
 *
 * Usage in Scene01:
 *   const sound = useAmbientSound();
 *   sound.play('rain', { volume: 0.18, loop: true });
 *   sound.fadeOut('rain', 4000);
 *   sound.playOnce('paper-tap', { volume: 0.4 });
 */

const SOUND_PATHS = {
  "room-tone": "/sounds/room-tone.mp3",
  rain: "/sounds/rain.mp3",
  "wind-fabric": "/sounds/wind-fabric.mp3",
  "pen-write": "/sounds/pen-write.mp3",
  "paper-tap": "/sounds/paper-tap.mp3",
  "fire-crackle": "/sounds/fire-crackle.mp3",
  "chord-warm": "/sounds/chord-warm.mp3",
  "bird-distant": "/sounds/bird-distant.mp3",
};

export default function useAmbientSound() {
  const poolRef = useRef({});
  // tracks the active fade's rAF id per sound key, so a new fade can
  // cancel a stale one instead of both fighting over audioEl.volume
  const fadeTokenRef = useRef({});

  useEffect(() => {
    const pool = poolRef.current;
    return () => {
      Object.values(pool).forEach((a) => {
        a.pause();
        a.src = "";
      });
    };
  }, []);

  function getAudio(key) {
    const pool = poolRef.current;
    if (!pool[key]) {
      if (typeof window === "undefined") return null;
      const a = new Audio(SOUND_PATHS[key]);
      a.preload = "auto";
      pool[key] = a;
    }
    return pool[key];
  }

  function play(key, { volume = 0.3, loop = true } = {}) {
    const a = getAudio(key);
    if (!a) return;
    a.loop = loop;
    a.volume = 0;
    a.play().catch(() => {
      /* autoplay can be blocked until first user gesture — that's fine,
         BEGIN click counts as the gesture that unlocks audio */
    });
    fadeTo(key, a, volume, 1200);
  }

  function playOnce(key, { volume = 0.4 } = {}) {
    const a = getAudio(key);
    if (!a) return;
    a.loop = false;
    a.currentTime = 0;
    a.volume = clamp01(volume);
    a.play().catch(() => {});
  }

  function fadeOut(key, duration = 2000) {
    const pool = poolRef.current;
    const a = pool[key];
    if (!a) return;
    fadeTo(key, a, 0, duration, () => a.pause());
  }

  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function fadeTo(key, audioEl, target, duration, onDone) {
    // cancel any fade already running on this sound before starting a new one
    fadeTokenRef.current[key] = (fadeTokenRef.current[key] || 0) + 1;
    const myToken = fadeTokenRef.current[key];

    const start = clamp01(audioEl.volume);
    const clampedTarget = clamp01(target);
    const startTime = performance.now();

    function step(now) {
      if (fadeTokenRef.current[key] !== myToken) return; // superseded
      const t = Math.min((now - startTime) / duration, 1);
      audioEl.volume = clamp01(start + (clampedTarget - start) * t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  return { play, playOnce, fadeOut };
}