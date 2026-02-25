// ─── THEMES ───────────────────────────────────────────────────────────────────
// Each theme defines:
//   colors   — maps to CSS custom properties on :root
//   fonts    — headerFont + bodyFont (Google Fonts families)
//   radius   — border-radius scale: "sharp" | "normal" | "round"
//
// The applyTheme() function writes these values directly to document.documentElement
// (the <html> element), which is where :root lives. Every var(--x) in the CSS
// then picks up the new value instantly — no re-render needed.
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_PAIRS = [
  { label: "Syne + JetBrains Mono",   header: "Syne",           body: "JetBrains Mono" },
  { label: "Inter + Inter",           header: "Inter",           body: "Inter" },
  { label: "Playfair + Source Sans",  header: "Playfair Display",body: "Source Sans 3" },
  { label: "Fraunces + DM Sans",      header: "Fraunces",        body: "DM Sans" },
  { label: "Space Grotesk + Mono",    header: "Space Grotesk",   body: "Space Mono" },
  { label: "Libre Baskerville + Lato",header: "Libre Baskerville",body: "Lato" },
  { label: "Raleway + Open Sans",     header: "Raleway",         body: "Open Sans" },
];

export const RADIUS_OPTIONS = [
  { label: "Sharp",  value: "sharp",  px: 3  },
  { label: "Normal", value: "normal", px: 9  },
  { label: "Round",  value: "round",  px: 18 },
];

// ─── DEFAULT THEMES ───────────────────────────────────────────────────────────
// Colors map directly to the CSS variables used throughout the app.
// dark: true  → text-on-accent is #0a0b0e (dark bg, light text convention reversed)
// dark: false → text-on-accent is #ffffff

export const DEFAULT_THEMES = [
  {
    id: "terminal-green",
    name: "Terminal Green",
    dark: true,
    builtIn: true,
    colors: {
      bg:      "#0a0b0e",
      surface: "#13151c",
      surface2:"#1a1d26",
      surface3:"#20232e",
      border:  "#252835",
      border2: "#2e3245",
      gold:    "#f0c040",
      gold2:   "#ffd97a",
      teal:    "#3de8be",
      teal2:   "#7fffd4",
      acid:    "#d4f03a",
      acid2:   "#eeff70",
      red:     "#ff5656",
      warn:    "#ff9f43",
      muted:   "#5a6070",
      text:    "#dde1ee",
      text2:   "#8a90a8",
    },
    fonts: { header: "Syne", body: "JetBrains Mono" },
    radius: "normal",
  },
  {
    id: "sunshine",
    name: "Sunshine",
    dark: true,
    builtIn: true,
    colors: {
      bg:      "#1a1200",
      surface: "#241a00",
      surface2:"#2e2200",
      surface3:"#382a00",
      border:  "#4a3800",
      border2: "#5c4600",
      gold:    "#ffcc00",
      gold2:   "#ffe066",
      teal:    "#ff8c42",
      teal2:   "#ffb380",
      acid:    "#ffe600",
      acid2:   "#fff176",
      red:     "#ff5252",
      warn:    "#ff9800",
      muted:   "#7a6a30",
      text:    "#fff8e1",
      text2:   "#c8b870",
    },
    fonts: { header: "Fraunces", body: "DM Sans" },
    radius: "round",
  },
  {
    id: "ocean",
    name: "Ocean",
    dark: false,
    builtIn: true,
    colors: {
      bg:      "#eaf4fb",
      surface: "#ffffff",
      surface2:"#d6eaf8",
      surface3:"#c2dff5",
      border:  "#b0d0ea",
      border2: "#8ab8d8",
      gold:    "#1565c0",
      gold2:   "#1976d2",
      teal:    "#0077b6",
      teal2:   "#023e8a",
      acid:    "#0077b6",
      acid2:   "#023e8a",
      red:     "#c0392b",
      warn:    "#e67e22",
      muted:   "#7f9fb5",
      text:    "#0d1b2a",
      text2:   "#2c5f7a",
    },
    fonts: { header: "Raleway", body: "Open Sans" },
    radius: "round",
  },
  {
    id: "calm",
    name: "Calm",
    dark: true,
    builtIn: true,
    colors: {
      bg:      "#12131a",
      surface: "#1a1b26",
      surface2:"#22243a",
      surface3:"#2a2d45",
      border:  "#2e3254",
      border2: "#3a3f68",
      gold:    "#c3a6ff",
      gold2:   "#d4bcff",
      teal:    "#7dcfff",
      teal2:   "#a9d8ff",
      acid:    "#bb9af7",
      acid2:   "#cdb4fd",
      red:     "#f7768e",
      warn:    "#ff9e64",
      muted:   "#565f89",
      text:    "#c0caf5",
      text2:   "#7aa2f7",
    },
    fonts: { header: "Space Grotesk", body: "Space Mono" },
    radius: "normal",
  },
  {
    id: "linen",
    name: "Linen",
    dark: false,
    builtIn: true,
    colors: {
      bg:      "#f5f0e8",
      surface: "#ffffff",
      surface2:"#ede8df",
      surface3:"#e0d9ce",
      border:  "#d0c8bc",
      border2: "#b8afa2",
      gold:    "#8b5e3c",
      gold2:   "#a67c52",
      teal:    "#5b8a6e",
      teal2:   "#3d6b52",
      acid:    "#7a5230",
      acid2:   "#9c6840",
      red:     "#c0392b",
      warn:    "#d35400",
      muted:   "#9e9080",
      text:    "#2c2416",
      text2:   "#6b5d4f",
    },
    fonts: { header: "Libre Baskerville", body: "Lato" },
    radius: "sharp",
  },
  {
    id: "deep-purple",
    name: "Deep Purple",
    dark: true,
    builtIn: true,
    colors: {
      bg:      "#0e0a1a",
      surface: "#170f2e",
      surface2:"#1e1540",
      surface3:"#261b52",
      border:  "#2e2060",
      border2: "#3d2a80",
      gold:    "#e040fb",
      gold2:   "#ea80fc",
      teal:    "#7c4dff",
      teal2:   "#b39dff",
      acid:    "#d500f9",
      acid2:   "#e040fb",
      red:     "#ff1744",
      warn:    "#ff6d00",
      muted:   "#6a5a8a",
      text:    "#ede7f6",
      text2:   "#b39ddb",
    },
    fonts: { header: "Syne", body: "Inter" },
    radius: "normal",
  },
  {
    id: "kraft",
    name: "Kraft",
    dark: true,
    builtIn: true,
    colors: {
      bg:      "#1a1208",
      surface: "#241a0c",
      surface2:"#2e2210",
      surface3:"#382a14",
      border:  "#4a3820",
      border2: "#5c4a2c",
      gold:    "#d4a017",
      gold2:   "#e8b830",
      teal:    "#8b7355",
      teal2:   "#a68b6a",
      acid:    "#c8860a",
      acid2:   "#dda020",
      red:     "#c0392b",
      warn:    "#e67e22",
      muted:   "#7a6545",
      text:    "#f0e6d0",
      text2:   "#c4a870",
    },
    fonts: { header: "Fraunces", body: "Lato" },
    radius: "sharp",
  },
  {
    id: "typeset",
    name: "Typeset",
    dark: false,
    builtIn: true,
    colors: {
      bg:      "#ffffff",
      surface: "#f8f8f8",
      surface2:"#eeeeee",
      surface3:"#e0e0e0",
      border:  "#cccccc",
      border2: "#aaaaaa",
      gold:    "#111111",
      gold2:   "#333333",
      teal:    "#111111",
      teal2:   "#333333",
      acid:    "#111111",
      acid2:   "#333333",
      red:     "#cc0000",
      warn:    "#cc6600",
      muted:   "#888888",
      text:    "#111111",
      text2:   "#555555",
    },
    fonts: { header: "Playfair Display", body: "Source Sans 3" },
    radius: "sharp",
  },
  {
    id: "neutral",
    name: "Neutral",
    dark: true,
    builtIn: true,
    colors: {
      bg:      "#111111",
      surface: "#1c1c1c",
      surface2:"#252525",
      surface3:"#2e2e2e",
      border:  "#333333",
      border2: "#444444",
      gold:    "#aaaaaa",
      gold2:   "#cccccc",
      teal:    "#888888",
      teal2:   "#aaaaaa",
      acid:    "#dddddd",
      acid2:   "#eeeeee",
      red:     "#cc4444",
      warn:    "#cc8844",
      muted:   "#555555",
      text:    "#eeeeee",
      text2:   "#999999",
    },
    fonts: { header: "Inter", body: "Inter" },
    radius: "sharp",
  },
];

