import { useState, useEffect, useRef, useCallback } from "react";
import MoonPhase from "./MoonPhase.jsx";
import PoetrySection from "../sections/poetry/PoetrySection.jsx";
import Bindery, {
  loadBindery, saveBindery,
  CLOTH_COLOURS, PAGE_COLOURS, SPINE_MAP, MARGIN_MAP,
  getPageStyle, resolveSectionConfig,
} from "./Bindery.jsx";
import { makeStubChapter, getBackgroundCss } from "../lib/chapterHelpers.jsx";
import {
  IconMorning, IconPlan, IconTasks, IconAdd,
  IconRewards, IconCalendar, IconDaybook, IconPoetry,
  IconBindery, IconMoon, IconSun, IconPaperclipDaisy,
} from "./SvgIcons.jsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CHAPTER_DEFS = [
  { id: "morning",  label: "Morning",  Icon: IconMorning,  stub: false },
  { id: "plan",     label: "Plan",     Icon: IconPlan,     stub: false },
  { id: "tasks",    label: "Tasks",    Icon: IconTasks,    stub: false },
  { id: "add",      label: "Add",      Icon: IconAdd,      stub: false },
  { id: "rewards",  label: "Rewards",  Icon: IconRewards,  stub: false },
  { id: "calendar", label: "Calendar", Icon: IconCalendar, stub: true  },
  { id: "daybook",  label: "Daybook",  Icon: IconDaybook,  stub: true  },
  { id: "poetry",   label: "Poetry",   Icon: IconPoetry,   stub: false },
  { id: "bindery",  label: "Bindery",  Icon: IconBindery,  stub: false },
];

// Dissolve durations
const FADE_OUT = 100;
const FADE_IN  = 200;

// The 10% margin zone around the book where stubs live.
// The book itself is 100vw/vh - 2×MARGIN. Stubs extend INTO this margin.
const MARGIN_PX = 28; // each side — gives stubs room to breathe

// ─── ORIENTATION HOOK ─────────────────────────────────────────────────────────
// Tracks whether the viewport is landscape or portrait.
// We use window dimensions rather than the Orientation API because we want
// to respond to browser window resizing on desktop too, not just device tilt.

