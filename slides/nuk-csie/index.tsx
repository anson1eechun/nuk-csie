import {
  type DesignSystem,
  type Page,
  type SlideMeta,
  type SlideTransition,
  useIsActivePage,
  useSlidePageNumber,
} from '@open-slide/core';
import { animate, MotionConfig, motion, useAnimationFrame } from 'motion/react';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import awardCrossStrait from './assets/award-crossstrait.jpg';
import awardNational from './assets/award-national.jpg';
import headshot from './assets/headshot.jpg';
import nukLogo from './assets/nuk-logo.png';
import plusrepPoster from './assets/plusrep-poster.jpg';
import rehabSeated from './assets/rehab-seated.jpg';
import appPoster from './assets/zaoxingzhe-poster.jpg';

const appVideo = new URL('./assets/zaoxingzhe.mp4', import.meta.url).href;
const plusrepVideo = new URL('./assets/plusrep.mp4', import.meta.url).href;

// ─── Design tokens ───────────────────────────────────────────────────────────
// Gold and grey come from the NUK emblem; the deck reads as a camera viewfinder.

export const design: DesignSystem = {
  palette: { bg: '#0c0e13', text: '#eef0f4', accent: '#f6b81a' },
  fonts: {
    display: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif',
    body: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif',
  },
  typeScale: { hero: 176, body: 32 },
  radius: 16,
};

const MONO = '"JetBrains Mono", "SF Mono", Menlo, Consolas, "Noto Sans TC", monospace';
const cool = '#8fb4d9';
const coral = '#ff7b6b';
const muted = '#a3abb9';
const dim = 'rgba(163, 171, 185, 0.62)';
const line = 'rgba(246, 184, 26, 0.28)';
const panel = 'rgba(24, 28, 37, 0.72)';
const PAD = 120;
const EASE = [0.22, 1, 0.36, 1] as const;
// The cover's name and photo link here (also carried into the PDF/PPTX exports).
const SITE_URL = 'https://anson1eechun.github.io/nuk-csie/s/nuk-csie/';

// ─── Fonts + ambient keyframes (injected once per document) ─────────────────

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700;900&display=swap';
const FONT_LINK_ID = 'osd-webfont-nuk-csie';
const STYLE_ID = 'osd-styles-nuk-csie';
const css = `
@keyframes vf-scan { 0% { transform: translateY(-200px); } 100% { transform: translateY(1280px); } }
@keyframes vf-sweep { 0%,100% { top: 4%; } 50% { top: 94%; } }
@keyframes vf-spin { to { transform: rotate(360deg); } }
@keyframes vf-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
@keyframes vf-nudge { 0%,100% { transform: translateX(0); opacity: 0.4; } 50% { transform: translateX(14px); opacity: 1; } }
@keyframes vf-shimmer { 0% { background-position: 160% 0; } 100% { background-position: -60% 0; } }
@keyframes vf-hatch { to { background-position: 28px 0; } }
`;
if (typeof document !== 'undefined') {
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== FONT_HREF) link.href = FONT_HREF;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

// ─── Motion helpers ──────────────────────────────────────────────────────────
// Every entrance is gated on useIsActivePage(): thumbnails, the overview grid,
// and print render the settled final state; only the live page plays.

// Entrances blur in, but must settle on no filter at all: a lingering
// `blur(0px)` makes Chrome's PDF export rasterise the whole subtree.
const unblur = (live: boolean) =>
  live ? { filter: 'blur(0px)', transitionEnd: { filter: 'none' } } : {};

const Rise = ({
  delay = 0,
  y = 28,
  style,
  children,
}: {
  delay?: number;
  y?: number;
  style?: CSSProperties;
  children: ReactNode;
}) => {
  const live = useIsActivePage();
  return (
    <motion.div
      style={style}
      initial={live ? { opacity: 0, y, filter: 'blur(8px)' } : false}
      animate={{ opacity: 1, y: 0, ...unblur(live) }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

const SplitText = ({
  text,
  delay = 0,
  stagger = 0.035,
}: {
  text: string;
  delay?: number;
  stagger?: number;
}) => {
  const live = useIsActivePage();
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          initial={live ? { opacity: 0, y: '0.45em', filter: 'blur(10px)' } : false}
          animate={{ opacity: 1, y: 0, ...unblur(live) }}
          transition={{ duration: 0.7, delay: delay + i * stagger, ease: EASE }}
        >
          {ch}
        </motion.span>
      ))}
    </>
  );
};

const CountUp = ({
  to,
  from = 0,
  decimals = 0,
  delay = 0,
  duration = 1.6,
}: {
  to: number;
  from?: number;
  decimals?: number;
  delay?: number;
  duration?: number;
}) => {
  const live = useIsActivePage();
  const [v, setV] = useState(live ? from : to);
  useEffect(() => {
    if (!live) return;
    const controls = animate(from, to, { duration, delay, ease: EASE, onUpdate: setV });
    return () => controls.stop();
  }, [live, from, to, delay, duration]);
  return <>{v.toFixed(decimals)}</>;
};

// ─── Sensor backdrop + viewfinder HUD (shared by every page) ─────────────────

const Sensor = () => {
  const live = useIsActivePage();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 8% -12%, rgba(246,184,26,0.16), rgba(246,184,26,0) 46%), radial-gradient(circle at 96% 108%, rgba(143,180,217,0.10), rgba(143,180,217,0) 42%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(238,240,244,0.075) 1.4px, rgba(238,240,244,0) 1.8px)',
          backgroundSize: '40px 40px',
          backgroundPosition: '20px 20px',
        }}
      />
      {live && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 200,
            background: 'linear-gradient(180deg, rgba(246,184,26,0), rgba(246,184,26,0.03) 92%, rgba(246,184,26,0.08) 100%)',
            willChange: 'transform',
            animation: 'vf-scan 9s linear infinite',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0, 0, 0, 0.5) 100%)',
        }}
      />
    </div>
  );
};

// Four L-shaped brackets; `inset` is how far each sits from its box's edges.
const Brackets = ({ inset, arm, width, color }: { inset: number; arm: number; width: number; color: string }) => (
  <>
    {(
      [
        { left: inset, top: inset, borderLeft: 1, borderTop: 1 },
        { right: inset, top: inset, borderRight: 1, borderTop: 1 },
        { left: inset, bottom: inset, borderLeft: 1, borderBottom: 1 },
        { right: inset, bottom: inset, borderRight: 1, borderBottom: 1 },
      ] as const
    ).map((c, i) => {
      const b = `${width}px solid ${color}`;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 'left' in c ? c.left : undefined,
            right: 'right' in c ? c.right : undefined,
            top: 'top' in c ? c.top : undefined,
            bottom: 'bottom' in c ? c.bottom : undefined,
            width: arm,
            height: arm,
            borderLeft: 'borderLeft' in c ? b : undefined,
            borderRight: 'borderRight' in c ? b : undefined,
            borderTop: 'borderTop' in c ? b : undefined,
            borderBottom: 'borderBottom' in c ? b : undefined,
          }}
        />
      );
    })}
  </>
);

