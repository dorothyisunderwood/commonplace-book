// ─── CHAPTER CONTENT HELPERS ──────────────────────────────────────────────────
//
// The chapter content API uses a function signature:
//   (slot, orientation) => JSX
//
// where:
//   slot        = "left" | "right"  (landscape)
//               = "top"  | "bottom" (portrait)
//   orientation = "landscape" | "portrait"
//
// This means React only renders the content it needs for the active slot.
// State is preserved across orientation changes because the same component
// instance is reused rather than unmounted and remounted.
//
// ─────────────────────────────────────────────────────────────────────────────

// splitChapter(leftOrTop, rightOrBottom)
// ────────────────────────────────────────
// The helper for the common case: you have two distinct pieces of content,
// one for each page. In landscape: left/right. In portrait: top/bottom.
// The same content appears regardless of orientation — it just moves slots.
//
// Usage:
//   morning: splitChapter(<MorningContext />, <MorningCheckin />)
//
// For full control (e.g. orientation-aware layouts), use the raw function:
//   rewards: (slot, orientation) => {
//     if (orientation === "portrait" && slot === "top") return <RewardsFull />;
//     if (slot === "left") return <RewardsSidebar />;
//     return <RewardsGrid />;
//   }

export function splitChapter(leftOrTop, rightOrBottom) {
  return (slot) =>
    (slot === "left" || slot === "top") ? leftOrTop : rightOrBottom;
}

// ─── SECTION CONFIG DEFAULTS ──────────────────────────────────────────────────
// Each section can override page colour, pattern, icon, title, and filler policy.
// These are the factory defaults — Bindery lets users override per section.

export const SECTION_DEFAULTS = {
  morning:  { pageColour: "ivory",  pagePattern: "ruled",  icon: "☀",  title: "Morning",  allowFillers: true  },
  plan:     { pageColour: "ivory",  pagePattern: "dots",   icon: "📋", title: "Plan",     allowFillers: true  },
  tasks:    { pageColour: "cream",  pagePattern: "ruled",  icon: "✓",  title: "Tasks",    allowFillers: false },
  add:      { pageColour: "ivory",  pagePattern: "plain",  icon: "＋", title: "Add",      allowFillers: false },
  rewards:  { pageColour: "aged",   pagePattern: "plain",  icon: "★",  title: "Rewards",  allowFillers: true  },
  calendar: { pageColour: "ivory",  pagePattern: "grid",   icon: "📅", title: "Calendar", allowFillers: false },
  daybook:  { pageColour: "cream",  pagePattern: "ruled",  icon: "📖", title: "Daybook",  allowFillers: true  },
  poetry:   { pageColour: "aged",   pagePattern: "ruled",  icon: "✍",  title: "Poetry",   allowFillers: true  },
  bindery:  { pageColour: "white",  pagePattern: "plain",  icon: "⚙",  title: "Bindery",  allowFillers: false },
  settings: { pageColour: "white",  pagePattern: "plain",  icon: "⚙",  title: "Settings", allowFillers: false },
};

// Merge user-saved section config with defaults
export function resolveSectionConfig(sectionId, savedSections = {}) {
  return {
    ...SECTION_DEFAULTS[sectionId] ?? SECTION_DEFAULTS.morning,
    ...savedSections[sectionId],
  };
}

// ─── FILLER DETECTION ─────────────────────────────────────────────────────────
// BookShell attaches a ResizeObserver to each page slot's inner content div.
// When the inner content height is measured as significantly less than the
// available page height, the slot is marked as "filler-eligible".
//
// FILLER_GAP_THRESHOLD: minimum empty pixels before we insert a filler.
// Set conservatively — we don't want fillers appearing when only a few lines
// of space remain, as that looks cramped rather than intentional.

export const FILLER_GAP_THRESHOLD = 120; // px

// Given measured heights, returns whether a filler should be shown
export function shouldShowFiller(contentHeight, containerHeight, allowFillers) {
  if (!allowFillers) return false;
  const gap = containerHeight - contentHeight;
  return gap >= FILLER_GAP_THRESHOLD;
}

// ─── STUB CHAPTER WRAPPER ─────────────────────────────────────────────────────
// Chapters marked as stubs in CHAPTER_DEFS get this default content.
// Both slots show the same coming-soon state.

