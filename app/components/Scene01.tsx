"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useMobileDetection } from "./useMobileDetection";

// ─── ASSET PATHS ────────────────────────────────────────────────────────────
const ASSET_BASE = "/assets/scene-01";
const AUDIO_BASE = "/assets/audio";

// Static layers – PERSON is rendered separately as a motion image, so do NOT include it here.
const staticLayers = [
  "BACKGROUND.png",
  "WINDOW.png",
  "TABLE.png",
  "CUP.png",
  "LAMP.png",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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

// ─── NAME FITTING HELPERS ──────────────────────────────────────────────────
// (all remain unchanged – omitted here for brevity, keep them as in your original file)
// ...

// ─── CONSTANTS (adjusted for mobile) ──────────────────────────────────────
const W = 1280;
const H = 720;

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function Scene01() {
  // ─── MOBILE DETECTION & ORIENTATION ──────────────────────────────
  const { isMobile, isLandscape } = useMobileDetection();
  const [showOrientationOverlay, setShowOrientationOverlay] = useState(
    isMobile && !isLandscape
  );

  useEffect(() => {
    if (!isMobile) return;
    const handle = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setShowOrientationOverlay(!landscape);
    };
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, [isMobile]);

  // ─── FLOW STATE ────────────────────────────────────────────────────
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [started, setStarted] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [showPaper, setShowPaper] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [paperBurned, setPaperBurned] = useState(false);
  const [name, setName] = useState("");

  // ─── OTHER STATES ──────────────────────────────────────────────────
  const [worldChanged, setWorldChanged] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [paperReady, setPaperReady] = useState(false);

  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale" | null>(null);
  const [showLetGoText, setShowLetGoText] = useState(false);
  const [releaseRaysOpacity, setReleaseRaysOpacity] = useState(0);
  const [dustOpacity, setDustOpacity] = useState(0);

  type PostBurnStage =
    | "idle"
    | "silence"
    | "breathing"
    | "breathPause"
    | "release"
    | "affirmation"
    | "memory"
    | "checkout"
    | "card"
    | "donation"
    | "final";

  const [postBurnStage, setPostBurnStage] = useState<PostBurnStage>("idle");
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [showCardCheckout, setShowCardCheckout] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showFinalExit, setShowFinalExit] = useState(false);

  // ─── REFS ──────────────────────────────────────────────────────────
  const nameOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameFullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameWipeRafRef = useRef<number | null>(null);
  const NAME_WIPE_DURATION_MS = 1400;

  const cardContentRef = useRef<HTMLDivElement | null>(null);
  const [cardNameFontSize, setCardNameFontSize] = useState(56);

  const rainAudio = useRef<HTMLAudioElement | null>(null);
  const roomAudio = useRef<HTMLAudioElement | null>(null);
  const fireAudio = useRef<HTMLAudioElement | null>(null);
  const clickAudio = useRef<HTMLAudioElement | null>(null);
  const inhaleAudio = useRef<HTMLAudioElement | null>(null);
  const exhaleAudio = useRef<HTMLAudioElement | null>(null);
  const subtleWindAudio = useRef<HTMLAudioElement | null>(null);
  const releaseAmbienceAudio = useRef<HTMLAudioElement | null>(null);

  const fireVideoRef = useRef<HTMLVideoElement | null>(null);
  const sceneCameraRef = useRef<HTMLDivElement | null>(null);

  const burnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fireCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ashCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeIntervals = useRef<Set<number>>(new Set());
  const activeTimeouts = useRef<Set<number>>(new Set());

  const trackedTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      activeTimeouts.current.delete(id);
      fn();
    }, ms);
    activeTimeouts.current.add(id);
    return id;
  };

  const trackedInterval = (fn: () => void, ms: number) => {
    const id = window.setInterval(fn, ms);
    activeIntervals.current.add(id);
    return id;
  };

  const clearTrackedInterval = (id: number) => {
    window.clearInterval(id);
    activeIntervals.current.delete(id);
  };

  useEffect(() => {
    return () => {
      activeTimeouts.current.forEach((id) => window.clearTimeout(id));
      activeIntervals.current.forEach((id) => window.clearInterval(id));
      [
        rainAudio,
        roomAudio,
        fireAudio,
        clickAudio,
        inhaleAudio,
        exhaleAudio,
        subtleWindAudio,
        releaseAmbienceAudio,
      ].forEach((ref) => {
        const audio = ref.current;
        if (audio) {
          audio.pause();
        }
      });
    };
  }, []);

  // ─── RAIN PARTICLES (mobile‑optimised) ────────────────────────────
  const rainDrops = Array.from(
    { length: isMobile ? 80 : 200 },
    (_, i) => ({
      left: (i * 11.73) % 85,
      top: (i * 17.41) % 100,
      delay: (i * 0.37) % 4,
      duration: 0.9 + ((i * 0.09) % 0.6),
      length: 14 + ((i * 16) % 22),
      opacity: 0.3 + ((i * 0.07) % 0.28),
    })
  );

  // ─── AUDIO HELPERS ──────────────────────────────────────────────────────
  // (all audio helper functions remain unchanged – keep them as in your original)
  // ...

  // ─── FULLSCREEN TOGGLE ─────────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── RESPONSIVE CAMERA ──────────────────────────────────────────────
  // (unchanged – but we can keep the existing logic; it already uses window.innerWidth)
  // ...

  // ─── LAMP FLICKER ──────────────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── GUIDE → BEGIN OVERLAY ─────────────────────────────────────
  // (unchanged)
  // ...

  // ─── BEGIN BUTTON → CAMERA MOVEMENT + PAPER ─────────────────────
  // (unchanged)
  // ...

  // ─── AUDIO ──────────────────────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── PAPER BURNING ─────────────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── PAPER PNG LOADING ─────────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── NAME WIPE ANIMATION ───────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── NAME RENDER ────────────────────────────────────────────────────
  // (unchanged)
  // ...

  // ─── COMPOSITOR ─────────────────────────────────────────────────────
  const SOURCE_W = isMobile ? 240 : 320;
  const SOURCE_H = isMobile ? 135 : 180;

  // All arrays initialised with these dimensions
  // ... (keep all the refs and logic, but when they are created, they use SOURCE_W/SOURCE_H)

  // Inside the initCompositor function, we conditionally skip vertical diffusion:
  // In the render function, find the vertical diffusion block and wrap it:
  /*
  if (!isMobile) {
    // vertical diffusion
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ...
      }
    }
  }
  */

  // Also, before calling video.play(), ensure the video is loaded:
  // if (video.readyState === 0) video.load();

  // (The compositor code is long – we'll include it but with the two changes above)

  // ─── POST-BURN SEQUENCE ────────────────────────────────────────────
  // (unchanged – keep all the trackedTimeout calls as they are, no timing changes)

  // ─── MEMORY PROMPT / CARD ──────────────────────────────────────────
  // (unchanged)

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <main className="scene">
      {/* Audio elements – preload="metadata" on mobile, "auto" on desktop if desired */}
      <audio ref={rainAudio} src={`${AUDIO_BASE}/rain.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={roomAudio} src={`${AUDIO_BASE}/room.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={fireAudio} src={`${AUDIO_BASE}/fire.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={clickAudio} src={`${AUDIO_BASE}/click.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={inhaleAudio} src={`${AUDIO_BASE}/inhale.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={exhaleAudio} src={`${AUDIO_BASE}/exhale.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={subtleWindAudio} src={`${AUDIO_BASE}/subtle-wind.mp3`} preload={isMobile ? "metadata" : "auto"} />
      <audio ref={releaseAmbienceAudio} src={`${AUDIO_BASE}/release-ambience.mp3`} preload={isMobile ? "metadata" : "auto"} />

      <motion.div
        ref={sceneCameraRef}
        className="scene-camera"
        initial={{ scale: 1, x: 0, y: 0 }}
        animate={{ scale: cameraTarget.scale, x: cameraTarget.x, y: cameraTarget.y }}
        transition={{ duration: started ? 5 : 12, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="breath-scale-wrapper"
          animate={
            postBurnStage === "breathing"
              ? { scale: breathPhase === "inhale" ? 1.004 : 1 }
              : { scale: 1 }
          }
          transition={{ duration: 4, ease: "easeInOut" }}
        >
          <motion.img
            src={`${ASSET_BASE}/PERSON.png`}
            className="layer person-breathing"
            alt=""
            animate={{ scaleY: [1, 1.007, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {staticLayers.map((layer) => (
            <motion.img
              key={layer}
              src={`${ASSET_BASE}/${layer}`}
              className="layer"
              alt=""
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
            />
          ))}

          <canvas
            ref={burnCanvasRef}
            className={`burn-paper-canvas ${paperReady ? "burn-paper-canvas--active" : ""}`}
            aria-hidden="true"
          />

          <canvas
            ref={nameOverlayCanvasRef}
            className="name-overlay-canvas"
            aria-hidden="true"
          />

          <canvas
            ref={ashCanvasRef}
            className={`burn-ash-canvas ${paperBurned ? "burn-ash-canvas--visible" : ""}`}
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
              src={`${ASSET_BASE}/fire-sources.mp4`}
              muted
              playsInline
              preload={isMobile ? "metadata" : "auto"}
            />
          </div>

          {/* ─── ASH WARM GLOW ─── */}
          {paperBurned && (
            <motion.div
              className="ash-warm-glow"
              style={{ opacity: releaseRaysOpacity > 0 ? Math.min(1, releaseRaysOpacity / 0.17) : 0 }}
              aria-hidden="true"
            />
          )}

          {/* ─── LAMP GLOW ─── */}
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

          {/* ─── CURTAIN ─── */}
          <motion.img
            src={`${ASSET_BASE}/CURTAIN.png`}
            className="layer curtain"
            alt=""
            animate={
              postBurnStage === "breathing"
                ? { x: breathPhase === "inhale" ? [0, 3] : [3, 0], rotate: breathPhase === "inhale" ? [0, 0.15] : [0.15, 0] }
                : worldChanged
                ? { x: [0, 9, -4, 6, 0], rotate: [0, 0.14, -0.08, 0.12, 0] }
                : { x: [0, 0, -2, 0, 0], rotate: [0, 0.5, -0.3, 0.4, 0] }
            }
            transition={
              postBurnStage === "breathing"
                ? { duration: 2, ease: "easeInOut" }
                : { duration: worldChanged ? 22 : 15, repeat: Infinity, ease: "easeInOut" }
            }
          />

          <video
            className={`steam-video ${worldChanged ? "steam-video--warm" : ""}`}
            src={`${ASSET_BASE}/steam.mp4`}
            autoPlay
            loop
            muted
            playsInline
          />

          <motion.div
            className="rain"
            animate={{ opacity: paperBurned ? 0 : 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
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

          {/* ─── RELEASE RAYS & DUST ────────────────────────────────── */}
          {(postBurnStage === "release" ||
            postBurnStage === "memory" ||
            postBurnStage === "checkout" ||
            postBurnStage === "card" ||
            postBurnStage === "donation" ||
            postBurnStage === "final") && (
            <>
              <motion.img
                src={`${ASSET_BASE}/release/release-rays.png`}
                className="release-rays"
                style={{
                  opacity: releaseRaysOpacity,
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "1672px",
                  height: "941px",
                  objectFit: "cover",
                  pointerEvents: "none",
                  zIndex: 35,
                }}
                initial={{ scale: 1, x: 0, y: 0 }}
                animate={{
                  scale: [1, 1.02, 1.01, 1.03, 1],
                  x: [0, 2, -1, 1, 0],
                  y: [0, -1, 1, 0, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src={`${ASSET_BASE}/release/release-dust.png`}
                className="release-dust"
                style={{
                  opacity: dustOpacity,
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "1672px",
                  height: "941px",
                  objectFit: "cover",
                  pointerEvents: "none",
                  zIndex: 36,
                }}
                animate={{ x: [0, 3, -2, 1, 0], y: [0, -1, 2, 0, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}

          {/* ─── WARM LIGHT OVERLAY ────────────────────────────────── */}
          {worldChanged && (
            <motion.div
              className="room-warmth-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0.12, 0.18, 0.14] }}
              transition={{ duration: 12, ease: "easeOut" }}
            />
          )}

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
      </motion.div>

      {/* ─── IMMERSION GUIDE ────────────────────────────────────────── */}
      <AnimatePresence>
        {!guideDismissed && !started && (
          <motion.div
            className="immersion-guide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            onPointerDown={() => {
              setGuideDismissed(true);
              playOnce(clickAudio.current, 0.15);
            }}
          >
            <div className="immersion-guide-content">
              <p className="guide-eyebrow">BEFORE YOU BEGIN</p>
              <h2 className="guide-title">IMMERSE YOURSELF</h2>
              <div className="guide-divider" />

              <ul className="guide-list">
                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                  </span>
                  <span>Use headphones for a richer, more intimate experience.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </span>
                  <span>Follow the text as it appears — let it guide your focus.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M2 10v4M6 6v12M10 8v8M14 4v16M18 6v12M22 10v4" />
                    </svg>
                  </span>
                  <span>Attune to the surrounding audio scene. Let it hold you.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </span>
                  <span>Bring your emotions exactly as they are.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span>There is no rush. Take your time.</span>
                </li>
              </ul>

              <p className="guide-all-the-best">All the best.</p>
              <p className="guide-dismiss">(tap anywhere to continue)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── RITUAL BEGIN OVERLAY ────────────────────────────────────── */}
      <AnimatePresence>
        {introFinished && !showPaper && !nameLocked && !started && (
          <motion.div
            className="begin-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
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
              onClick={handleBeginRitual}
            >
              BEGIN
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAPER INSTRUCTION ───────────────────────────────────────── */}
      <motion.div
        className="paper-instruction"
        initial={{ opacity: 0 }}
        animate={{ opacity: showPaper && !paperBurned ? 1 : 0 }}
        transition={{ delay: showPaper ? 4.5 : 0, duration: 2 }}
      >
        {!nameLocked && (
          <>
            <p>Write the name you're ready to let go of.</p>
            <input
              className="name-input"
              type="text"
              placeholder="write their name..."
              autoComplete="off"
              maxLength={70}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() !== "") {
                  setNameLocked(true);
                  playOnce(clickAudio.current, 0.2);
                }
              }}
            />
          </>
        )}
      </motion.div>

      {/* ─── BREATHING PHASE ────────────────────────────────────────── */}
      {postBurnStage === "breathing" && breathPhase && (
        <motion.div
          className="breathing-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 4 }}
        >
          <p className="breath-label">
            {breathPhase === "inhale" ? "INHALE" : "EXHALE"}
            <span className="breath-sub">{breathPhase === "inhale" ? "吸う" : "吐く"}</span>
          </p>
        </motion.div>
      )}

      {/* ─── AFFIRMATION PHASE ────────────────────────────────────────── */}
      {postBurnStage === "affirmation" && (
        <motion.div
          className="affirmation-sequence"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 4 }}
        >
          <div className="affirmation-line">
            <span className="affirmation-en">You can put it down now.</span>
            <span className="affirmation-jp">もう、手放していい。</span>
          </div>
          <div className="affirmation-line">
            <span className="affirmation-en">You don't have to carry it anymore.</span>
            <span className="affirmation-jp">もう、抱えていかなくていい。</span>
          </div>
          <div className="affirmation-line">
            <span className="affirmation-en">What happened can stay in the past.</span>
            <span className="affirmation-jp">起きたことは、過去に置いていい。</span>
          </div>
          <div className="affirmation-line">
            <span className="affirmation-en">You are free to move forward.</span>
            <span className="affirmation-jp">これから先へ、進んでいい。</span>
          </div>
        </motion.div>
      )}

      {/* ─── LET GO TEXT ───────────────────────────────────────────── */}
      {showLetGoText && postBurnStage === "release" && (
        <motion.div
          className="let-go-text-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4, ease: "easeOut" }}
        >
          <p className="let-go-text">LET GO</p>
          <p className="let-go-sub">手放す</p>
        </motion.div>
      )}

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
                <button className="memory-prompt-btn primary" onClick={() => { openMemoryCard(); playOnce(clickAudio.current, 0.2); }}>
                  YES
                </button>
                <button className="memory-prompt-btn secondary" onClick={() => { skipMemoryCard(); playOnce(clickAudio.current, 0.2); }}>
                  NO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CHECKOUT ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {postBurnStage === "checkout" && (
          <div className="card-checkout-stage">
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
              <button className="card-payment-button" onClick={() => { handleCardPayment(); playOnce(clickAudio.current, 0.2); }}>
                CREATE MY CARD — ₹5
              </button>
              <button className="card-payment-later" onClick={() => { skipMemoryCard(); playOnce(clickAudio.current, 0.2); }}>
                NOT NOW
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PERSONALIZED KEEPSAKE CARD ────────────────────────────────── */}
      {postBurnStage === "card" && (
        <>
          <motion.div
            className="card-stage-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          />
          <div className="keepsake-card-stage">
            <motion.div
              className="keepsake-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="card-paper-texture" aria-hidden="true" />
              <div className="card-inner-frame" aria-hidden="true" />

              <motion.img
                src={`${ASSET_BASE}/card/botanical.png`}
                className="card-botanical card-botanical-top"
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.80 }}
                transition={{ duration: 1.6, delay: 1.0 }}
              />

              <div className="card-content" ref={cardContentRef}>
                <motion.p
                  className="card-kicker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.3, delay: 1.2 }}
                >
                  A MOMENT RELEASED
                </motion.p>

                <motion.img
                  src={`${ASSET_BASE}/card/ornament.png`}
                  className="card-ornament-img"
                  alt=""
                  aria-hidden="true"
                  initial={{ opacity: 0, scaleX: 0.6 }}
                  animate={{ opacity: 20, scaleX: 2 }}
                  transition={{ duration: 1.2, delay: 1.4 }}
                />

                <motion.h2
                  className="card-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.6, delay: 1.6 }}
                >
                  <span className="card-title-en">LET GO</span>
                  <span className="card-title-jp">手放す</span>
                </motion.h2>

                <motion.div
                  className="card-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.6, delay: 2.0 }}
                >
                  <p className="card-subtitle">You released</p>
                  <p className="card-handwritten-name" style={{ fontSize: `${cardNameFontSize}px` }}>{name}</p>
                  <p className="card-date">
                    {new Date()
                      .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                      .toUpperCase()}
                  </p>
                  <p className="card-quote">You chose to let go.</p>
                </motion.div>
              </div>

              <motion.img
                src={`${ASSET_BASE}/card/landscape.png`}
                className="card-landscape"
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 2, delay: 2.2 }}
              />

              <motion.img
                src={`${ASSET_BASE}/card/botanical-bottom.png`}
                className="card-botanical card-botanical-bottom"
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 1.6, delay: 2.3 }}
              />

              <motion.div
                className="card-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.3, delay: 2.5 }}
              >
                <button
                  className="card-action-save"
                  aria-label="Save my card"
                  onClick={() => { handleSaveCard(); playOnce(clickAudio.current, 0.2); }}
                >
                  SAVE MY CARD
                </button>
                <button
                  className="card-action-continue"
                  aria-label="Continue"
                  onClick={() => { handleCardContinue(); playOnce(clickAudio.current, 0.2); }}
                >
                  CONTINUE
                </button>
              </motion.div>
            </motion.div>
          </div>
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
            <button className="donation-primary-button" onClick={() => { setShowDonation(false); setShowFinalExit(true); setPostBurnStage("final"); playOnce(clickAudio.current, 0.2); }}>
              SUPPORT LET GO
            </button>
            <button className="donation-secondary-button" onClick={() => { setShowDonation(false); setShowFinalExit(true); setPostBurnStage("final"); playOnce(clickAudio.current, 0.2); }}>
              NOT NOW
            </button>
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
          <button onClick={() => { window.location.reload(); playOnce(clickAudio.current, 0.2); }}>
            RETURN
          </button>
        </motion.div>
      )}

      {/* ─── ORIENTATION OVERLAY (mobile portrait) ──────────────────── */}
      {showOrientationOverlay && (
        <motion.div
          className="orientation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          <div className="orientation-content">
            <p className="orientation-prompt">TURN YOUR PHONE</p>
            <p className="orientation-sub">SIDEWAYS</p>
            <p className="orientation-hint">A wider view awaits.</p>
            <div className="rotation-cue" />
          </div>
        </motion.div>
      )}
    </main>
  );
}