const SEG_W = 26;
const SEG_GAP = 6;
let lastPage = 1;

// Top-right progress track: the gold marker glides over from the previous page.
const Track = () => {
  const live = useIsActivePage();
  const { current, total } = useSlidePageNumber();
  const [from] = useState(() => (live ? lastPage : current));
  useEffect(() => {
    if (live) lastPage = current;
  }, [live, current]);
  const xOf = (p: number) => (p - 1) * (SEG_W + SEG_GAP);
  return (
    <div style={{ position: 'absolute', right: 64, top: 58, width: total * (SEG_W + SEG_GAP) - SEG_GAP, height: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: xOf(i + 1),
            width: SEG_W,
            height: 4,
            borderRadius: 2,
            background: i + 1 < current ? 'rgba(246,184,26,0.4)' : 'rgba(163,171,185,0.22)',
          }}
        />
      ))}
      <motion.div
        style={{ position: 'absolute', top: -1, width: SEG_W, height: 6, borderRadius: 3, background: 'var(--osd-accent)', boxShadow: '0 0 14px rgba(246,184,26,0.7)' }}
        initial={{ left: xOf(from) }}
        animate={{ left: xOf(current) }}
        transition={{ duration: 1.1, ease: EASE }}
      />
    </div>
  );
};

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        left: PAD,
        right: PAD,
        bottom: 38,
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: MONO,
        fontSize: 22,
        color: dim,
      }}
    >
      <span>李鈞盛 ｜ 國立高雄大學 資訊工程學系碩士班 推甄補充資料</span>
      <span>
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  );
};

const Frame = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user">
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <Sensor />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Brackets inset={36} arm={40} width={2} color={line} />
      </div>
      <Track />
      {children}
      <Footer />
    </div>
  </MotionConfig>
);

// The editor saves a text edit by following a plain `{prop}` back to the page's
// <Header prop="…"> call, so each piece of text sits alone in its own element.
const Header = ({ no, kicker, title, sub }: { no: string; kicker: string; title: string; sub?: string }) => {
  const live = useIsActivePage();
  return (
    <div style={{ position: 'absolute', left: PAD, top: 96, right: 260 }}>
      <Rise delay={0.05}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: '0.12em', color: 'var(--osd-accent)' }}>
          <span>{no}</span> <span style={{ color: dim }}>//</span> <span>{kicker}</span>
        </div>
      </Rise>
      <motion.div
        initial={live ? { opacity: 0, y: 24, filter: 'blur(10px)', clipPath: 'inset(-25% 100% -25% 0%)' } : false}
        animate={
          live
            ? {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                clipPath: 'inset(-25% 0% -25% 0%)',
                transitionEnd: { filter: 'none', clipPath: 'none' },
              }
            : {}
        }
        transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
      >
        <h2
          style={{
            margin: '18px 0 0',
            fontFamily: 'var(--osd-font-display)',
            fontSize: 68,
            fontWeight: 900,
            lineHeight: 1.2,
            letterSpacing: '0.01em',
          }}
        >
          {title}
        </h2>
      </motion.div>
      {sub && (
        <Rise delay={0.45}>
          <p style={{ margin: '14px 0 0', fontSize: 28, lineHeight: 1.5, color: muted }}>{sub}</p>
        </Rise>
      )}
    </div>
  );
};

const Chip = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 20px',
      borderRadius: 999,
      fontSize: 26,
      color: 'var(--osd-accent)',
      border: `1.5px solid ${line}`,
      background: 'rgba(246,184,26,0.07)',
    }}
  >
    {children}
  </span>
);

// ─── 1. Cover ────────────────────────────────────────────────────────────────

const CARD_X = 1210;
const CARD_Y = 200;
const CARD_W = 470;
const CARD_H = 600;

const Viewfinder = () => {
  const live = useIsActivePage();
  return (
    <>
      {/* The emblem's gold disc, echoed behind the photo. */}
      <motion.div
        style={{
          position: 'absolute',
          left: CARD_X + CARD_W / 2 - 330,
          top: CARD_Y + CARD_H / 2 - 360,
          width: 660,
          height: 660,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 38%, rgba(246,184,26,0.30), rgba(246,184,26,0.06) 62%, rgba(246,184,26,0) 72%)',
        }}
        initial={live ? { opacity: 0, scale: 0.8 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, delay: 0.1, ease: EASE }}
      />
      <div
        style={{
          position: 'absolute',
          left: CARD_X + CARD_W / 2 - 380,
          top: CARD_Y + CARD_H / 2 - 380,
          width: 760,
          height: 760,
          borderRadius: '50%',
          border: `2px dashed ${line}`,
          animation: live ? 'vf-spin 60s linear infinite' : 'none',
        }}
      />
      <motion.div
        style={{ position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H }}
        initial={live ? { opacity: 0, y: 40, scale: 0.94 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.25, ease: EASE }}
      >
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            borderRadius: 20,
            overflow: 'hidden',
            border: `1px solid ${line}`,
            boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          }}
        >
          <img
            src={headshot}
            alt="李鈞盛"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
          />
          {live && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 3,
                background: 'var(--osd-accent)',
                boxShadow: '0 0 24px 6px rgba(246,184,26,0.45)',
                opacity: 0.7,
                animation: 'vf-sweep 5s ease-in-out 1.6s infinite',
              }}
            />
          )}
        </a>
        {/* Detection box snaps in from a wider frame. */}
        <motion.div
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          initial={live ? { opacity: 0, scale: 1.12 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 1.0 }}
        >
          <Brackets inset={-18} arm={64} width={5} color="var(--osd-accent)" />
          <div
            style={{
              position: 'absolute',
              left: -18,
              top: -64,
              padding: '6px 16px',
              borderRadius: 6,
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 600,
              color: '#14100a',
              background: 'var(--osd-accent)',
            }}
          >
            李鈞盛 · FCU CSIE
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