function useOrientation() {
  const get = () => window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
  const [o, setO] = useState(get);
  useEffect(() => {
    const update = () => setO(get());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return o;
}

// ─── FILLER SLOT ──────────────────────────────────────────────────────────────
// Uses ResizeObserver to measure remaining vertical space in a page slot.
// If the gap is large enough and fillers are enabled, shows a placeholder
// where a filler image would appear. Actual filler library wired up later.

function FillerSlot({ containerRef, allowFillers, children }) {
  const innerRef   = useRef(null);
  const [gap, setGap] = useState(0);

  useEffect(() => {
    if (!allowFillers || !containerRef?.current || !innerRef?.current) return;
    const measure = () => {
      const containerH = containerRef.current?.clientHeight ?? 0;
      const innerH     = innerRef.current?.clientHeight     ?? 0;
      // Subtract padding from both sides (approx 40px) before measuring gap
      setGap(Math.max(0, containerH - innerH - 40));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(innerRef.current);
    ro.observe(containerRef.current);
    measure();
    return () => ro.disconnect();
  }, [allowFillers, containerRef]);

  return (
    <div>
      <div ref={innerRef}>{children}</div>
      {gap >= 120 && (
        <div style={{
          marginTop: 20, height: gap - 20,
          border: "1px dashed rgba(100,80,60,0.16)", borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "rgba(100,80,60,0.28)",
          fontFamily: "var(--font-body)", letterSpacing: "0.5px",
          userSelect: "none",
        }}>
          filler image
        </div>
      )}
    </div>
  );
}

// ─── GUTTER SHADOW ────────────────────────────────────────────────────────────
// gutterPx controls how wide the visible shadow spreads — user-configurable.
// Wider gutter = more visible centre shadow, suggesting a thicker book binding.

function GutterShadow({ gutterPx = 40 }) {
  return (
    <div style={{
      position: "absolute", top: 0, bottom: 0, left: "50%",
      width: gutterPx * 2, transform: "translateX(-50%)",
      background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.07) 35%, transparent 52%, rgba(0,0,0,0.03) 78%, transparent 100%)",
      pointerEvents: "none", zIndex: 10,
    }} />
  );
}

// ─── OUTER SPINE STRIP ────────────────────────────────────────────────────────
// Decorative cloth strip on the right outer edge of the book.
// Mirrors the left spine — same cloth, narrower, no text.
// Sits at z-index 2 (above page surface) so it appears to be the book cover
// wrapping around the right edge, just like the spine wraps the left.
// The stubs (z=1) sit BETWEEN this strip and the desktop background.

function OuterSpineStrip({ clothHex, width = 8 }) {
  return (
    <div style={{
      width, flexShrink: 0,
      background: `linear-gradient(to left, ${clothHex}cc, ${clothHex}88)`,
      backgroundImage:
        "repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)," +
        "repeating-linear-gradient(45deg,transparent 0,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
      boxShadow: "inset 4px 0 8px rgba(0,0,0,0.12)",
      borderRadius: "0 3px 3px 0",
      position: "relative", zIndex: 2,
    }} />
  );
}

// ─── LEFT MARGIN STRIP ────────────────────────────────────────────────────────
// Narrow vertical strip on the inner-left of the left page.
// Contains: section title (vertical, bottom-to-top) + moon phase (landscape only).
// Width is deliberately slim — it's a typographic margin, not a sidebar.

function LeftMarginStrip({ title, orientation }) {
  // The entire inner content uses writing-mode:vertical-rl + rotate(180deg)
  // so everything reads bottom-to-top. Section title and moon phase flow as
  // one continuous vertical column — no separate absolute positioning needed.
  const ink = "rgba(100,80,60,0.3)";
  return (
    <div style={{
      width: 24, flexShrink: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "10px 0",
      borderRight: "1px solid rgba(100,120,160,0.1)",
    }}>
      <div style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "rotate(180deg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        userSelect: "none",
      }}>
        {/* Section title — appears first in reading order (bottom of strip) */}
        <span style={{
          fontSize: 7, fontWeight: 700,
          letterSpacing: "2.5px", textTransform: "uppercase",
          color: ink, fontFamily: "var(--font-header)",
          whiteSpace: "nowrap",
        }}>
          {title}
        </span>

        {/* Moon phase — flows directly after title, landscape only */}
        {orientation === "landscape" && (
          <MoonPhase faded vertical />
        )}
      </div>
    </div>
  );
}

// ─── RIGHT MARGIN STRIP ───────────────────────────────────────────────────────
// Narrow strip on the outer-right of the right page.
// Shows the section icon at the bottom (right page, bottom margin, per spec).

function RightMarginStrip({ icon }) {
  return (
    <div style={{
      width: 22, flexShrink: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
      padding: "10px 0 12px",
      borderLeft: "1px solid rgba(100,120,160,0.1)",
    }}>
      <span style={{
        fontSize: 12, opacity: 0.32,
        userSelect: "none", lineHeight: 1,
      }}>
        {icon}
      </span>
    </div>
  );
}

// ─── PAGE TOP BAR ─────────────────────────────────────────────────────────────
// Slim header rule across the top of each page.
// Left page: date. Right page: chapter name + dark mode toggle.

function PageTopBar({ leftText, rightContent }) {
  const ink = "rgba(100,80,60,0.34)";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "3px 10px",
      borderBottom: "1px solid rgba(100,120,160,0.1)",
      minHeight: 24, flexShrink: 0,
    }}>
      <span style={{
        fontSize: 8, fontFamily: "var(--font-body)",
        color: ink, letterSpacing: "0.3px",
      }}>
        {leftText}
      </span>
      <span style={{ fontSize: 8, fontFamily: "var(--font-body)", color: ink }}>
        {rightContent}
      </span>
    </div>
  );
}

// ─── FOOTER NAV ───────────────────────────────────────────────────────────────
// Icon row at bottom of right page only.
// In portrait: also appears at bottom of bottom page.