// ─── GOOGLE FONTS LOADER ─────────────────────────────────────────────────────
// Dynamically injects a <link> tag for the required font families.
// We deduplicate so the same family isn't requested twice.

let loadedFonts = new Set();

export function loadGoogleFont(family) {
  if (loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const encoded = encodeURIComponent(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(link);
}

// ─── RADIUS MAP ───────────────────────────────────────────────────────────────
// Translates the named radius scale to actual pixel values for each use case.

const RADIUS_MAP = {
  sharp:  { sm: 2,  md: 4,  lg: 6,  xl: 8  },
  normal: { sm: 6,  md: 9,  lg: 12, xl: 16 },
  round:  { sm: 12, md: 18, lg: 24, xl: 32 },
};

// ─── APPLY THEME ─────────────────────────────────────────────────────────────
// Writes all theme values as CSS custom properties on :root.
// This is the single function that makes the whole app repaint.

export function applyTheme(theme) {
  const root = document.documentElement;
  const { colors, fonts, radius, dark } = theme;

  // Load fonts dynamically if not already loaded
  loadGoogleFont(fonts.header);
  loadGoogleFont(fonts.body);

  // Colors
  Object.entries(colors).forEach(([key, val]) => {
    root.style.setProperty(`--${key}`, val);
  });

  // Fonts
  root.style.setProperty("--font-header", `'${fonts.header}', sans-serif`);
  root.style.setProperty("--font-body",   `'${fonts.body}', monospace`);

  // Border radius scale
  const r = RADIUS_MAP[radius] || RADIUS_MAP.normal;
  root.style.setProperty("--radius-sm", `${r.sm}px`);
  root.style.setProperty("--radius-md", `${r.md}px`);
  root.style.setProperty("--radius-lg", `${r.lg}px`);
  root.style.setProperty("--radius-xl", `${r.xl}px`);

  // Dark/light mode flag — used for text on accent-coloured buttons
  root.style.setProperty("--on-accent", dark ? "#0a0b0e" : "#ffffff");

  // Color scheme hint for native browser elements (date inputs, scrollbars etc)
  root.style.setProperty("color-scheme", dark ? "dark" : "light");
}

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

const ACTIVE_KEY    = "theme_active";
const CUSTOM_KEY    = "themes_custom";
const HIDDEN_KEY    = "themes_hidden";

export function saveActiveThemeId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function loadActiveThemeId() {
  return localStorage.getItem(ACTIVE_KEY) || "terminal-green";
}

export function saveCustomThemes(themes) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(themes));
}

export function loadCustomThemes() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || [];
  } catch { return []; }
}

export function saveHiddenThemes(ids) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
}

export function loadHiddenThemes() {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || [];
  } catch { return []; }
}