const Cover: Page = () => {
  const live = useIsActivePage();
  return (
    <Frame>
      <Viewfinder />
      <div style={{ position: 'absolute', left: 160, top: 170, width: 980 }}>
        <Rise delay={0.1}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                width: 76,
                height: 76,
                flexShrink: 0,
                borderRadius: '50%',
                background: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <img src={nukLogo} alt="國立高雄大學校徽" style={{ width: 70, height: 70, display: 'block' }} />
            </div>
            <div style={{ fontFamily: MONO, lineHeight: 1.45 }}>
              <div style={{ fontSize: 26, letterSpacing: '0.08em', color: 'var(--osd-accent)' }}>國立高雄大學 資訊工程學系碩士班</div>
              <div style={{ fontSize: 22, letterSpacing: '0.12em', color: dim }}>推甄 ・ 補充資料</div>
            </div>
          </div>
        </Rise>
        <h1
          style={{
            margin: '20px 0 0',
            fontFamily: 'var(--osd-font-display)',
            fontSize: 'var(--osd-size-hero)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '0.08em',
          }}
        >
          <a href={SITE_URL} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
            <SplitText text="李鈞盛" delay={0.3} stagger={0.14} />
          </a>
        </h1>
        <Rise delay={0.8}>
          <p style={{ margin: '12px 0 0', fontSize: 40, lineHeight: 1.4, color: muted }}>逢甲大學 資訊工程學系 四年級</p>
        </Rise>
        <motion.div
          style={{ height: 4, width: 120, marginTop: 34, background: 'var(--osd-accent)', transformOrigin: 'left' }}
          initial={live ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 1.0, ease: EASE }}
        />
        <Rise delay={1.15}>
          <p style={{ margin: '34px 0 0', fontSize: 46, lineHeight: 1.5, fontWeight: 500 }}>讓 AI 在邊緣即時看懂世界，</p>
        </Rise>
        <Rise delay={1.4}>
          <p style={{ margin: 0, fontSize: 46, lineHeight: 1.5, fontWeight: 700, color: 'var(--osd-accent)' }}>
            下一站，高大資工。
          </p>
        </Rise>
        <Rise delay={1.7}>
          <div style={{ display: 'flex', gap: 16, marginTop: 38 }}>
            <Chip>邊緣 AI</Chip>
            <Chip>電腦視覺</Chip>
            <Chip>行動應用開發</Chip>
          </div>
        </Rise>
        <Rise delay={1.9}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 40, fontFamily: MONO, fontSize: 24 }}>
            <span style={{ color: dim }}>線上簡報</span>
            <a href={SITE_URL} target="_blank" rel="noopener" style={{ color: 'var(--osd-accent)', textDecoration: 'none' }}>
              {SITE_URL.replace('https://', '')}
            </a>
          </div>
        </Rise>
      </div>
      <motion.div
        style={{
          position: 'absolute',
          left: CARD_X,
          top: CARD_Y + CARD_H + 56,
          width: CARD_W,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 22,
          color: muted,
        }}
        initial={live ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
        <span style={{ color: 'var(--osd-accent)' }}>← →</span> 換頁
        <span style={{ marginLeft: 28, color: 'var(--osd-accent)' }}>F</span> 全螢幕
      </motion.div>
    </Frame>
  );
};

// ─── Shared video frame (倍伴練 + 造星者) ────────────────────────────────────
// Live page autoplays muted; thumbnails and print show the poster only.
// Both controls are <button>s, so the player's click-to-advance ignores them.

const VideoButton = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '6px 16px',
      borderRadius: 999,
      border: `1.5px solid ${on ? 'var(--osd-accent)' : line}`,
      background: 'rgba(12,14,19,0.82)',
      color: on ? 'var(--osd-accent)' : 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
      fontSize: 20,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const VideoFrame = ({
  src,
  poster,
  alt,
  label,
  left,
  top,
  width,
  height,
}: {
  src: string;
  poster: string;
  alt: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}) => {
  const live = useIsActivePage();
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    if (muted) {
      v.currentTime = 0;
      v.muted = false;
      void v.play();
    } else {
      v.muted = true;
    }
    setMuted(!muted);
  };
  // Native controls only while the video itself is fullscreen.
  const enlarge = () => {
    const v = ref.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!v) return;
    v.controls = true;
    const off = () => {
      if (document.fullscreenElement === v) return;
      v.controls = false;
      document.removeEventListener('fullscreenchange', off);
    };
    if (v.requestFullscreen) {
      document.addEventListener('fullscreenchange', off);
      void v.requestFullscreen().catch(off);
    } else {
      v.webkitEnterFullscreen?.();
    }
  };
  return (
    <Rise
      delay={0.5}
      y={40}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius: 20,
        border: '8px solid #1a1e27',
        outline: `1px solid ${line}`,
        background: '#000',
        overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(246,184,26,0.10)',
      }}
    >
      {live ? (
        <video
          ref={ref}
          src={src}
          poster={poster}
          autoPlay
          muted={muted}
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <img src={poster} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
      <span
        style={{
          position: 'absolute',
          left: 16,
          top: 14,
          padding: '4px 12px',
          borderRadius: 8,
          fontFamily: MONO,
          fontSize: 20,
          background: 'rgba(12,14,19,0.78)',
          color: 'var(--osd-accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: coral,
            display: 'inline-block',
            animation: live ? 'vf-blink 1.4s ease-in-out infinite' : 'none',
          }}
        />
        {label}
      </span>
      {live && (
        <div style={{ position: 'absolute', right: 16, bottom: 14, display: 'flex', gap: 10 }}>
          <VideoButton on={!muted} onClick={toggleSound}>
            {muted ? '▶ 有聲播放' : '■ 靜音'}
          </VideoButton>
          <VideoButton on={false} onClick={enlarge}>
            ⛶ 放大
          </VideoButton>
        </div>
      )}
    </Rise>
  );
};

// ─── 2. 競賽：概念的起點 ─────────────────────────────────────────────────────

const Burst = () => {
  const live = useIsActivePage();
  return (
    <motion.svg
      width={220}
      height={220}
      viewBox="-110 -110 220 220"
      style={{ position: 'absolute', left: -46, top: -66, pointerEvents: 'none' }}
      initial={live ? { scale: 0, opacity: 0 } : false}
      animate={live ? { scale: 1, opacity: [0, 1, 0.35], rotate: 90 } : { scale: 1, opacity: 0.35 }}
      transition={{ duration: 2.2, delay: 1.1, ease: EASE }}
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={Math.cos(a) * 52}
            y1={Math.sin(a) * 52}
            x2={Math.cos(a) * 96}
            y2={Math.sin(a) * 96}
            stroke="#f6b81a"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </motion.svg>
  );
};