function FooterNav({ activeChapter, onNavigate }) {
  const ink       = "rgba(80,60,40,0.54)";   // ~20% darker than previous 0.34
  const inkActive = "rgba(80,50,10,0.72)";
  return (
    <div style={{
      borderTop: "1px solid rgba(100,120,160,0.1)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "3px 2px 5px", flexShrink: 0,
    }}>
      {CHAPTER_DEFS.map(({ id, label, Icon, stub }) => {
        const active = activeChapter === id;
        const color  = active ? inkActive : ink;
        return (
          <button
            key={id}
            onClick={() => !stub && onNavigate(id)}
            title={label}
            style={{
              background: "none", border: "none",
              cursor: stub ? "default" : "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2, padding: "2px 3px",
              opacity: stub ? 0.25 : (active ? 1 : 0.72),
              transform: active ? "translateY(-1px)" : "none",
              transition: "opacity .15s, transform .15s",
            }}
          >
            <Icon size={14} color={color} strokeWidth={active ? 2 : 1.5} />
            <span style={{
              fontSize: 6, fontFamily: "var(--font-body)",
              letterSpacing: "0.4px", textTransform: "uppercase",
              color, fontWeight: active ? 700 : 400,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── EDGE STUBS ───────────────────────────────────────────────────────────────
// These three elements live in position:absolute, right edge of the right page.
// They extend INTO the 10% margin zone (outside the page boundary).
// overflow:visible on .book-pages and .book-wrap makes them visible.
//
// Stacking order top-to-bottom: Paperclip+Daisy → Index Card → Polaroid
// Each overlaps the one below it (higher z-index = higher in stack).
// The shadow of each falls onto the element below, like real objects on a desk.

function PaperclipDaisy({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Sticker library"
      style={{
        position: "absolute",
        // Sits just past the right edge, in the margin zone
        right: -(MARGIN_PX - 4),
        top: "8%",
        zIndex: 1,
        cursor: "pointer",
        transform: `rotate(${hov ? 42 : 37}deg) translateX(${hov ? -6 : 0}px)`,
        transition: "transform .2s ease",
        filter: "drop-shadow(-1px 3px 4px rgba(0,0,0,0.22))",
      }}
    >
      <IconPaperclipDaisy size={34} />
    </div>
  );
}

function IndexCardStub({ onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Quick note"
      style={{
        position: "absolute",
        right: -(MARGIN_PX - 6),
        top: "26%",
        width: 36, height: 60,
        zIndex: 1,
        // Slight clockwise angle
        transform: `rotate(6deg) translateX(${hov ? -8 : 0}px)`,
        transition: "transform .2s ease",
        cursor: "pointer",
        filter: "drop-shadow(-2px 3px 6px rgba(0,0,0,0.22))",
      }}
    >
      <div style={{
        width: "100%", height: "100%",
        background: "#fefce8",
        border: "1px solid #d4c870",
        borderRadius: "2px 3px 3px 2px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ruled lines on index card */}
        {[16, 25, 34, 43, 52].map(y => (
          <div key={y} style={{
            position: "absolute", left: 4, right: 4, top: y,
            height: 1, background: "rgba(100,120,160,0.2)",
          }} />
        ))}
        {/* Red margin line */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 8,
          width: 1, background: "rgba(200,80,80,0.18)",
        }} />
      </div>
    </div>
  );
}

function PolaroidStub({ onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Diary / photo"
      style={{
        position: "absolute",
        right: -(MARGIN_PX - 4),
        top: "48%",
        width: 44, height: 52,
        zIndex: 1,
        // Slight counter-clockwise angle
        transform: `rotate(-5deg) translateX(${hov ? -8 : 0}px)`,
        transition: "transform .2s ease",
        cursor: "pointer",
        filter: "drop-shadow(-2px 4px 7px rgba(0,0,0,0.24))",
      }}
    >
      <div style={{
        width: "100%", height: "100%",
        background: "#fff",
        border: "1px solid #d4d0ca",
        borderRadius: 2,
        padding: "4px 4px 11px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Photo area */}
        <div style={{ flex: 1, background: "#ddd", borderRadius: 1 }} />
        {/* Polaroid white strip at bottom */}
      </div>
    </div>
  );
}

// ─── OVERLAY HELPERS ──────────────────────────────────────────────────────────

function Overlay({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function IndexCardOverlay({ onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: "#fefce8", borderRadius: 5, padding: 20,
        width: 300, maxWidth: "90vw",
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        fontFamily: "var(--font-body)",
        backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(100,120,160,0.12) 23px,rgba(100,120,160,0.12) 24px)",
        backgroundPositionY: "38px",
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase", color: "#8a7a50", marginBottom: 12 }}>Quick Note</div>
        <textarea
          placeholder="Jot something down..."
          style={{
            width: "100%", minHeight: 90, background: "transparent",
            border: "none", outline: "none", resize: "none",
            fontFamily: "var(--font-body)", fontSize: 13,
            color: "#2c2416", lineHeight: "24px",
          }}
        />
        <div style={{ fontSize: 10, color: "#b0a070", marginTop: 8, borderTop: "1px solid #d4c870", paddingTop: 8 }}>
          Inbox coming soon — notes will save here.
        </div>
        <button onClick={onClose} style={{
          marginTop: 12, padding: "6px 14px", background: "#d4c870",
          border: "none", borderRadius: 4, cursor: "pointer",
          fontFamily: "var(--font-header)", fontWeight: 700, fontSize: 11, color: "#2c2416",
        }}>Close</button>
      </div>
    </Overlay>
  );
}

function PolaroidOverlay({ onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: "#fff", borderRadius: 3, padding: "14px 14px 28px",
        width: 280, maxWidth: "90vw",
        boxShadow: "0 14px 44px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          width: "100%", height: 180, background: "#e8e8e8", marginBottom: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "#aaa",
        }}>📷 Photo upload coming soon</div>
        <textarea
          placeholder="Diary entry..."
          style={{
            width: "100%", height: 50, border: "none",
            borderBottom: "1px solid #eee", outline: "none", resize: "none",
            fontSize: 12, color: "#333", fontFamily: "var(--font-body)", lineHeight: 1.6, padding: "4px 0",
          }}
        />
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 8 }}>Diary feature coming soon.</div>
        <button onClick={onClose} style={{
          marginTop: 12, padding: "6px 14px", background: "#333",
          border: "none", borderRadius: 3, cursor: "pointer",
          fontSize: 11, color: "#fff", fontFamily: "var(--font-header)", fontWeight: 700,
        }}>Close</button>
      </div>
    </Overlay>
  );
}

function StickerOverlay({ onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 24, width: 340, maxWidth: "90vw",
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
          Sticker Library
        </div>
        <div style={{
          padding: 40, border: "1px dashed var(--border)", borderRadius: 6,
          textAlign: "center", color: "var(--muted)", fontSize: 11, lineHeight: 1.7,
        }}>
          Sticker library coming soon.<br />
          <span style={{ fontSize: 10, opacity: 0.6 }}>Upload and tag images in Bindery → Fillers.</span>
        </div>
        <button onClick={onClose} style={{
          marginTop: 14, padding: "7px 16px", background: "var(--surface2)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer",
          fontFamily: "var(--font-header)", fontWeight: 700, fontSize: 11, color: "var(--muted)",
        }}>Close</button>
      </div>
    </Overlay>
  );
}

// ─── BOOK PAGE ────────────────────────────────────────────────────────────────
// Renders one page (left or right, top or bottom).
// Owns its own scroll area, margin strips, top bar, optional footer nav,
// and optional edge stubs.

function BookPage({
  slot,
  orientation,
  sectionConfig,
  pageColourHex,
  pageStyle,
  margins,
  topBarLeft,
  topBarRight,
  showFooterNav,
  showEdgeStubs,
  activeChapter,
  onNavigate,
  onIndexCard,
  onPolaroid,
  onStickerPicker,
  pageNumber,
  allowFillers,
  containerRef,
  children,
}) {
  const isLeft  = slot === "left"  || slot === "top";
  const isRight = slot === "right" || slot === "bottom";

  return (
    <div style={{
      // Equal flex — both pages get exactly half the available space
      flex: 1,
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      // Page colour is a background on the containing div
      backgroundColor: pageColourHex,
      minWidth: 0, // prevents flex children from overflowing
    }}>

      {/* Texture overlay — positioned absolute so it doesn't affect layout flow */}
      <div style={pageStyle} />

      {/* All content sits above the texture via z-index */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        height: "100%",
      }}>

        <PageTopBar leftText={topBarLeft} rightContent={topBarRight} />

        {/* Main content row: margin strip + scrollable content + margin strip */}
        <div
          ref={containerRef}
          style={{
            flex: 1, display: "flex",
            overflow: "hidden", position: "relative",
          }}
        >
          {/* Left margin strip — only on left/top page */}
          {isLeft && (
            <LeftMarginStrip
              title={sectionConfig.title}
              orientation={orientation}
            />
          )}

          {/* Scrollable content area */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            // Gutter-adjacent inner padding: 8:1:8 ratio
            // Left/top page adds extra right padding; right/bottom page adds extra left padding
            padding: isLeft
              ? `${margins.top}px ${margins.side + 32}px ${margins.bottom + 20}px ${margins.side}px`
              : `${margins.top}px ${margins.side}px ${margins.bottom + 20}px ${margins.side + 32}px`,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(100,80,60,0.1) transparent",
          }}>
            {isRight
              ? (
                // Right page gets filler detection
                <FillerSlot containerRef={containerRef} allowFillers={allowFillers}>
                  {children}
                </FillerSlot>
              )
              : children
            }
          </div>

          {/* Right margin strip — only on right/bottom page */}
          {isRight && <RightMarginStrip icon={sectionConfig.icon} />}
        </div>

        {/* Footer nav — right/bottom page only */}
        {showFooterNav && (
          <FooterNav activeChapter={activeChapter} onNavigate={onNavigate} />
        )}

      </div>

      {/* Page number — outer corner of each page */}
      <div style={{
        position: "absolute",
        bottom: showFooterNav ? 30 : 7,
        [isRight ? "right" : "left"]: 10,
        fontSize: 7.5,
        fontFamily: "var(--font-body)",
        color: "rgba(100,80,60,0.2)",
        pointerEvents: "none", zIndex: 5,
        userSelect: "none",
      }}>
        {pageNumber}
      </div>

      {/* Bottom-right corner fold hint — right page only */}
      {isRight && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: 12, height: 12,
          background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.04) 50%)",
          pointerEvents: "none", zIndex: 5,
        }} />
      )}

      {/* Edge stubs — right page only, overflow into margin zone */}
      {showEdgeStubs && (
        <>
          <PaperclipDaisy onClick={onStickerPicker} />
          <IndexCardStub onOpen={onIndexCard} />
          <PolaroidStub onOpen={onPolaroid} />
        </>
      )}
    </div>
  );
}

// ─── BOOK SHELL ───────────────────────────────────────────────────────────────

export default function BookShell({ chapters, pointsBank, navigateRef }) {
  const [activeChapter,  setActiveChapter]  = useState("morning");
  const [displayChapter, setDisplayChapter] = useState("morning");
  const [visible,        setVisible]        = useState(true);
  const [darkMode,       setDarkMode]       = useState(() => localStorage.getItem("book_darkmode") === "true");
  const [bindery,        setBindery]        = useState(loadBindery);
  const [indexCardOpen,  setIndexCardOpen]  = useState(false);
  const [polaroidOpen,   setPolaroidOpen]   = useState(false);
  const [stickerOpen,    setStickerOpen]    = useState(false);

  const orientation    = useOrientation();
  const transitionRef  = useRef(false);
  const leftPageRef    = useRef(null);
  const rightPageRef   = useRef(null);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback((id) => {
    if (id === activeChapter || transitionRef.current) return;
    transitionRef.current = true;
    setVisible(false);
    setTimeout(() => {
      setActiveChapter(id);
      setDisplayChapter(id);
      setVisible(true);
      setTimeout(() => { transitionRef.current = false; }, FADE_IN);
    }, FADE_OUT);
  }, [activeChapter]);

  useEffect(() => {
    if (navigateRef) navigateRef.current = navigate;
  }, [navigate, navigateRef]);

  // ── Dark mode ────────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("book_darkmode", String(darkMode));
    document.documentElement.setAttribute("data-book-dark", darkMode ? "true" : "false");
  }, [darkMode]);

  // ── Bindery ──────────────────────────────────────────────────────────────────
  const handleBinderyChange = (next) => { setBindery(next); saveBindery(next); };

  // ── Appearance resolution ────────────────────────────────────────────────────
  const sectionConfig = resolveSectionConfig(displayChapter, bindery.sections, bindery);
  const pageColourHex = PAGE_COLOURS.find(p => p.id === sectionConfig.pageColour)?.hex ?? "#faf8f2";
  const pageStyle     = getPageStyle(sectionConfig.pagePattern, pageColourHex);
  const clothHex      = CLOTH_COLOURS.find(c => c.id === bindery.clothColour)?.hex ?? "#1a2744";
  const spineW        = SPINE_MAP[bindery.spineWidth] ?? 38;
  const margins       = MARGIN_MAP[bindery.marginSize] ?? MARGIN_MAP.normal;
  const bgCss         = getBackgroundCss(bindery.bgTexture, bindery.bgColour);
  // Gutter shadow is fixed at slim (20px) — not user-configurable
  const gutterPx      = 20;
  // Outer right-side spine strip width (always slim — it's a cover edge, not a spine)
  const outerSpineW   = 8;

  // ── Content slot resolver ────────────────────────────────────────────────────
  // For the Bindery chapter, we define inline: settings on left, preview on right.
  // For stub chapters, makeStubChapter() returns a function that shows coming-soon.
  // For all other chapters, DayPlanner provides a (slot, orientation) => JSX fn.

  const getSlot = (slot) => {
    if (displayChapter === "bindery") {
      if (slot === "left" || slot === "top") {
        return <Bindery settings={bindery} onChange={handleBinderyChange} />;
      }
      return (
        <div style={{
          height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.35,
        }}>
          {/* Live mini book preview on right page of Bindery */}
          <div style={{
            display: "flex", height: 80, width: 160,
            borderRadius: 3, overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}>
            <div style={{
              width: SPINE_MAP[bindery.spineWidth],
              background: `linear-gradient(to right,${clothHex}cc,${clothHex})`,
              backgroundImage: "repeating-linear-gradient(135deg,transparent,transparent 2px,rgba(255,255,255,0.05) 2px,rgba(255,255,255,0.05) 4px)",
              borderRight: "1px solid rgba(0,0,0,0.2)", flexShrink: 0,
            }} />
            <div style={{ flex: 1, backgroundColor: pageColourHex }} />
            <div style={{ flex: 1, backgroundColor: pageColourHex, borderLeft: "1px solid rgba(0,0,0,0.06)" }} />
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-body)", color: "rgba(100,80,60,0.5)", textAlign: "center", lineHeight: 1.6 }}>
            Configure your book<br />on the left page
          </div>
        </div>
      );
    }

    // ── Poetry section — full implementation ──────────────────────────────────
    if (displayChapter === "poetry") {
      // Both page slots receive the same PoetrySection component.
      // PoetrySection renders its own internal left/right split (browse + poem),
      // filling the full width of whichever slot it's placed in.
      // We render it only in the right slot to use the full two-page area,
      // and leave the left slot blank (PoetrySection's browse panel handles that).
      if (slot === "right" || slot === "bottom") {
        return (
          <PoetrySection bindery={bindery} />
        );
      }
      // Left slot: empty — PoetrySection owns its own browse panel internally
      return null;
    }

    const chapterDef = CHAPTER_DEFS.find(c => c.id === displayChapter);
    if (chapterDef?.stub) {
      const stubs = {
        calendar: { emoji: "📅", desc: "Google Calendar integration — view upcoming events and block time for tasks." },
        daybook:  { emoji: "📸", desc: "Daily diary entries with photos, mood tracking, and reflections." },
      };
      const s = stubs[displayChapter] ?? { emoji: "📖", desc: "Coming soon." };
      return makeStubChapter(chapterDef.label, s.desc, s.emoji)(slot, orientation);
    }

    const fn = chapters[displayChapter];
    if (!fn) return null;
    return typeof fn === "function" ? fn(slot, orientation) : fn;
  };

  // ── Shared values ─────────────────────────────────────────────────────────────
  const today    = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const chapIdx  = CHAPTER_DEFS.findIndex(c => c.id === displayChapter);
  const darkBtn  = (
    <button
      onClick={() => setDarkMode(d => !d)}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
    >
      {darkMode
        ? <IconSun  size={10} color="rgba(100,80,60,0.36)" strokeWidth={1.5} />
        : <IconMoon size={10} color="rgba(100,80,60,0.36)" strokeWidth={1.5} />
      }
    </button>
  );

  const sharedPageProps = {
    orientation, sectionConfig, pageColourHex, pageStyle, margins,
    activeChapter, onNavigate: navigate,
    allowFillers: sectionConfig.allowFillers,
    onIndexCard:     () => setIndexCardOpen(true),
    onPolaroid:      () => setPolaroidOpen(true),
    onStickerPicker: () => setStickerOpen(true),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Full viewport, no scrollbars on body — the book fills everything */
        html, body {
          width: 100%; height: 100%;
          overflow: hidden;
          font-family: var(--font-body, Georgia, serif);
        }

        body {
          ${bgCss}
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color .4s;
        }

        /*
         * .book-wrap: the entire book (spine + pages).
         * Fills the viewport minus MARGIN_PX on each side.
         * overflow:visible allows stubs to extend into the margin zone.
         */
        .book-wrap {
          width:  calc(100vw  - ${MARGIN_PX * 2}px);
          height: calc(100vh  - ${MARGIN_PX * 2}px);
          display: flex;
          align-items: stretch;
          /* Hardcover shadow — deeper on spine side, lighter on page side */
          box-shadow:
            -10px 0  30px rgba(0,0,0,0.38),
             0    12px 50px rgba(0,0,0,0.30),
             0    2px  8px  rgba(0,0,0,0.16),
             6px  0   20px  rgba(0,0,0,0.12);
          border-radius: 2px 5px 5px 2px;
          /* Critical: lets stubs overflow the page boundary */
          overflow: visible;
          position: relative;
        }

        /* Spine — cloth-textured left edge */
        .book-spine {
          flex-shrink: 0;
          border-radius: 2px 0 0 2px;
          position: relative;
          overflow: hidden;
          z-index: 2;
        }
        /* Cloth weave — two overlapping diagonal gradients */
        .book-spine::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px),
            repeating-linear-gradient(45deg,  transparent 0, transparent 2px, rgba(0,0,0,0.05)       2px, rgba(0,0,0,0.05)       4px);
        }
        /* Inner shadow on right edge of spine — makes it look rounded */
        .book-spine::after {
          content: '';
          position: absolute; top: 0; bottom: 0; right: 0; width: 10px;
          background: linear-gradient(to right, transparent, rgba(0,0,0,0.22));
          pointer-events: none;
        }

        /*
         * .book-pages: contains both page divs.
         * In landscape: flex-direction row (side by side).
         * In portrait: flex-direction column (stacked).
         * overflow:visible so stubs aren't clipped.
         */
        .book-pages {
          flex: 1;
          display: flex;
          position: relative;
          /* Clip the pages themselves to the book boundary */
          border-radius: 0 5px 5px 0;
          /* Inner left shadow — suggests gutter depth */
          box-shadow: inset 5px 0 12px rgba(0,0,0,0.07);
          overflow: visible;
        }
        .book-pages.landscape { flex-direction: row; }
        .book-pages.portrait  { flex-direction: column; }

        /* Clip pages but not stubs — achieved by clipping the inner wrapper */
        .pages-clip {
          position: absolute; inset: 0;
          border-radius: 0 5px 5px 0;
          overflow: hidden;
          display: flex;
          flex: 1;
        }
        .pages-clip.portrait { flex-direction: column; }

        /* Dissolve transition — applied to the inner flex wrapper */
        .fade-wrap {
          display: flex; flex: 1;
          transition: opacity ${FADE_OUT}ms ease, filter ${FADE_OUT}ms ease;
        }
        .fade-wrap.portrait { flex-direction: column; }
        .fade-wrap.out { opacity: 0; filter: blur(3px); }
        .fade-wrap.in {
          opacity: 1; filter: blur(0);
          transition: opacity ${FADE_IN}ms ease, filter ${FADE_IN}ms ease;
        }

        /* Slim custom scrollbar on page content */
        .book-pages ::-webkit-scrollbar { width: 3px; }
        .book-pages ::-webkit-scrollbar-track { background: transparent; }
        .book-pages ::-webkit-scrollbar-thumb { background: rgba(100,80,60,0.12); border-radius: 2px; }

        /* Mobile: book fills full screen, spine hides */
        @media (max-width: 480px) {
          .book-wrap { width: 100vw; height: 100vh; border-radius: 0; box-shadow: none; }
          .book-spine { display: none; }
          .pages-clip { border-radius: 0; }
        }
      `}</style>

      <div className="book-wrap">

        {/* ── SPINE ── */}
        <div
          className="book-spine"
          style={{
            width: spineW,
            background: `linear-gradient(to right, ${clothHex}dd, ${clothHex})`,
          }}
        >
          {/* Spine title — vertical, faint */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 7, fontWeight: 700,
              letterSpacing: "2.5px", textTransform: "uppercase",
              color: "rgba(255,255,255,0.16)",
              fontFamily: "var(--font-header)",
              userSelect: "none", whiteSpace: "nowrap",
            }}>
              Commonplace
            </span>
          </div>
        </div>

        {/* ── PAGES ── */}
        {/*
          Two-layer approach for stubs:
          - .book-pages: overflow:visible so stubs can extend into the margin zone
          - .pages-clip: overflow:hidden clips the actual page content to the book boundary
          The stubs live in BookPage as position:absolute children of .book-pages,
          so they're clipped by .pages-clip but NOT by .book-pages.
          Wait — that's backwards. We need:
            - pages-clip to clip the page backgrounds/textures
            - stubs to be children of book-pages (outside pages-clip) OR
              use z-index and overflow:visible carefully.
          
          Simplest correct solution: stubs are children of .book-wrap directly,
          positioned relative to .book-wrap. BookPage doesn't render them.
        */}
        <div className={`book-pages ${orientation}`}>

          {/* Clipping wrapper for page backgrounds and content */}
          <div className={`pages-clip ${orientation === "portrait" ? "portrait" : ""}`} style={{ zIndex: 2 }}>
            <div className={`fade-wrap ${orientation === "portrait" ? "portrait" : ""} ${visible ? "in" : "out"}`}>

              {/* LEFT page (landscape) / TOP page (portrait) */}
              <BookPage
                slot={orientation === "landscape" ? "left" : "top"}
                topBarLeft={today}
                topBarRight={pointsBank > 0 ? `🪙 ${pointsBank.toLocaleString()}` : ""}
                showFooterNav={false}
                showEdgeStubs={false}
                pageNumber={chapIdx * 2}
                containerRef={leftPageRef}
                {...sharedPageProps}
              >
                {getSlot(orientation === "landscape" ? "left" : "top")}
              </BookPage>

              {/* RIGHT page (landscape) / BOTTOM page (portrait) */}
              <BookPage
                slot={orientation === "landscape" ? "right" : "bottom"}
                topBarLeft={sectionConfig.title}
                topBarRight={darkBtn}
                showFooterNav
                showEdgeStubs={false}  // stubs rendered separately below
                pageNumber={chapIdx * 2 + 1}
                containerRef={rightPageRef}
                {...sharedPageProps}
              >
                {getSlot(orientation === "landscape" ? "right" : "bottom")}
              </BookPage>

            </div>
          </div>

          {/* Gutter shadow — landscape only, overlays both pages */}
          {orientation === "landscape" && <GutterShadow gutterPx={gutterPx} />}

        </div>

        {/* Right outer spine strip — cloth edge on the far right of the book */}
        <OuterSpineStrip clothHex={clothHex} width={outerSpineW} />

        {/*
          STUBS — children of .book-wrap, positioned absolute relative to it.
          Because .book-wrap has overflow:visible, these extend into the margin zone.
          They sit on TOP of .book-pages (z-index > pages content) but their
          shadows fall downward, making them look inserted into the right page.
          
          Positions are percentages of .book-wrap height, right-aligned.
        */}
        <PaperclipDaisy onClick={() => setStickerOpen(true)} />
        <IndexCardStub  onOpen={() => setIndexCardOpen(true)} />
        <PolaroidStub   onOpen={() => setPolaroidOpen(true)} />

      </div>

      {/* Overlays */}
      {indexCardOpen && <IndexCardOverlay onClose={() => setIndexCardOpen(false)} />}
      {polaroidOpen  && <PolaroidOverlay  onClose={() => setPolaroidOpen(false)}  />}
      {stickerOpen   && <StickerOverlay   onClose={() => setStickerOpen(false)}   />}
    </>
  );
}
