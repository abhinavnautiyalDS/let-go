"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const staticLayers = [
  "background.png",
  "window.png",
  "table.png",
  "cup.png",
  "lamp.png"
];

const rainDrops = Array.from({ length: 200 }, (_, i) => ({
  left: (i * 11.73) % 85,
  top: (i * 17.41) % 100,
  delay: (i * 0.37) % 4,
  duration: 0.9 + ((i * 0.09) % 0.6),
  length: 14 + ((i * 16) % 22),
  opacity: 0.3 + ((i * 0.07) % 0.28),
}));

const affirmations = [
  "You do not have to carry what no longer belongs to you.",
  "You made it through what brought you here.",
  "You are allowed to remember without holding on.",
  "You are enough, exactly as you are.",
  "You are still here. You can begin again.",
];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Fast, single-pass chroma key with green-spill suppression.
const chromaAlpha = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max > 0 ? (max - min) / max : 0;

  const greenDominance = g - (r + b) * 0.5;
  const greenRatio = g / Math.max(1, (r + b) * 0.5);

  const dominance = smoothstep(5, 24, greenDominance);
  const ratio = smoothstep(1.04, 1.18, greenRatio);
  const saturationGate = smoothstep(0.08, 0.22, saturation);
  const greenGate = Math.max(0, Math.min(1, dominance * ratio * saturationGate));

  return Math.round(Math.max(0, Math.min(255, (1 - greenGate) * 255)));
};

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const W = 836;
const H = 471;
const SOURCE_W = 320;
const SOURCE_H = 180;

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function Scene01() {
  console.log("SCENE01 BUILD MARKER: burn-fixed-1");
  const [introFinished, setIntroFinished] = useState(false);
  const [started, setStarted] = useState(false);

  const [name, setName] = useState("");
  const [nameLocked, setNameLocked] = useState(false);

  const [burning, setBurning] = useState(false);
  const [paperBurned, setPaperBurned] = useState(false);

  const [released, setReleased] = useState(false);
  const [worldChanged, setWorldChanged] = useState(false);
  const [flicker, setFlicker] = useState(false);

  type PostBurnStage =
    | "idle"
    | "release"
    | "affirmation"
    | "memory"
    | "checkout"
    | "card"
    | "donation"
    | "final";

  const [postBurnStage, setPostBurnStage] = useState<PostBurnStage>("idle");

  const [showAffirmations, setShowAffirmations] = useState(false);
  const [affirmationIndex, setAffirmationIndex] = useState(0);
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [showCardCheckout, setShowCardCheckout] = useState(false);
  // We keep these for compatibility, but we mainly use postBurnStage
  const [showCard, setShowCard] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showFinalExit, setShowFinalExit] = useState(false);

  const [paperReady, setPaperReady] = useState(false);

  // ─── AUDIO REFS ──────────────────────────────────────────────────────
  const rainAudio = useRef<HTMLAudioElement | null>(null);
  const breathingAudio = useRef<HTMLAudioElement | null>(null);
  const roomMusicAudio = useRef<HTMLAudioElement | null>(null);
  const fireAudio = useRef<HTMLAudioElement | null>(null);
  const releaseAudio = useRef<HTMLAudioElement | null>(null);
  const typingAudio = useRef<HTMLAudioElement | null>(null);

  const fireVideoRef = useRef<HTMLVideoElement | null>(null);
  const nameBurnRef = useRef<HTMLDivElement | null>(null);
  const sceneCameraRef = useRef<HTMLDivElement | null>(null);

  const burnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameBurnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fireCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ashCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ─── AUDIO HELPERS ──────────────────────────────────────────────────────

  const fadeAudio = (
    audio: HTMLAudioElement | null,
    targetVolume: number,
    duration: number
  ) => {
    if (!audio) return;
    const startVolume = audio.volume;
    const difference = targetVolume - startVolume;
    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;
    const interval = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      audio.volume = startVolume + difference * progress;
      if (currentStep >= steps) {
        clearInterval(interval);
        audio.volume = targetVolume;
      }
    }, stepTime);
  };

  const playOnce = (audio: HTMLAudioElement | null, volume: number) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  };

  const startRoomAudio = () => {
    const rain = rainAudio.current;
    const breathing = breathingAudio.current;
    const music = roomMusicAudio.current;

    if (rain) { rain.volume = 0.18; rain.loop = true; rain.play().catch(() => { }); }
    if (breathing) { breathing.volume = 0.08; breathing.loop = true; breathing.play().catch(() => { }); }
    if (music) { music.volume = 0.16; music.loop = true; music.play().catch(() => { }); }
  };

  // ─── FULLSCREEN TOGGLE ─────────────────────────────────────────────

  const toggleFullscreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().catch((err) => {
        console.warn("Fullscreen error:", err.message);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn("Exit fullscreen error:", err.message);
      });
    }
  };

  // ─── RESPONSIVE CAMERA ──────────────────────────────────────────────

  const [cameraTarget, setCameraTarget] = useState({
    scale: 1.25,
    x: -35,
    y: -170,
  });

  useEffect(() => {
    const updateCamera = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth < 1024 && window.innerWidth >= 768;
      const isLandscapeNow = window.innerWidth > window.innerHeight;

      if (!started) {
        if (isMobile && isLandscapeNow) {
          setCameraTarget({ scale: 1.0, x: -15, y: -100 });
        } else if (isMobile) {
          setCameraTarget({ scale: 1.0, x: -10, y: -100 });
        } else if (isTablet) {
          setCameraTarget({ scale: 1.15, x: -25, y: -140 });
        } else {
          setCameraTarget({ scale: 1.25, x: -35, y: -170 });
        }
      } else {
        if (isMobile && isLandscapeNow) {
          setCameraTarget({ scale: 1.35, x: -50, y: -180 });
        } else if (isMobile) {
          setCameraTarget({ scale: 1.4, x: -60, y: -200 });
        } else if (isTablet) {
          setCameraTarget({ scale: 1.6, x: -90, y: -240 });
        } else {
          setCameraTarget({ scale: 1.75, x: -120, y: -280 });
        }
      }
    };

    updateCamera();
    window.addEventListener("resize", updateCamera);
    return () => window.removeEventListener("resize", updateCamera);
  }, [started]);

  // ─── LAMP FLICKER ──────────────────────────────────────────────────

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setFlicker(true);
      setTimeout(() => setFlicker(false), 500);
    }, 20000);
    return () => clearInterval(interval);
  }, [started]);

  // ─── INTRO TIMER ──────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setIntroFinished(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  // ─── LANDING PAGE RAIN ──────────────────────────────────────────────

  useEffect(() => {
    const rain = rainAudio.current;
    if (!rain) return;
    rain.volume = 0.18;
    rain.loop = true;
    rain.play().catch(() => {});
  }, []);

  // ─── SOUND: AFTER BEGIN ─────────────────────────────────────────────

  useEffect(() => {
    if (!started) return;
    
    const rain = rainAudio.current;
    const music = roomMusicAudio.current;
    const breathing = breathingAudio.current;
    
    if (rain) fadeAudio(rain, 0.15, 3000);
    if (music) {
      music.volume = 0;
      music.loop = true;
      music.play().catch(() => {});
      fadeAudio(music, 0.12, 4000);
    }
    if (breathing) {
      breathing.volume = 0.04;
      breathing.loop = true;
      breathing.play().catch(() => {});
    }
  }, [started]);

  // ─── NAME LOCK → BURN TRIGGER ──────────────────────────────────────

  useEffect(() => {
    if (!nameLocked) return;
    const timer = setTimeout(() => setBurning(true), 2500);
    return () => clearTimeout(timer);
  }, [nameLocked]);

  // ─── TYPING SOUND ────────────────────────────────────────────────────

  useEffect(() => {
    if (!nameLocked) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'Tab') return;
      if (e.key.length > 1) return;
      
      const typing = typingAudio.current;
      if (typing) {
        typing.currentTime = 0;
        typing.volume = 0.25;
        typing.play().catch(() => {});
      }
    };
    
    const input = document.querySelector('.name-input') as HTMLInputElement;
    if (input) {
      input.addEventListener('keydown', handleKeyPress);
      return () => input.removeEventListener('keydown', handleKeyPress);
    }
  }, [nameLocked]);

  // ─── SOUND: PAPER BURNING ───────────────────────────────────────────

  useEffect(() => {
    if (!burning) return;
    const fire = fireAudio.current;
    const rain = rainAudio.current;
    const music = roomMusicAudio.current;
    
    if (fire) {
      fire.currentTime = 0;
      fire.volume = 0.35;
      fire.loop = true;
      fire.play().catch(() => {});
    }
    
    if (rain) fadeAudio(rain, 0.08, 2000);
    if (music) fadeAudio(music, 0.08, 2000);
  }, [burning]);

  // ─── CACHED NAME TRANSFORM ──────────────────────────────────────────

  const nameTransform = useRef<{ x: number; y: number; fontSize: number; color: string; font: string; letterSpacing: number } | null>(null);

  const computeNameTransform = () => {
    if (!nameBurnRef.current || !sceneCameraRef.current || !name) return;
    const nameRect = nameBurnRef.current.getBoundingClientRect();
    const cameraRect = sceneCameraRef.current.getBoundingClientRect();
    const cameraScaleX = cameraRect.width / 1672;
    const cameraScaleY = cameraRect.height / 941;
    if (!cameraScaleX || !cameraScaleY) return;

    const bufferScale = W / 1672;
    const localCenterX = ((nameRect.left + nameRect.width / 2 - cameraRect.left) / cameraScaleX) * bufferScale;
    const localCenterY = ((nameRect.top + nameRect.height / 2 - cameraRect.top) / cameraScaleY) * bufferScale;
    const computed = window.getComputedStyle(nameBurnRef.current);
    const fontSize = (parseFloat(computed.fontSize) / cameraScaleY) * bufferScale;
    const fontWeight = computed.fontWeight || "400";
    const fontFamily = computed.fontFamily || '"Segoe Print", cursive';
    const letterSpacing = ((parseFloat(computed.letterSpacing) || 0) / cameraScaleX) * bufferScale;
    const color = computed.color || "rgba(55,38,24,0.9)";
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    nameTransform.current = {
      x: localCenterX,
      y: localCenterY,
      fontSize,
      color,
      font,
      letterSpacing,
    };
  };

  // Recompute when name locks
  useEffect(() => {
    if (nameLocked && name) {
      requestAnimationFrame(() => computeNameTransform());
    }
  }, [nameLocked, name]);

  // ─── PAPER FIRST-FRAME PNG ─────────────────────────────────────────

  const paperPngRef = useRef<HTMLImageElement | null>(null);

  // Low-res paper data and alpha
  const lowResPaperData = useRef<Uint8ClampedArray | null>(null);
  const lowResPaperAlpha = useRef<Uint8ClampedArray | null>(null);

  // Pre-allocated buffers (low-res only)
  const burnMask = useRef<Float32Array>(new Float32Array(SOURCE_W * SOURCE_H));
  const tempDiffusion = useRef<Float32Array>(new Float32Array(SOURCE_W * SOURCE_H));
  const fireMaskData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const compositeData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const burnMaskImageData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const charImageData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const edgeImageData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));

  // Offscreen canvases for low-res processing
  const lowResPaperCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResCompositeCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResBurnMaskCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResCharCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResEdgeCanvas = useRef<HTMLCanvasElement | null>(null);
  const fireMaskCanvas = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvas = useRef<HTMLCanvasElement | null>(null);

  // Compositor state
  const compositorReady = useRef(false);
  const compositorStarted = useRef(false);
  const loopId = useRef<number | null>(null);
  const renderActive = useRef(false);
  const videoEndedRef = useRef(false);
  const burnMaskDirty = useRef(true);
  const initialFrameRef = useRef<Uint8ClampedArray | null>(null);
  const hasInitialRef = useRef(false);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const hasPreviousRef = useRef(false);
  const finalRenderPending = useRef(false);
  const compositorEnded = useRef(false);

  // ─── LOAD FIRST-FRAME PNG ──────────────────────────────────────────

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/assets/scene-01/fire-paper-first-frame.png";
    img.onload = () => {
      paperPngRef.current = img;
      setPaperReady(true);

      const canvas = burnCanvasRef.current;
      if (!canvas) return;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);

      const lrCanvas = document.createElement("canvas");
      lrCanvas.width = SOURCE_W;
      lrCanvas.height = SOURCE_H;
      const lrCtx = lrCanvas.getContext("2d", { willReadFrequently: true });
      if (!lrCtx) return;
      lrCtx.drawImage(img, 0, 0, SOURCE_W, SOURCE_H);
      const imageData = lrCtx.getImageData(0, 0, SOURCE_W, SOURCE_H);
      lowResPaperData.current = new Uint8ClampedArray(imageData.data);
      const alpha = new Uint8ClampedArray(SOURCE_W * SOURCE_H);
      for (let i = 0; i < SOURCE_W * SOURCE_H; i++) {
        alpha[i] = imageData.data[i * 4 + 3];
      }
      lowResPaperAlpha.current = alpha;
      lowResPaperCanvas.current = lrCanvas;

      const compCanvas = document.createElement("canvas");
      compCanvas.width = SOURCE_W;
      compCanvas.height = SOURCE_H;
      const compCtx = compCanvas.getContext("2d");
      if (compCtx) {
        compCtx.drawImage(img, 0, 0, SOURCE_W, SOURCE_H);
      }
      lowResCompositeCanvas.current = compCanvas;

      lowResBurnMaskCanvas.current = document.createElement("canvas");
      lowResBurnMaskCanvas.current.width = SOURCE_W;
      lowResBurnMaskCanvas.current.height = SOURCE_H;
      lowResCharCanvas.current = document.createElement("canvas");
      lowResCharCanvas.current.width = SOURCE_W;
      lowResCharCanvas.current.height = SOURCE_H;
      lowResEdgeCanvas.current = document.createElement("canvas");
      lowResEdgeCanvas.current.width = SOURCE_W;
      lowResEdgeCanvas.current.height = SOURCE_H;
    };
    return () => { img.onload = null; };
  }, []);

  // ─── NAME OVERLAY ON PAPER ──────────────────────────────────────────

  useEffect(() => {
    if (!nameLocked || !name || !lowResPaperCanvas.current || !paperReady) return;
    if (!nameTransform.current) {
      computeNameTransform();
    }
    const transform = nameTransform.current;
    if (!transform) return;

    const lrCanvas = lowResPaperCanvas.current;
    const ctx = lrCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SOURCE_W, SOURCE_H);
    if (paperPngRef.current) {
      ctx.drawImage(paperPngRef.current, 0, 0, SOURCE_W, SOURCE_H);
    }

    const scaleX = SOURCE_W / W;
    const scaleY = SOURCE_H / H;
    const x = transform.x * scaleX;
    const y = transform.y * scaleY;
    const fontSize = transform.fontSize * scaleY;

    ctx.save();
    ctx.fillStyle = transform.color;
    ctx.font = transform.font.replace(/[\d.]+px/, fontSize + 'px');
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (transform.letterSpacing > 0.01 && name.length > 1) {
      const chars = Array.from(name);
      const widths = chars.map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + transform.letterSpacing * (chars.length - 1) * scaleX;
      let cx = x - total / 2;
      chars.forEach((char, idx) => {
        ctx.fillText(char, cx + widths[idx] / 2, y);
        cx += widths[idx] + transform.letterSpacing * scaleX;
      });
    } else {
      ctx.fillText(name, x, y);
    }
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, SOURCE_W, SOURCE_H);
    lowResPaperData.current = new Uint8ClampedArray(imageData.data);
    const alpha = new Uint8ClampedArray(SOURCE_W * SOURCE_H);
    for (let i = 0; i < SOURCE_W * SOURCE_H; i++) {
      alpha[i] = imageData.data[i * 4 + 3];
    }
    lowResPaperAlpha.current = alpha;

    if (lowResCompositeCanvas.current) {
      const compCtx = lowResCompositeCanvas.current.getContext("2d");
      if (compCtx) {
        compCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
        compCtx.drawImage(lrCanvas, 0, 0);
      }
    }
  }, [nameLocked, name, paperReady]);

  // ─── COMPOSITOR INIT ───────────────────────────────────────────────

  const initCompositor = () => {
    if (compositorStarted.current) return;
    compositorStarted.current = true;
    compositorEnded.current = false;
    finalRenderPending.current = false;
    console.log("BURN TRACE: initCompositor STARTED");

    const video = fireVideoRef.current;
    const burnCanvas = burnCanvasRef.current;
    const fireCanvas = fireCanvasRef.current;
    const nameCanvas = nameBurnCanvasRef.current;

    if (!video || !burnCanvas || !fireCanvas) {
      compositorStarted.current = false;
      return;
    }

    fireCanvas.width = W;
    fireCanvas.height = H;
    if (nameCanvas) {
      nameCanvas.width = W;
      nameCanvas.height = H;
    }

    sourceCanvas.current = document.createElement("canvas");
    sourceCanvas.current.width = SOURCE_W;
    sourceCanvas.current.height = SOURCE_H;
    const sourceCtx = sourceCanvas.current.getContext("2d", { willReadFrequently: true });
    if (!sourceCtx) { compositorStarted.current = false; return; }

    fireMaskCanvas.current = document.createElement("canvas");
    fireMaskCanvas.current.width = SOURCE_W;
    fireMaskCanvas.current.height = SOURCE_H;
    const fireMaskCtx = fireMaskCanvas.current.getContext("2d", { willReadFrequently: true });
    if (!fireMaskCtx) { compositorStarted.current = false; return; }

    if (!lowResCompositeCanvas.current) {
      const comp = document.createElement("canvas");
      comp.width = SOURCE_W;
      comp.height = SOURCE_H;
      lowResCompositeCanvas.current = comp;
      if (lowResPaperCanvas.current) {
        const ctx = comp.getContext("2d");
        if (ctx) ctx.drawImage(lowResPaperCanvas.current, 0, 0);
      }
    }

    initialFrameRef.current = new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4);
    previousFrameRef.current = new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4);

    let ended = false;
    let lastTime = -1;

    const render = () => {
      if (ended || !renderActive.current || compositorEnded.current) {
        loopId.current = null;
        return;
      }

      const scheduleNext = () => {
        if (typeof (video as any).requestVideoFrameCallback === "function") {
          (video as any).requestVideoFrameCallback(render);
        } else {
          loopId.current = requestAnimationFrame(render);
        }
      };

      if (video.readyState < 2) {
        scheduleNext();
        return;
      }

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        scheduleNext();
        return;
      }

      const progress = Math.max(0, Math.min(1, video.currentTime / duration));

      const timeChanged = Math.abs(video.currentTime - lastTime) > 0.005;
      if (timeChanged) lastTime = video.currentTime;

      sourceCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      sourceCtx.drawImage(video, 0, 0, SOURCE_W, SOURCE_H);
      const frame = sourceCtx.getImageData(0, 0, SOURCE_W, SOURCE_H);
      const px = frame.data;

      if (!hasInitialRef.current) {
        const init = new Uint8ClampedArray(px);
        initialFrameRef.current = init;
        hasInitialRef.current = true;
        previousFrameRef.current = new Uint8ClampedArray(px);
        hasPreviousRef.current = true;
        compositorReady.current = true;
      }

      const fireMask = fireMaskData.current;
      const initPx = initialFrameRef.current!;
      const prevPx = previousFrameRef.current!;

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const ir = initPx[i], ig = initPx[i + 1], ib = initPx[i + 2];
        const sourceAlpha = chromaAlpha(r, g, b) / 255;
        if (sourceAlpha <= 0.01) {
          fireMask[i + 3] = 0;
          continue;
        }

        const diff = Math.abs(r - ir) + Math.abs(g - ig) + Math.abs(b - ib);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max > 0 ? (max - min) / max : 0;
        const warm = smoothstep(0, 35, r - g) * smoothstep(0, 40, g - b);
        const brightWarm = smoothstep(70, 170, luminance) * smoothstep(0.08, 0.25, saturation) * warm;

        let motion = 0;
        if (hasPreviousRef.current) {
          const dr = Math.abs(r - prevPx[i]);
          const dg = Math.abs(g - prevPx[i + 1]);
          const db = Math.abs(b - prevPx[i + 2]);
          motion = smoothstep(4, 28, (dr + dg + db) / 3);
        }

        const changed = smoothstep(18, 70, diff);
        const smokeLike = changed * smoothstep(35, 180, luminance) * (1 - smoothstep(0.28, 0.62, saturation));
        const effect = Math.max(changed, brightWarm * 0.95, motion * 0.75, smokeLike * 0.65);
        const alpha = Math.round(Math.max(0, Math.min(1, effect)) * sourceAlpha * 255);

        const spill = Math.max(0, g - Math.max(r, b));
        const cleanG = Math.round(g - spill * 0.42);
        fireMask[i] = r;
        fireMask[i + 1] = cleanG;
        fireMask[i + 2] = b;
        fireMask[i + 3] = alpha;
      }

      const fireMaskImage = new ImageData(fireMask, SOURCE_W, SOURCE_H);
      fireMaskCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      fireMaskCtx.putImageData(fireMaskImage, 0, 0);

      const fireCtx = fireCanvas.getContext("2d");
      if (fireCtx) {
        fireCtx.clearRect(0, 0, W, H);
        fireCtx.imageSmoothingEnabled = true;
        const masked = document.createElement("canvas");
        masked.width = SOURCE_W;
        masked.height = SOURCE_H;
        const mCtx = masked.getContext("2d");
        if (mCtx) {
          mCtx.drawImage(video, 0, 0, SOURCE_W, SOURCE_H);
          mCtx.globalCompositeOperation = "destination-in";
          mCtx.drawImage(fireMaskCanvas.current!, 0, 0);
          mCtx.globalCompositeOperation = "source-over";
          fireCtx.drawImage(masked, 0, 0, W, H);
        }
      }

      const burnHasReachedEnd =
        progress >= 0.995 ||
        video.currentTime >= duration - 0.15 ||
        video.ended;

      if (burnHasReachedEnd && !videoEndedRef.current) {
        console.log("BURN TRACE: VIDEO REACHED END", {
          progress: Number(progress.toFixed(4)),
          currentTime: Number(video.currentTime.toFixed(3)),
          duration: Number(duration.toFixed(3)),
          videoEnded: video.ended,
        });
        videoEndedRef.current = true;
        const mask = burnMask.current;
        const alphaArr = lowResPaperAlpha.current;
        if (alphaArr) {
          for (let i = 0; i < SOURCE_W * SOURCE_H; i++) {
            if (alphaArr[i] > 0) mask[i] = 1;
          }
        }
        burnMaskDirty.current = true;
        finalRenderPending.current = true;
      }

      if (timeChanged && !videoEndedRef.current && !compositorEnded.current) {
        const mask = burnMask.current;
        const alphaArr = lowResPaperAlpha.current;
        if (!alphaArr) { scheduleNext(); return; }
        const w = SOURCE_W;
        const h = SOURCE_H;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const fireAlpha = fireMask[idx * 4 + 3] / 255;
            if (fireAlpha < 0.025) continue;
            if (alphaArr[idx] <= 0.01) continue;
            const heatGain = 0.008 + fireAlpha * 0.024;
            mask[idx] = Math.min(1, mask[idx] + heatGain * fireAlpha * 0.6);
          }
        }

        const temp = tempDiffusion.current;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            let sum = mask[idx] * 0.6;
            let wsum = 0.6;
            if (x > 0 && alphaArr[idx - 1] > 0.01) { sum += mask[idx - 1] * 0.2; wsum += 0.2; }
            if (x < w - 1 && alphaArr[idx + 1] > 0.01) { sum += mask[idx + 1] * 0.2; wsum += 0.2; }
            temp[idx] = wsum > 0 ? sum / wsum : mask[idx];
          }
        }
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            let sum = temp[idx] * 0.6;
            let wsum = 0.6;
            if (y > 0 && alphaArr[idx - w] > 0.01) { sum += temp[idx - w] * 0.2; wsum += 0.2; }
            if (y < h - 1 && alphaArr[idx + w] > 0.01) { sum += temp[idx + w] * 0.2; wsum += 0.2; }
            mask[idx] = wsum > 0 ? Math.min(1, sum / wsum) : temp[idx];
          }
        }
        burnMaskDirty.current = true;
      }

      if (burnMaskDirty.current && lowResPaperData.current) {
        const paperData = lowResPaperData.current;
        const alphaArr = lowResPaperAlpha.current!;
        const mask = burnMask.current;
        const comp = compositeData.current;
        const burnImg = burnMaskImageData.current;
        const charImg = charImageData.current;
        const edgeImg = edgeImageData.current;

        const isFinal = finalRenderPending.current;

        for (let y = 0; y < SOURCE_H; y++) {
          for (let x = 0; x < SOURCE_W; x++) {
            const idx = y * SOURCE_W + x;
            const paperAlpha = alphaArr[idx] / 255;
            if (paperAlpha < 0.01) {
              const mi = idx * 4;
              comp[mi] = 0; comp[mi + 1] = 0; comp[mi + 2] = 0; comp[mi + 3] = 0;
              burnImg[mi] = 0; burnImg[mi+1] = 0; burnImg[mi+2] = 0; burnImg[mi+3] = 0;
              charImg[mi] = 0; charImg[mi+1] = 0; charImg[mi+2] = 0; charImg[mi+3] = 0;
              edgeImg[mi] = 0; edgeImg[mi+1] = 0; edgeImg[mi+2] = 0; edgeImg[mi+3] = 0;
              continue;
            }
            const d = mask[idx];
            const organic = 0.045 * Math.sin(x * 0.31 + y * 0.17) +
              0.028 * Math.sin(x * 0.067 - y * 0.21) +
              0.018 * Math.sin((x + y) * 0.43);
            const consumed = smoothstep(0.56 + organic, 0.86 + organic, d);
            const survival = paperAlpha * (1 - consumed);

            const mi = idx * 4;
            burnImg[mi] = 255; burnImg[mi+1] = 255; burnImg[mi+2] = 255; burnImg[mi+3] = Math.round(survival * 255);

            if (isFinal) {
              charImg[mi] = 0; charImg[mi+1] = 0; charImg[mi+2] = 0; charImg[mi+3] = 0;
              edgeImg[mi] = 0; edgeImg[mi+1] = 0; edgeImg[mi+2] = 0; edgeImg[mi+3] = 0;

              const ashPatch = 0.5 + 0.5 * Math.sin(x * 0.53 + y * 0.29) * Math.sin(x * 0.17 - y * 0.41);
              const ashAlpha = paperAlpha * Math.max(0, Math.min(1, 0.04 + ashPatch * 0.09));
              comp[mi] = 42; comp[mi+1] = 37; comp[mi+2] = 32; comp[mi+3] = Math.round(ashAlpha * 255);
            } else {
              const charStrength = paperAlpha * smoothstep(0.18, 0.58, d) * (1 - consumed * 0.65);
              charImg[mi] = 32; charImg[mi+1] = 20; charImg[mi+2] = 12; charImg[mi+3] = Math.round(charStrength * 150);

              const activeEdge = paperAlpha * smoothstep(0.20, 0.42, d) * (1 - smoothstep(0.55, 0.78, d));
              edgeImg[mi] = 255; edgeImg[mi+1] = 108; edgeImg[mi+2] = 22; edgeImg[mi+3] = Math.round(activeEdge * 52);

              const pr = paperData[mi], pg = paperData[mi+1], pb = paperData[mi+2];
              comp[mi] = pr; comp[mi+1] = pg; comp[mi+2] = pb; comp[mi+3] = Math.round(survival * 255);
            }
          }
        }

        const compCanvas = lowResCompositeCanvas.current;
        const burnMaskCanvas = lowResBurnMaskCanvas.current;
        const charCanvas = lowResCharCanvas.current;
        const edgeCanvas = lowResEdgeCanvas.current;

        if (compCanvas && burnMaskCanvas && charCanvas && edgeCanvas) {
          const compCtx = compCanvas.getContext("2d");
          const burnCtx = burnMaskCanvas.getContext("2d");
          const charCtx = charCanvas.getContext("2d");
          const edgeCtx = edgeCanvas.getContext("2d");

          if (compCtx && burnCtx && charCtx && edgeCtx) {
            const compImageData = new ImageData(comp, SOURCE_W, SOURCE_H);
            compCtx.putImageData(compImageData, 0, 0);

            const burnImageData = new ImageData(burnImg, SOURCE_W, SOURCE_H);
            burnCtx.putImageData(burnImageData, 0, 0);

            const charImageDataObj = new ImageData(charImg, SOURCE_W, SOURCE_H);
            charCtx.putImageData(charImageDataObj, 0, 0);

            const edgeImageDataObj = new ImageData(edgeImg, SOURCE_W, SOURCE_H);
            edgeCtx.putImageData(edgeImageDataObj, 0, 0);
          }
        }

        burnMaskDirty.current = false;
      }

      const burnCtx = burnCanvas.getContext("2d");
      if (burnCtx && lowResCompositeCanvas.current) {
        burnCtx.clearRect(0, 0, W, H);
        burnCtx.imageSmoothingEnabled = true;
        burnCtx.drawImage(lowResCompositeCanvas.current, 0, 0, W, H);

        if (!finalRenderPending.current && lowResCharCanvas.current && lowResEdgeCanvas.current) {
          burnCtx.globalCompositeOperation = "source-over";
          burnCtx.drawImage(lowResCharCanvas.current, 0, 0, W, H);
          burnCtx.globalCompositeOperation = "screen";
          burnCtx.drawImage(lowResEdgeCanvas.current, 0, 0, W, H);
          burnCtx.globalCompositeOperation = "source-over";
        }
      }

      if (hasPreviousRef.current) {
        previousFrameRef.current.set(px);
      } else {
        previousFrameRef.current.set(px);
        hasPreviousRef.current = true;
      }

      if (finalRenderPending.current && !compositorEnded.current) {
        console.log("BURN TRACE: FINAL RENDER -> freezing ash layer", {
          finalRenderPending: finalRenderPending.current,
          compositorEnded: compositorEnded.current,
        });

        const ashCanvas = ashCanvasRef.current;

        if (ashCanvas) {
          ashCanvas.width = W;
          ashCanvas.height = H;

          const ashCtx = ashCanvas.getContext("2d");

          if (ashCtx) {
            ashCtx.clearRect(0, 0, W, H);
            ashCtx.drawImage(burnCanvas, 0, 0, W, H);
          }
        }

        compositorEnded.current = true;
        setPaperBurned(true);
        ended = true;
        loopId.current = null;
        return;
      }

      scheduleNext();
    };

    renderActive.current = true;

    const startLoop = () => {
      if (video.readyState < 2) {
        video.addEventListener("loadeddata", startLoop, { once: true });
        return;
      }

      video.pause();
      video.currentTime = 0;
      sourceCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      sourceCtx.drawImage(video, 0, 0, SOURCE_W, SOURCE_H);
      const first = sourceCtx.getImageData(0, 0, SOURCE_W, SOURCE_H).data;
      initialFrameRef.current = new Uint8ClampedArray(first);
      previousFrameRef.current = new Uint8ClampedArray(first);
      hasInitialRef.current = true;
      hasPreviousRef.current = true;
      compositorReady.current = true;

      video.currentTime = 0;
      video.play().catch(() => { });
      videoEndedRef.current = false;

      if (typeof (video as any).requestVideoFrameCallback === "function") {
        (video as any).requestVideoFrameCallback(render);
      } else {
        loopId.current = requestAnimationFrame(render);
      }
    };

    startLoop();

    return () => {
      ended = true;
      renderActive.current = false;
      if (loopId.current !== null) {
        cancelAnimationFrame(loopId.current);
        loopId.current = null;
      }
      compositorStarted.current = false;
    };
  };

  // ─── START COMPOSITOR ────────────────────────────────────────────

  useEffect(() => {
    if (!burning) return;
    initCompositor();
  }, [burning]);

  // ─── STAGE 2: WORLD CHANGE ──────────────────────────────────────

  useEffect(() => {
    if (!paperBurned || worldChanged) return;
    console.log("BURN TRACE: paperBurned=true -> scheduling worldChanged");
    const timer = setTimeout(() => {
      console.log("BURN TRACE: setWorldChanged(true)");
      setWorldChanged(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [paperBurned, worldChanged]);

  // ─── SOUND: BURN ENDS ───────────────────────────────────────────────

  useEffect(() => {
    if (!paperBurned) return;
    const fire = fireAudio.current;
    if (fire) fadeAudio(fire, 0, 3000);
    
    const rain = rainAudio.current;
    if (rain) fadeAudio(rain, 0, 4000);
  }, [paperBurned]);

  // ─── SOUND: WORLD CHANGED (warm light + release) ────────────────────

  useEffect(() => {
    if (!worldChanged) return;
    
    const rain = rainAudio.current;
    const breathing = breathingAudio.current;
    const fire = fireAudio.current;
    const music = roomMusicAudio.current;
    
    if (rain) fadeAudio(rain, 0, 4500);
    if (breathing) fadeAudio(breathing, 0.025, 4000);
    if (fire) fadeAudio(fire, 0, 1400);
    if (music) fadeAudio(music, 0.15, 5000);

    const releaseTimer = window.setTimeout(() => {
      const release = releaseAudio.current;
      if (release) {
        release.currentTime = 0;
        release.volume = 0;
        release.play().catch(() => {});
        fadeAudio(release, 0.12, 1500);
        setTimeout(() => {
          fadeAudio(release, 0, 2000);
        }, 3000);
      }
    }, 1500);

    return () => clearTimeout(releaseTimer);
  }, [worldChanged]);

  // ─── POST-BURN SEQUENCE ─────────────────────────────────────────────

  useEffect(() => {
    if (!worldChanged || postBurnStage !== "idle") return;

    const timer = window.setTimeout(() => {
      console.log("SCENE01: setting postBurnStage to release", {
        paperBurned,
        worldChanged,
        postBurnStage,
        timestamp: new Date().toISOString(),
      });
      setReleased(true);
      setPostBurnStage("release");
    }, 9000);

    return () => window.clearTimeout(timer);
  }, [worldChanged, postBurnStage]);

  // ─── SOUND: RELEASE MESSAGE ─────────────────────────────────────────

  useEffect(() => {
    if (postBurnStage !== "release") return;
    
    const breathing = breathingAudio.current;
    const music = roomMusicAudio.current;
    
    if (breathing) fadeAudio(breathing, 0.04, 3000);
    if (music) fadeAudio(music, 0.18, 5000);
  }, [postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "release") return;

    const timer = window.setTimeout(() => {
      setAffirmationIndex(0);
      setShowAffirmations(true);
      setPostBurnStage("affirmation");
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [postBurnStage]);

  // ─── SOUND: AFFIRMATIONS ─────────────────────────────────────────────

  useEffect(() => {
    if (postBurnStage !== "affirmation") return;
    
    const breathing = breathingAudio.current;
    if (breathing) fadeAudio(breathing, 0.05, 4000);
  }, [postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "affirmation") return;

    let index = 0;
    let promptTimer: number | null = null;

    const timer = window.setInterval(() => {
      if (index >= affirmations.length - 1) {
        window.clearInterval(timer);

        promptTimer = window.setTimeout(() => {
          setShowAffirmations(false);
          setShowMemoryPrompt(true);
          setPostBurnStage("memory");
        }, 6500);

        return;
      }

      index += 1;
      setAffirmationIndex(index);
    }, 6500);

    return () => {
      window.clearInterval(timer);
      if (promptTimer !== null) window.clearTimeout(promptTimer);
    };
  }, [postBurnStage]);

  const openMemoryCard = () => {
    setShowMemoryPrompt(false);
    setShowCardCheckout(true);
    setPostBurnStage("checkout");
  };

  const skipMemoryCard = () => {
    setShowMemoryPrompt(false);
    setShowCardCheckout(false);
    setShowFinalExit(true);
    setPostBurnStage("final");
  };

  const handleCardPayment = () => {
    setShowCardCheckout(false);
    setShowCard(true);
    setPostBurnStage("card");
  };

  // ─── CARD HANDLERS ──────────────────────────────────────────────────

  const handleSaveCard = () => {
    // In a real implementation, this could trigger a download or print
    window.print();
  };

  const handleCardContinue = () => {
    setShowCard(false);
    setShowDonation(true);
    setPostBurnStage("donation");
  };

  // ─── RENDER ──────────────────────────────────────────────────────────

  return (
    <main className="scene">
      <audio ref={rainAudio} src="/audio/rain.mp3" preload="auto" />
      <audio ref={breathingAudio} src="/audio/breathing.mp3" preload="auto" />
      <audio ref={roomMusicAudio} src="/audio/room-music.mp3" preload="auto" />
      <audio ref={fireAudio} src="/audio/fire.mp3" preload="auto" />
      <audio ref={releaseAudio} src="/audio/release.mp3" preload="auto" />
      <audio ref={typingAudio} src="/audio/typing.mp3" preload="auto" />

      <motion.div
        ref={sceneCameraRef}
        className="scene-camera"
        initial={{ scale: 1, x: 0, y: 0 }}
        animate={{ scale: cameraTarget.scale, x: cameraTarget.x, y: cameraTarget.y }}
        transition={{ duration: started ? 5 : 12, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src="/assets/scene-01/person.png"
          className="layer person-breathing"
          alt=""
          animate={{ scaleY: [1, 1.007, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {staticLayers.map((layer) => (
          <motion.img
            key={layer}
            src={`/assets/scene-01/${layer}`}
            className="layer"
            alt=""
            animate={{ opacity: 1 }}
            transition={{ duration: 0 }}
          />
        ))}

        {/* ─── CENTERED NAME (appears on the paper) ─── */}
        {nameLocked && !paperBurned && (
          <motion.div
            ref={nameBurnRef}
            className="locked-name"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: burning ? 0 : 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {name}
          </motion.div>
        )}

        <canvas
          ref={burnCanvasRef}
          className={`burn-paper-canvas ${paperReady ? "burn-paper-canvas--active" : ""}`}
          aria-hidden="true"
        />

        <canvas
          ref={ashCanvasRef}
          className={`burn-ash-canvas ${paperBurned ? "burn-ash-canvas--visible" : ""}`}
          aria-hidden="true"
        />

        <canvas
          ref={nameBurnCanvasRef}
          className={`burn-name-canvas ${burning && !paperBurned ? "burn-name-canvas--active" : ""}`}
          aria-hidden="true"
        />

        <div className="burn-fire-window" aria-hidden="true">
          <canvas
            ref={fireCanvasRef}
            className="burn-fire-canvas burn-fire-canvas--active"
          />
          <video
            ref={fireVideoRef}
            className="burn-fire-source"
            src="/assets/scene-01/fire-sources.mp4"
            muted
            playsInline
            preload="auto"
          />
        </div>

        {/* ─── LAMP GLOW (with flicker) ─── */}
        <motion.div
          className="lamp-glow"
          animate={{
            opacity: flicker ? [0.8, 0.2, 0.8] : (worldChanged ? [0.5, 0.56, 0.5] : [0.48, 0.5, 0.48]),
            scale: flicker ? [1.05, 0.95, 1.05] : (worldChanged ? [1.02, 1.03, 1.02] : [1.03, 1.02, 1.03]),
          }}
          transition={{
            duration: flicker ? 0.3 : (worldChanged ? 6.5 : 30),
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.img
          src="/assets/scene-01/curtain.png"
          className="layer curtain"
          alt=""
          animate={{
            x: worldChanged ? [0, 8, -4, 6, 0] : [0, 0, -2, 0, 0],
            rotate: worldChanged ? [0, 0.12, -0.08, 0.12, 0] : [0, 0.5, -0.3, 0.4, 0],
          }}
          transition={{ duration: worldChanged ? 22 : 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <video
          className={`steam-video ${worldChanged ? "steam-video--warm" : ""}`}
          src="/assets/scene-01/steam.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        <motion.div
          className="rain"
          animate={{ opacity: worldChanged ? 0 : 1 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        >
          {rainDrops.map((drop, i) => (
            <span
              key={i}
              className="raindrop"
              style={{
                left: `${drop.left}%`,
                top: `${drop.top}%`,
                height: `${drop.length}px`,
                opacity: drop.opacity,
                animationDelay: `${drop.delay}s`,
                animationDuration: `${drop.duration}s`,
              }}
            />
          ))}
        </motion.div>

        <div className="film-grain" />

        {worldChanged && (
          <>
            <motion.div
              className="window-daylight"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: [0.85, 0.78, 0.85], scale: [1, 1.008, 1] }}
              transition={{
                duration: 8,
                delay: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-hidden="true"
            />
            <motion.div
              className="sun-rays"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: [0.85, 0.78, 0.85], x: 0 }}
              transition={{
                opacity: { duration: 8, delay: 0.7, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 8, delay: 0.7, ease: "easeOut" },
              }}
              aria-hidden="true"
            >
              <span className="sun-ray sun-ray-1" />
              <span className="sun-ray sun-ray-2" />
              <span className="sun-ray sun-ray-3" />
            </motion.div>
            <motion.div
              className="sunlight-patch"
              initial={{ opacity: 0, scale: 0.72, x: -20 }}
              animate={{ opacity: [0.38, 0.34, 0.38], scale: [1, 1.006, 1] }}
              transition={{
                duration: 8,
                delay: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-hidden="true"
            />
            <motion.div
              className="room-warmth"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.38, 0.34, 0.38] }}
              transition={{ duration: 8, delay: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
          </>
        )}
      </motion.div>

      {/* ─── BEGIN OVERLAY ──────────────────────────────────────────── */}
      <motion.div
        className="begin-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: introFinished && !started ? 1 : 0 }}
      >
        <div className="begin-scrim" />
        <motion.p
          className="begin-title"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, delay: 0.3 }}
        >
          LET GO
        </motion.p>
        <motion.div
          className="begin-divider"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.6 }}
        />
        <motion.p
          className="begin-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 2.4 }}
        >
          Some things are easier to release than to keep carrying.
        </motion.p>
        <motion.button
          className="begin-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 4.4 }}
          onClick={() => {
            toggleFullscreen();
            setStarted(true);
            startRoomAudio();
          }}
        >
          BEGIN
        </motion.button>
      </motion.div>

      {/* ─── PAPER INSTRUCTION (input and prompt) ──────────────────── */}
      <motion.div
        className="paper-instruction"
        initial={{ opacity: 0 }}
        animate={{ opacity: started && !paperBurned ? 1 : 0 }}
        transition={{ delay: 4.5, duration: 2 }}
      >
        {!nameLocked && (
          <>
            <p>Write the name you're ready to let go of.</p>
            <input
              className="name-input"
              type="text"
              placeholder="write their name..."
              autoComplete="off"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() !== "") {
                  setNameLocked(true);
                }
              }}
            />
          </>
        )}
      </motion.div>

      {/* ─── RELEASE MESSAGE ────────────────────────────────────────── */}
      <motion.div
        className="release-message"
        initial={{ opacity: 0 }}
        animate={{
          opacity: postBurnStage === "release" ? 1 : 0,
        }}
        transition={{ duration: 2.5, ease: "easeOut" }}
      >
        <div className="breathing-text">
          <p>You let it go.</p>
          <p className="release-breath">Take a breath.</p>
        </div>
      </motion.div>

      {/* ─── AFFIRMATIONS ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {postBurnStage === "affirmation" && (
          <motion.div
            key={`affirmation-${affirmationIndex}`}
            className="affirmation-sequence"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="breathing-text">{affirmations[affirmationIndex]}</p>
            <span className="affirmation-mark">—</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MEMORY PROMPT ───────────────────────────────────────────── */}
{/* ─── MEMORY PROMPT ───────────────────────────────────────────── */}
<AnimatePresence>
  {postBurnStage === "memory" && (
    <motion.div
      className="memory-prompt"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
    >
      <div className="memory-prompt-content">
        <p className="memory-prompt-title">Would you like to preserve this moment?</p>
        <p className="memory-prompt-subtitle">Keep a small reminder of what you chose to release.</p>
        <div className="memory-prompt-actions">
          <button className="memory-prompt-btn primary" onClick={openMemoryCard}>YES</button>
          <button className="memory-prompt-btn secondary" onClick={skipMemoryCard}>NO</button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* ─── CHECKOUT ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {postBurnStage === "checkout" && (
          <motion.div
            className="card-checkout"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="card-checkout-eyebrow">A SMALL KEEPSAKE</span>
            <p className="card-checkout-title">Keep a piece of this moment.</p>
            <p className="card-checkout-copy">
              A personalized LET GO card with their name
              and the date you chose to let go.
            </p>
            <div className="card-price">₹5</div>
            <button className="card-payment-button" onClick={handleCardPayment}>
              CREATE MY CARD — ₹5
            </button>
            <button className="card-payment-later" onClick={skipMemoryCard}>
              NOT NOW
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PERSONALIZED KEEPSAKE CARD ────────────────────────────────── */}

      {/* ─── PERSONALIZED KEEPSAKE CARD ────────────────────────────────── */}
{postBurnStage === "card" && (
  <>
    {/* Cinematic overlay */}
    <motion.div
      className="card-stage-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.6, ease: "easeOut" }}
    />
    {/* The keepsake card */}
    <motion.div
      className="keepsake-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="card-texture" />
      <div className="card-inner">
        {/* Decorative top ornament */}
        <div className="card-ornament top">
          <span className="ornament-line" />
          <span className="ornament-leaf" />
          <span className="ornament-leaf" />
          <span className="ornament-line" />
        </div>
        <p className="card-kicker">A MOMENT RELEASED</p>
        <h2 className="card-title">LET GO</h2>
        <div className="card-divider" />
        <p className="card-subtitle">You released</p>
        <p className="card-handwritten-name">{name}</p>
        <p className="card-date">
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="card-quote">You chose to let go.</p>
        {/* Decorative bottom ornament / landscape hint */}
        <div className="card-ornament bottom">
          <span className="ornament-line" />
          <span className="ornament-leaf" />
          <span className="ornament-leaf" />
          <span className="ornament-line" />
        </div>
        <div className="card-actions">
          <button className="card-action-save" onClick={handleSaveCard}>
            SAVE MY CARD
          </button>
          <button className="card-action-continue" onClick={handleCardContinue}>
            CONTINUE
          </button>
        </div>
      </div>
    </motion.div>
  </>
)}
   
      {/* ─── DONATION ──────────────────────────────────────────────────── */}
      {postBurnStage === "donation" && (
        <motion.div
          className="donation-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <div className="donation-card">
            <span className="donation-eyebrow">KEEP LET GO ALIVE</span>
            <p className="donation-title">If this moment helped you breathe a little easier, you can help keep LET GO here for someone else.</p>
            <p className="donation-note">Completely optional. The experience remains yours either way.</p>
            <button className="donation-primary-button" onClick={() => {
              setShowDonation(false);
              setShowFinalExit(true);
              setPostBurnStage("final");
            }}>SUPPORT LET GO</button>
            <button className="donation-secondary-button" onClick={() => {
              setShowDonation(false);
              setShowFinalExit(true);
              setPostBurnStage("final");
            }}>NOT NOW</button>
          </div>
        </motion.div>
      )}

      {/* ─── FINAL EXIT ────────────────────────────────────────────────── */}
      {postBurnStage === "final" && (
        <motion.div
          className="final-exit"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5 }}
        >
          <p>You can come back whenever you need to let something go.</p>
          <button onClick={() => window.location.reload()}>RETURN</button>
        </motion.div>
      )}
    </main>
  );
}