const AwardCard = ({
  photo,
  rank,
  title,
  work1,
  work2,
  delay,
  children,
}: {
  photo: string;
  rank: string;
  title: string;
  work1: string;
  work2: string;
  delay: number;
  children: ReactNode;
}) => {
  const live = useIsActivePage();
  return (
    <Rise
      delay={delay}
      y={48}
      style={{
        width: 820,
        borderRadius: 'var(--osd-radius)',
        border: `1px solid ${line}`,
        background: panel,
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ height: 340, overflow: 'hidden' }}>
        <motion.img
          src={photo}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          initial={live ? { scale: 1.18 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 3, delay, ease: EASE }}
        />
      </div>
      <div style={{ display: 'flex', gap: 32, padding: '26px 32px 28px' }}>
        <div style={{ position: 'relative', width: 214, flexShrink: 0 }}>
          <Burst />
          <motion.div
            style={{
              position: 'relative',
              whiteSpace: 'nowrap',
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.1,
              backgroundImage: 'linear-gradient(110deg, #f6b81a 35%, #fff1c9 50%, #f6b81a 65%)',
              backgroundSize: '250% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              animation: live ? 'vf-shimmer 3.2s ease-in-out 2s infinite' : 'none',
            }}
            initial={live ? { scale: 0.4, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: delay + 0.6 }}
          >
            <span>{rank}</span>
          </motion.div>
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
          <div style={{ marginTop: 8, fontSize: 26, lineHeight: 1.5, color: muted }}>{children}</div>
          <div style={{ marginTop: 10, fontSize: 26, lineHeight: 1.5 }}>
            <div>
              <span style={{ color: 'var(--osd-accent)' }}>作品｜</span>
              <span>{work1}</span>
            </div>
            <div>{work2}</div>
          </div>
        </div>
      </div>
    </Rise>
  );
};

// "延續" badge sitting in the gap between the two award cards.
const CarryOn = () => {
  const live = useIsActivePage();
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: PAD + 820 + 20 - 48,
        top: 330 + 170 - 48,
        width: 96,
        height: 96,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        background: 'var(--osd-bg)',
        border: '3px solid var(--osd-accent)',
        boxShadow: '0 0 30px rgba(246,184,26,0.45)',
        color: 'var(--osd-accent)',
        fontSize: 22,
        fontWeight: 700,
        lineHeight: 1.2,
      }}
      initial={live ? { scale: 0, rotate: -90 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 1.4 }}
    >
      <div>
        延續
        <div style={{ fontSize: 30, animation: live ? 'vf-nudge 1.6s ease-in-out 2s infinite' : 'none' }}>→</div>
      </div>
    </motion.div>
  );
};

const Awards: Page = () => (
  <Frame>
    <Header
      no="01"
      kicker="作品脈絡 ｜ 競賽"
      title="一個概念，從比賽一路做下去"
      sub="全國電子設計創意競賽 → 海峽兩岸青少年創客大賽 → 大學專題「倍伴練」"
    />
    <div style={{ position: 'absolute', left: PAD, top: 330, display: 'flex', gap: 40 }}>
      <AwardCard
        photo={awardNational}
        rank="季軍"
        title="第二十二屆 全國電子設計創意競賽"
        work1="基於 ML Kit 邊緣運算之"
        work2="即時動態感知與遠端照護系統"
        delay={0.5}
      >
        智慧大數據及行動 APP 類 ｜{' '}
        <span style={{ fontFamily: MONO, color: 'var(--osd-accent)' }}>
          <CountUp to={33} delay={1.2} />
        </span>{' '}
        隊入圍決賽
      </AwardCard>
      <AwardCard
        photo={awardCrossStrait}
        rank="一等獎"
        title="第十一屆 海峽兩岸青少年創客大賽"
        work1="《CareYou》居家復健平台"
        work2="延續核心概念，加入本地 LLM 與語音"
        delay={0.75}
      >
        開源創新組 ｜ 上海同濟大學總決賽
      </AwardCard>
    </div>
    <CarryOn />
  </Frame>
);

// ─── 3. 大學專題：倍伴練 ─────────────────────────────────────────────────────

const Stat = ({ delay, value, label }: { delay: number; value: ReactNode; label: string }) => (
  <Rise delay={delay} style={{ borderTop: `2px solid ${line}`, paddingTop: 12 }}>
    <div style={{ fontFamily: MONO, fontSize: 56, fontWeight: 600, lineHeight: 1.1, color: 'var(--osd-accent)' }}>{value}</div>
    <div style={{ marginTop: 4, fontSize: 24, color: muted }}>{label}</div>
  </Rise>
);

