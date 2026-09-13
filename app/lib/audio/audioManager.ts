export const RITUAL_AUDIO = {
  rain: "/assets/audio/rain.mp3",
  room: "/assets/audio/room.mp3",
  fire: "/assets/audio/fire.mp3",
  click: "/assets/audio/click.mp3",
  inhale: "/assets/audio/inhale.mp3",
  exhale: "/assets/audio/exhale.mp3",
  subtleWind: "/assets/audio/subtle-wind.mp3",
  releaseAmbience: "/assets/audio/release-ambience.mp3",
} as const;

export type RitualAudioName = keyof typeof RITUAL_AUDIO;

export class AudioManager {
  private audio = new Map<RitualAudioName, HTMLAudioElement>();
  private fadeRafs = new Map<RitualAudioName, number>();

  load(name: RitualAudioName): HTMLAudioElement {
    const existing = this.audio.get(name);
    if (existing) return existing;

    const element = new Audio(RITUAL_AUDIO[name]);
    element.preload = "auto";
    this.audio.set(name, element);
    return element;
  }

  async play(name: RitualAudioName, volume = 1, loop = false) {
    const element = this.load(name);
    this.cancelFade(name);
    element.loop = loop;
    element.volume = clampVolume(volume);
    element.currentTime = 0;

    try {
      await element.play();
    } catch {
      // Playback may be blocked until a user gesture occurs.
    }

    return element;
  }

  playOnce(name: RitualAudioName, volume = 1) {
    return this.play(name, volume, false);
  }

  playLoop(name: RitualAudioName, volume = 1) {
    return this.play(name, volume, true);
  }

  fade(
    name: RitualAudioName,
    targetVolume: number,
    duration = 800,
    onDone?: () => void
  ) {
    const element = this.audio.get(name);
    if (!element) return;

    this.cancelFade(name);

    const startVolume = element.volume;
    const target = clampVolume(targetVolume);
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = duration <= 0 ? 1 : Math.min(1, (now - startedAt) / duration);
      element.volume = startVolume + (target - startVolume) * progress;

      if (progress >= 1) {
        this.fadeRafs.delete(name);
        onDone?.();
        return;
      }

      this.fadeRafs.set(name, requestAnimationFrame(tick));
    };

    this.fadeRafs.set(name, requestAnimationFrame(tick));
  }

  stop(name: RitualAudioName, fadeDuration = 0) {
    const element = this.audio.get(name);
    if (!element) return;

    if (fadeDuration > 0 && !element.paused) {
      this.fade(name, 0, fadeDuration, () => {
        element.pause();
        element.currentTime = 0;
      });
      return;
    }

    this.cancelFade(name);
    element.pause();
    element.currentTime = 0;
  }

  setVolume(name: RitualAudioName, volume: number) {
    const element = this.audio.get(name);
    if (element) element.volume = clampVolume(volume);
  }

  get(name: RitualAudioName) {
    return this.audio.get(name) ?? null;
  }

  cancelFade(name: RitualAudioName) {
    const raf = this.fadeRafs.get(name);
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
      this.fadeRafs.delete(name);
    }
  }

  stopAll() {
    for (const name of this.audio.keys()) this.stop(name);
  }

  destroy() {
    for (const name of this.audio.keys()) this.cancelFade(name);
    this.stopAll();
    this.audio.clear();
  }
}

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}