export function makeStubChapter(label, description, emoji) {
  const content = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", minHeight: 200,
      gap: 14, padding: 32, textAlign: "center",
    }}>
      <div style={{ fontSize: 40, opacity: 0.18 }}>{emoji}</div>
      <div style={{
        fontFamily: "var(--font-header)", fontSize: 16, fontWeight: 700,
        color: "var(--text)", opacity: 0.35, letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-body)", fontSize: 11,
        color: "var(--muted)", maxWidth: 200, lineHeight: 1.7, opacity: 0.55,
      }}>
        {description}
      </div>
      <div style={{
        fontSize: 9, fontFamily: "var(--font-body)", color: "var(--muted)",
        border: "1px dashed rgba(100,80,60,0.25)", borderRadius: 4,
        padding: "5px 12px", opacity: 0.5, letterSpacing: "0.5px",
      }}>
        coming soon
      </div>
    </div>
  );
  // Both slots show the same content for stub chapters
  return () => content;
}

// ─── BACKGROUND TEXTURES ──────────────────────────────────────────────────────
// CSS-only surface textures for the desk area behind the book.
// No image files — all generated via CSS gradients and SVG patterns.

export const BACKGROUND_TEXTURES = [
  {
    id: "solid",
    name: "Solid Colour",
    preview: null, // uses colour picker only
    getCss: (colour) => `background: ${colour};`,
  },
  {
    id: "linen",
    name: "Linen",
    preview: "#c8b89a",
    getCss: (colour) => `
      background-color: ${colour || "#c8b89a"};
      background-image:
        repeating-linear-gradient(
          0deg, transparent, transparent 2px,
          rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px
        ),
        repeating-linear-gradient(
          90deg, transparent, transparent 4px,
          rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px
        );
    `.trim(),
  },
  {
    id: "oak",
    name: "Oak Wood",
    preview: "#8b6914",
    getCss: (colour) => `
      background-color: ${colour || "#7a5c18"};
      background-image:
        repeating-linear-gradient(
          88deg,
          transparent 0px, transparent 8px,
          rgba(0,0,0,0.04) 8px, rgba(0,0,0,0.04) 9px,
          transparent 9px, transparent 18px,
          rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 19px
        ),
        repeating-linear-gradient(
          2deg,
          transparent 0px, transparent 40px,
          rgba(0,0,0,0.03) 40px, rgba(0,0,0,0.03) 41px
        );
    `.trim(),
  },
  {
    id: "marble",
    name: "Marble",
    preview: "#d8d0c8",
    getCss: (colour) => `
      background-color: ${colour || "#d8d0c8"};
      background-image:
        repeating-linear-gradient(
          128deg,
          transparent 0px, transparent 12px,
          rgba(255,255,255,0.12) 12px, rgba(255,255,255,0.12) 13px,
          transparent 13px, transparent 28px,
          rgba(0,0,0,0.04) 28px, rgba(0,0,0,0.04) 30px
        ),
        repeating-linear-gradient(
          42deg,
          transparent 0px, transparent 22px,
          rgba(255,255,255,0.06) 22px, rgba(255,255,255,0.06) 23px
        );
    `.trim(),
  },
  {
    id: "cork",
    name: "Cork Board",
    preview: "#c4963c",
    getCss: (colour) => `
      background-color: ${colour || "#b8892e"};
      background-image:
        radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 60%, rgba(255,255,255,0.04) 0%, transparent 40%),
        radial-gradient(ellipse at 45% 80%, rgba(0,0,0,0.04) 0%, transparent 45%),
        repeating-linear-gradient(
          45deg,
          transparent 0px, transparent 3px,
          rgba(0,0,0,0.02) 3px, rgba(0,0,0,0.02) 6px
        );
    `.trim(),
  },
  {
    id: "wool",
    name: "Dark Wool",
    preview: "#2a2a3a",
    getCss: (colour) => `
      background-color: ${colour || "#2a2a3a"};
      background-image:
        repeating-linear-gradient(
          45deg,
          transparent 0px, transparent 1px,
          rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px
        ),
        repeating-linear-gradient(
          135deg,
          transparent 0px, transparent 1px,
          rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px
        );
    `.trim(),
  },
];

export function getBackgroundCss(textureId, colour) {
  const texture = BACKGROUND_TEXTURES.find(t => t.id === textureId) ?? BACKGROUND_TEXTURES[0];
  return texture.getCss(colour);
}