const Project: Page = () => (
  <Frame>
    <Header
      no="02"
      kicker="作品影片 ｜ 大學專題"
      title="倍伴練：讓平板即時看懂復健動作"
      sub="延續比賽的核心概念：基於 TensorFlow 邊緣端點之即時骨架動態感知系統 ｜ 指導教授：林峰正 副教授"
    />
    <VideoFrame
      src={plusrepVideo}
      poster={plusrepPoster}
      alt="倍伴練 PlusRep 介紹影片"
      label="倍伴練 PlusRep · 介紹影片"
      left={PAD}
      top={330}
      width={1040}
      height={585}
    />
    <div style={{ position: 'absolute', left: 1220, top: 330, width: 580, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Stat
        delay={0.9}
        value={
          <>
            <CountUp to={30} delay={0.9} /> FPS
          </>
        }
        label="中階手機（Snapdragon 695）即時推論"
      />
      <Stat
        delay={1.05}
        value={
          <>
            <CountUp to={18} delay={1.05} />–<CountUp to={25} delay={1.05} /> ms
          </>
        }
        label="單幀骨架推論時間"
      />
      <Stat
        delay={1.2}
        value={
          <>
            &lt; <CountUp from={3} to={0.5} decimals={1} delay={1.2} /> s
          </>
        }
        label="錯誤姿勢 → 語音提醒"
      />
    </div>
    <Rise delay={1.5} style={{ position: 'absolute', left: 1220, top: 736, width: 580 }}>
      <div style={{ fontSize: 26, lineHeight: 1.6, color: muted }}>
        <div>▸ BlazePose ＋ MoveNet，iPad 本機運算</div>
        <div>▸ 向量夾角判斷關節角度、自動計次</div>
        <div>▸ 小伴 AI：本機對話、台語鼓勵</div>
        <div>▸ 患者・家屬・醫師 三端同步</div>
      </div>
    </Rise>
  </Frame>
);

// ─── 4. App 作品：造星者 ─────────────────────────────────────────────────────

const IconBox = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: 72,
      height: 72,
      flexShrink: 0,
      borderRadius: 14,
      border: `1.5px solid ${line}`,
      background: 'rgba(246,184,26,0.07)',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    {children}
  </div>
);

const EyeIcon = () => {
  const live = useIsActivePage();
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <path d="M4 24 Q24 6 44 24 Q24 42 4 24 Z" fill="none" stroke={cool} strokeWidth={3} />
      <motion.circle
        cy={24}
        r={7}
        fill="#f6b81a"
        initial={false}
        animate={live ? { cx: [24, 16, 32, 24] } : { cx: 24 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
};

const TabletIcon = () => {
  const live = useIsActivePage();
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <rect x={8} y={4} width={32} height={40} rx={5} fill="none" stroke={cool} strokeWidth={3} />
      <motion.line
        x1={24}
        y1={-6}
        x2={24}
        y2={22}
        stroke="#f6b81a"
        strokeWidth={2.5}
        strokeDasharray="4 4"
        initial={false}
        animate={live ? { x2: [16, 32, 16] } : { x2: 24 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cy={22}
        r={4}
        fill="#f6b81a"
        initial={false}
        animate={live ? { cx: [16, 32, 16] } : { cx: 24 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
};

const CalibIcon = () => {
  const live = useIsActivePage();
  const xs = [10, 38, 24, 10, 38];
  const ys = [10, 10, 24, 38, 38];
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <rect x={3} y={3} width={42} height={42} rx={6} fill="none" stroke={cool} strokeOpacity={0.6} strokeWidth={2} />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={3} fill={cool} opacity={0.7} />
      ))}
      <motion.circle
        r={6}
        fill="none"
        stroke="#f6b81a"
        strokeWidth={2.5}
        initial={false}
        animate={live ? { cx: [...xs, xs[0]], cy: [...ys, ys[0]] } : { cx: 24, cy: 24 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
};

const TimerIcon = () => {
  const live = useIsActivePage();
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <circle cx={24} cy={26} r={17} fill="none" stroke="rgba(143,180,217,0.3)" strokeWidth={4} />
      <motion.circle
        cx={24}
        cy={26}
        r={17}
        fill="none"
        stroke="#f6b81a"
        strokeWidth={4}
        strokeLinecap="round"
        style={{ rotate: -90, originX: '24px', originY: '26px' }}
        initial={false}
        animate={live ? { pathLength: [0, 1, 1] } : { pathLength: 1 }}
        transition={{ duration: 3.6, times: [0, 0.83, 1], repeat: Infinity, ease: 'linear' }}
      />
      <rect x={20} y={2} width={8} height={5} rx={1.5} fill={cool} />
    </svg>
  );
};

const TechItem = ({
  icon,
  title,
  desc,
  delay,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  delay: number;
}) => (
  <Rise delay={delay} style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <IconBox>{icon}</IconBox>
    <div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
      <div style={{ fontSize: 26, lineHeight: 1.45, color: muted }}>{desc}</div>
    </div>
  </Rise>
);

const AppWork: Page = () => (
  <Frame>
    <Header
      no="03"
      kicker="作品影片 ｜ App 作品"
      title="讓 App 知道孩子有沒有在看"
      sub="造星者：兒童專注力訓練 App ｜ 2026 行動應用創新賽 ｜ 負責主要程式設計與美術設計"
    />
    <VideoFrame
      src={appVideo}
      poster={appPoster}
      alt="造星者 App 畫面"
      label="DEMO · 造星者"
      left={PAD}
      top={340}
      width={992}
      height={558}
    />
    <div style={{ position: 'absolute', left: 1160, top: 340, width: 640, display: 'flex', flexDirection: 'column', gap: 26 }}>
      <TechItem icon={<EyeIcon />} title="MediaPipe 虹膜偵測" desc="網頁端即時追蹤雙眼位置" delay={0.8} />
      <TechItem icon={<TabletIcon />} title="自寫 ARKit 外掛" desc="iPad 上把視線投影到螢幕平面" delay={0.95} />
      <TechItem icon={<CalibIcon />} title="5 點視線校準" desc="看五個點，算出個人化校準" delay={1.1} />
      <TechItem icon={<TimerIcon />} title="注視停滯 > 3 秒 = 分心" desc="測試發現遮住鏡頭會誤判，因此加入" delay={1.25} />
    </div>
    <Rise
      delay={1.6}
      style={{
        position: 'absolute',
        left: 1160,
        top: 760,
        width: 640,
        padding: '18px 26px',
        borderLeft: '5px solid var(--osd-accent)',
        borderRadius: 12,
        background: 'rgba(246,184,26,0.07)',
      }}
    >
      <div style={{ fontSize: 26, color: muted }}>初賽只審企劃書 → 落選</div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.45, color: 'var(--osd-accent)' }}>
        做得出來只是第一步，
        <br />
        還要用數據證明價值。
      </div>
    </Rise>
  </Frame>
);

// ─── 5. HomeLab ──────────────────────────────────────────────────────────────

const Tier = ({
  title,
  desc,
  filled,
  delay,
  tone,
}: {
  title: string;
  desc: string;
  filled: number;
  delay: number;
  tone: string;
}) => {
  const live = useIsActivePage();
  return (
    <Rise
      delay={delay}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 150,
        padding: '0 28px',
        borderRadius: 'var(--osd-radius)',
        border: `1.5px solid ${line}`,
        background: panel,
      }}
    >
      <div style={{ width: 390, flexShrink: 0 }}>
        <div style={{ fontSize: 34, fontWeight: 700 }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 24, color: muted, whiteSpace: 'nowrap' }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        {Array.from({ length: 13 }).map((_, i) =>
          i < filled ? (
            <motion.div
              key={i}
              style={{
                width: 38,
                height: 92,
                borderRadius: 6,
                backgroundColor: tone,
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 6px, rgba(255,255,255,0) 6px 14px)',
                animation: live ? 'vf-hatch 1.2s linear infinite' : 'none',
              }}
              initial={live ? { y: -70, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22, delay: delay + 0.3 + i * 0.07 }}
            />
          ) : (
            <div
              key={i}
              style={{ width: 38, height: 92, borderRadius: 6, border: '1.5px dashed rgba(163,171,185,0.3)' }}
            />
          ),
        )}
      </div>
    </Rise>
  );
};

const DataFlow = () => {
  const live = useIsActivePage();
  return (
    <div style={{ position: 'absolute', left: 716, top: 420, width: 20, height: 470 }}>
      <div
        style={{
          position: 'absolute',
          left: 9,
          top: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(0deg, ${cool}, var(--osd-accent))`,
          opacity: 0.5,
        }}
      />
      <div style={{ position: 'absolute', left: 1, top: -14, color: 'var(--osd-accent)', fontSize: 20 }}>▲</div>
      {live &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: 3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: cool,
              boxShadow: `0 0 16px ${cool}`,
            }}
            animate={{ top: [450, 0], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, delay: 1.8 + i * 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
    </div>
  );
};

const HomeLab: Page = () => {
  const live = useIsActivePage();
  return (
    <Frame>
      <Header no="04" kicker="自主探索 ｜ HomeLab" title="在家裡，把 125B 模型跑起來" />
      <div style={{ position: 'absolute', left: PAD, top: 330, width: 560 }}>
        <Rise delay={0.4}>
          <div style={{ fontSize: 28, color: muted }}>傳統做法至少需要</div>
          <div style={{ position: 'relative', display: 'inline-block', fontFamily: MONO, fontSize: 132, fontWeight: 600, color: dim, lineHeight: 1.1 }}>
            80GB
            <motion.div
              style={{ position: 'absolute', left: -6, right: -6, top: '52%', height: 8, background: coral, transformOrigin: 'left', borderRadius: 4 }}
              initial={live ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 1.0, ease: EASE }}
            />
          </div>
        </Rise>
        <Rise delay={1.3} style={{ marginTop: 28 }}>
          <div style={{ fontSize: 28, color: muted }}>我用</div>
          <div style={{ fontFamily: MONO, fontSize: 168, fontWeight: 600, color: 'var(--osd-accent)', lineHeight: 1.05, textShadow: '0 0 40px rgba(246,184,26,0.35)' }}>
            <CountUp to={44} delay={1.3} />
            GB
          </div>
          <div style={{ marginTop: 10, fontSize: 30, lineHeight: 1.55 }}>
            顯示記憶體 ＋ 系統記憶體 ＋ SSD
            <br />
            分層存放，成功運行
          </div>
        </Rise>
      </div>
      <DataFlow />
      <div style={{ position: 'absolute', left: 760, top: 340, width: 1040 }}>
        <Rise delay={0.4} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: muted }}>
          <span>125B 參數模型（IQ3 量化）分層存放</span>
          <span style={{ fontFamily: MONO, fontSize: 22, color: dim }}>[ 方塊 = 模型層 · 示意 ]</span>
        </Rise>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 20 }}>
          <Tier title="顯示記憶體 44GB" desc="2 × RTX 2080 Ti（各改裝為 22GB）" filled={12} delay={0.6} tone="rgba(246,184,26,0.75)" />
          <Tier title="系統記憶體 48GB" desc="二手零件組裝 · 同時作為 NAS" filled={8} delay={0.9} tone="rgba(143,180,217,0.72)" />
          <Tier title="SSD" desc="放不下的層，交給儲存裝置" filled={4} delay={1.2} tone="rgba(163,171,185,0.55)" />
        </div>
      </div>
      <Rise delay={2.4} style={{ position: 'absolute', left: PAD, top: 922, fontSize: 32, fontWeight: 700 }}>
        <span>
          在有限的硬體上部署模型，關鍵也在<span style={{ color: 'var(--osd-accent)' }}>資料怎麼搬</span>。
        </span>
      </Rise>
    </Frame>
  );
};

// ─── 6. 研究方向：看得準、跑得動 ─────────────────────────────────────────────

const CARD_TOP = 330;
const PROB_W = 820;
const VIS_W = PROB_W - 48;
const VIS_H = 220;

const visBox: CSSProperties = {
  position: 'relative',
  width: VIS_W,
  height: VIS_H,
  borderRadius: 12,
  overflow: 'hidden',
  border: `1px solid ${line}`,
};

const tag: CSSProperties = {
  position: 'absolute',
  top: 10,
  padding: '4px 12px',
  borderRadius: 6,
  fontFamily: MONO,
  fontSize: 20,
  background: 'rgba(12,14,19,0.85)',
};

// 看不準: the project's own footage, with a keypoint-confidence readout that keeps dipping.
const Confidence = () => {
  const live = useIsActivePage();
  const [conf, setConf] = useState(0.42);
  useAnimationFrame((t) => {
    if (!live) return;
    const v = 0.55 + 0.3 * Math.sin(t / 420) * Math.sin(t / 1330 + 1);
    setConf(Math.max(0.12, Math.min(0.95, v)));
  });
  const low = conf < 0.5;
  return (
    <div style={visBox}>
      <img
        src={rehabSeated}
        alt="專題實機畫面"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '0% 42%',
          display: 'block',
          filter: 'brightness(0.7) saturate(0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 460,
          background: 'linear-gradient(270deg, rgba(12,14,19,0.97) 52%, rgba(12,14,19,0))',
        }}
      />
      <div style={{ position: 'absolute', right: 28, top: 70, width: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: muted }}>
          <span>關節點信心值</span>
          <span style={{ fontFamily: MONO, color: low ? coral : 'var(--osd-accent)' }}>{conf.toFixed(2)}</span>
        </div>
        <div style={{ height: 12, marginTop: 10, borderRadius: 6, background: 'rgba(163,171,185,0.2)' }}>
          <div
            style={{
              width: `${conf * 100}%`,
              height: '100%',
              borderRadius: 6,
              background: low ? coral : 'var(--osd-accent)',
            }}
          />
        </div>
        <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 20, color: low ? coral : dim }}>
          {low ? '▲ 骨架跳動' : '● 追蹤穩定'}
        </div>
      </div>
      <span style={{ ...tag, left: 10, color: 'var(--osd-accent)' }}>倍伴練 · 實機畫面</span>
    </div>
  );
};

const LAYERS = 6;
const PRUNED = [1, 4];
const smooth = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
// One 5.2 s loop: hold the full model, squeeze it, hold the small one, snap back.
const squeezeAt = (p: number) =>
  p < 0.18 ? 0 : p < 0.58 ? smooth((p - 0.18) / 0.4) : p < 0.9 ? 1 : 1 - smooth((p - 0.9) / 0.1);

// 跑不動: the model block is quantised and pruned while the latency readout falls.
const Squeeze = () => {
  const live = useIsActivePage();
  const t0 = useRef<number | null>(null);
  const [q, setQ] = useState(1);
  useAnimationFrame((t) => {
    if (!live) {
      t0.current = null;
      return;
    }
    t0.current ??= t;
    setQ(squeezeAt(((t - t0.current) % 5200) / 5200));
  });
  const w = 200 - 100 * q;
  const h = 18 - 6 * q;
  const gap = 7 - 2 * q;
  const ms = Math.round(200 - 175 * q);
  const pct = Math.round(q * 100);
  const tone = `color-mix(in srgb, #f6b81a ${pct}%, ${coral})`;
  return (
    <div style={{ ...visBox, background: 'rgba(12,14,19,0.6)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 300, height: VIS_H - 44, display: 'grid', placeItems: 'center' }}>
        <div style={{ position: 'relative', width: 200, height: LAYERS * h + (LAYERS - 1) * gap }}>
          {Array.from({ length: LAYERS }).map((_, k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: (200 - w) / 2,
                top: k * (h + gap),
                width: w,
                height: h,
                borderRadius: 4,
                background: `color-mix(in srgb, #f6b81a ${pct}%, ${muted})`,
                opacity: PRUNED.includes(k) ? 0.9 - 0.75 * q : 0.9,
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, width: 300, bottom: 16, textAlign: 'center', fontFamily: MONO, fontSize: 20, color: dim }}>
        {q < 0.5 ? '原始模型' : '量化・剪枝後'}
      </div>
      <div style={{ position: 'absolute', left: 300, top: 24, bottom: 24, width: 1, background: line }} />
      <div style={{ position: 'absolute', left: 340, top: 50, right: 36 }}>
        <div style={{ fontFamily: MONO, fontSize: 20, color: dim }}>推論延遲（示意）</div>
        <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 72, fontWeight: 600, lineHeight: 1.2, color: tone }}>
          {ms}
          <span style={{ fontSize: 26, marginLeft: 10, color: muted }}>ms</span>
        </div>
        <div style={{ marginTop: 14, height: 10, borderRadius: 5, background: 'rgba(163,171,185,0.2)' }}>
          <div style={{ width: `${(ms / 200) * 100}%`, height: '100%', borderRadius: 5, background: tone }} />
        </div>
      </div>
    </div>
  );
};

const Problem = ({
  i,
  title,
  cause1,
  cause2,
  field,
  did,
  delay,
  children,
}: {
  i: number;
  title: string;
  cause1: string;
  cause2: string;
  field: string;
  did: string;
  delay: number;
  children: ReactNode;
}) => (
  <Rise
    delay={delay}
    y={36}
    style={{
      position: 'absolute',
      left: PAD + i * (PROB_W + 40),
      top: CARD_TOP,
      width: PROB_W,
      padding: '20px 24px 22px',
      borderRadius: 'var(--osd-radius)',
      background: panel,
      border: `1px solid ${line}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.08em', color: 'var(--osd-accent)' }}>問題 {i + 1}</span>
      <span style={{ fontSize: 42, fontWeight: 900 }}>{title}</span>
    </div>
    <div style={{ marginTop: 12 }}>{children}</div>
    <div style={{ marginTop: 12, fontSize: 24, lineHeight: 1.5, color: muted }}>
      <div>{cause1}</div>
      <div>{cause2}</div>
    </div>
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${line}` }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--osd-accent)' }}>
        我想研究 ▸ <span>{field}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 22, color: dim }}>
        我做過：<span>{did}</span>
      </div>
    </div>
  </Rise>
);

const Research: Page = () => (
  <Frame>
    <Header
      no="05"
      kicker="研究方向"
      title="讓邊緣裝置上的 AI：看得準、也跑得動"
      sub="做專題時遇到的兩個問題，也是我想在碩士班深入的方向"
    />
    <Problem
      i={0}
      title="看不準"
      cause1="遮擋、低光 → 關節點信心值下降"
      cause2="骨架一跳動，動作判斷就跟著不穩"
      field="穩健辨識與感知可信度"
      did="遮蔽幀線性插補、虹膜偵測與五點校準"
      delay={0.5}
    >
      <Confidence />
    </Problem>
    <Problem
      i={1}
      title="跑不動"
      cause1="手機、平板的算力與電力都有限"
      cause2="影像涉及隱私 → 不能都丟上雲端"
      field="AI 模型最佳化（量化・剪枝）"
      did="手機 30 FPS 即時推論、HomeLab 分層推論"
      delay={0.8}
    >
      <Squeeze />
    </Problem>
    <Rise delay={1.4} style={{ position: 'absolute', left: PAD, top: 908, fontSize: 36, fontWeight: 700 }}>
      <span>
        讓 AI 在身邊的裝置上即時、可靠地看懂人 —— <span style={{ color: 'var(--osd-accent)' }}>這是我想在高大資工研究的事。</span>
      </span>
    </Rise>
  </Frame>
);

// ─── 7. 讀書計畫 ─────────────────────────────────────────────────────────────

const NODE_X = [315, 745, 1175, 1605];
const NODE_Y = [345, 395, 445, 495];

const Stage = ({
  i,
  phase,
  title,
  line1,
  line2,
  line3,
  final = false,
}: {
  i: number;
  phase: string;
  title: string;
  line1: string;
  line2: string;
  line3: string;
  final?: boolean;
}) => {
  const live = useIsActivePage();
  const delay = 0.5 + i * 0.45;
  const x0 = i === 0 ? PAD : NODE_X[i - 1];
  const y0 = i === 0 ? NODE_Y[0] - 30 : NODE_Y[i - 1];
  const x1 = NODE_X[i];
  const y1 = NODE_Y[i];
  const mid = (x0 + x1) / 2;
  return (
    <div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.path
          d={`M${x0} ${y0} C${mid} ${y0}, ${mid} ${y1}, ${x1} ${y1}`}
          fill="none"
          stroke="#f6b81a"
          strokeOpacity={0.55}
          strokeWidth={3}
          initial={live ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay, ease: EASE }}
        />
      </svg>
      <motion.div
        style={{
          position: 'absolute',
          left: x1 - 15,
          top: y1 - 15,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--osd-bg)',
          border: `5px solid ${final ? '#fff1c9' : 'var(--osd-accent)'}`,
          boxShadow: `0 0 28px rgba(246,184,26,${final ? 0.9 : 0.55})`,
        }}
        initial={live ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 15, delay: delay + 0.55 }}
      />
      <Rise
        delay={delay + 0.65}
        y={30}
        style={{
          position: 'absolute',
          left: x1 - 195,
          top: y1 + 40,
          width: 390,
          padding: '22px 24px 24px',
          borderRadius: 'var(--osd-radius)',
          background: final ? 'rgba(246,184,26,0.09)' : panel,
          border: `1.5px solid ${final ? 'rgba(246,184,26,0.55)' : line}`,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 22, color: 'var(--osd-accent)', letterSpacing: '0.08em' }}>{phase}</div>
        <div style={{ marginTop: 6, fontSize: 36, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
        <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.6, color: muted }}>
          <div>{line1}</div>
          <div>{line2}</div>
          <div>{line3}</div>
        </div>
      </Rise>
    </div>
  );
};

const StudyPlan: Page = () => (
  <Frame>
    <Header no="06" kicker="讀書計畫" title="從專題出發，往研究走" />
    <Rise delay={0.4} style={{ position: 'absolute', left: PAD, top: NODE_Y[0] - 72, fontFamily: MONO, fontSize: 22, color: dim }}>
      <span>▸ 研究路線</span>
    </Rise>
    <Stage i={0} phase="入學前" title="補足基礎" line1="線性代數．機率統計" line2="深度學習．電腦視覺課程" line3="模型壓縮與邊緣推論文獻" />
    <Stage i={1} phase="碩一" title="修課與實作" line1="影像處理．機器學習相關課程" line2="加入實驗室．參與計畫" line3="把專題整理成可重現的實驗" />
    <Stage i={2} phase="碩二" title="研究與論文" line1="遮擋、低光下的穩健辨識" line2="模型量化、剪枝與即時推論" line3="感知可信度評估．完成論文" />
    <Stage i={3} phase="畢業後" title="投入 AI 研發" line1="電腦視覺應用研發" line2="AI 模型最佳化與邊緣部署" line3="智慧醫療．行動裝置產品" final />
    <Rise delay={2.8} style={{ position: 'absolute', left: PAD, top: 884, display: 'flex', alignItems: 'baseline', gap: 28 }}>
      <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: '0.06em' }}>謝謝老師撥冗審閱</span>
      <span style={{ fontSize: 28, color: muted }}>敬請指教</span>
    </Rise>
  </Frame>
);

// ─── Deck ────────────────────────────────────────────────────────────────────

export const transition: SlideTransition = {
  duration: 280,
  exit: { duration: 280, easing: 'cubic-bezier(0.4, 0, 1, 1)', keyframes: [{ opacity: 1 }, { opacity: 1 }] },
  enter: {
    duration: 280,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    keyframes: [
      { opacity: 0, transform: 'translateY(10px)', filter: 'blur(4px)' },
      { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
    ],
  },
};

export const meta: SlideMeta = {
  title: '李鈞盛｜高大資工碩士班 推甄補充資料',
  createdAt: '2026-10-30T15:42:37.686Z',
};

export default [Cover, Awards, Project, AppWork, HomeLab, Research, StudyPlan] satisfies Page[];

export const notes: (string | undefined)[] = [
  `（約 20 秒）
老師好，我是李鈞盛，現在是逢甲資工四年級。
這份補充資料，主要是想讓老師看看我的兩支作品影片：大學專題「倍伴練」，和 App 作品「造星者」。
我在做的事情，一句話說就是：讓 AI 在手機、平板這種小裝置上，即時看懂人在做什麼。`,
  `（約 40 秒）
先說這些作品是怎麼來的。
我第一次參賽，是全國電子設計創意競賽。我們用 ML Kit 讓手機在本機即時看懂復健動作，再把結果同步給家屬跟醫師，最後在 33 隊決賽裡拿到季軍。
接著我們延續同樣的核心概念，做成居家復健平台 CareYou，加入本地的語言模型和語音，到上海同濟大學參加海峽兩岸青少年創客大賽，拿到一等獎。
比賽讓我學到：作品不是能跑就好，要真的有人能用。`,
  `（約 45 秒｜影片會自己靜音播放，邊播邊講）
這個概念後來延續成我的大學專題，由林峰正老師指導，叫「倍伴練」。
專題改用 TensorFlow，在平板上用 BlazePose 跟 MoveNet 抓出身體的關節點，再用向量夾角算出關節角度，判斷動作有沒有做到位，順便自動計次，完全不用穿戴裝置。
速度的部分，中階手機上一幀大概 18 到 25 毫秒，可以跑到 30 FPS；姿勢做錯，不到 0.5 秒就會有語音提醒。
我們還做了本機的 AI 小幫手「小伴」，會用台語幫患者加油，家屬跟醫師也能同步看到進度。影像都在 iPad 上算，不用上傳雲端。
（影片右下角可以「有聲播放」或「放大」）`,
  `（約 40 秒）
另一個作品叫「造星者」，是幫小朋友練專注力的 App，主要的程式是我寫的。
它的核心是視線追蹤：網頁版用 MediaPipe 抓虹膜；iPad 版我自己寫了 ARKit 外掛，把視線投影到螢幕上，再看 5 個點做校準。
測試的時候我們發現，鏡頭被遮住時系統會誤判，所以我加了一條規則：視線停住超過 3 秒，就算分心。
不過它在只看企劃書的初賽就被刷掉了。回頭檢討，是企劃書少了數據。這讓我學到，做得出來只是第一步，還要能用數據證明它的價值。`,
  `（約 30 秒）
課餘時間，我用二手零件自己組了一台 HomeLab。兩張顯卡各改成 22GB，加起來有 44GB 的顯示記憶體。
一個 125B 參數的模型，一般至少要 80GB 才跑得動。我就把它拆開，分層放在顯示記憶體、系統記憶體跟 SSD，最後真的跑起來了。
這讓我體會到：硬體有限的時候，關鍵其實是資料要怎麼搬。`,
  `（約 40 秒）
做專題的時候，我遇到兩個問題。
第一個是「看不準」：只要有遮擋、光線不夠，關節點的信心值就會掉，骨架開始跳，動作判斷也跟著不穩。我用遮蔽幀插補先撐住，但我想更進一步，讓系統在看的同時，也知道自己看得多準。
第二個是「跑不動」：手機、平板的算力跟電力都有限，影像又涉及隱私，不能都丟上雲端。所以我想研究模型量化、剪枝這類最佳化，讓模型在裝置上跑得更快。
讓 AI 在身邊的裝置上即時、可靠地看懂人，就是我想在高大資工研究的事。`,
  `（約 40 秒）
我的讀書計畫分成四個階段。
入學前，先把線性代數、機率統計補扎實，也先讀模型壓縮跟邊緣推論的文獻。
碩一，修影像處理、機器學習相關的課，早點加入實驗室，也把專題整理成可以重現的實驗。
碩二，聚焦在遮擋、低光下的穩健辨識，以及模型量化、剪枝與即時推論，並完成論文。
畢業之後，希望投入電腦視覺跟 AI 模型最佳化的研發，做出真的有人在用的產品。
以上是我的補充資料，謝謝老師，請老師指教。`,
];
