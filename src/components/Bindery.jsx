import { useState, useEffect } from "react";
import { SECTION_DEFAULTS, BACKGROUND_TEXTURES, getBackgroundCss } from "../lib/chapterHelpers.jsx";

// ─── BINDERY CONSTANTS ────────────────────────────────────────────────────────

export const CLOTH_COLOURS = [
  { id: "oxford-navy",   name: "Oxford Navy",   hex: "#1a2744" },
  { id: "bottle-green",  name: "Bottle Green",  hex: "#1a3a2a" },
  { id: "oxblood",       name: "Oxblood Red",   hex: "#5c1a1a" },
  { id: "charcoal",      name: "Charcoal",      hex: "#2a2a2a" },
  { id: "antique-brown", name: "Antique Brown", hex: "#4a3220" },
  { id: "dusty-rose",    name: "Dusty Rose",    hex: "#7a3a48" },
  { id: "slate-blue",    name: "Slate Blue",    hex: "#2a3a5c" },
  { id: "black",         name: "Black",         hex: "#111111" },
];

export const PAGE_COLOURS = [
  { id: "ivory",      name: "Ivory",      hex: "#faf8f2" },
  { id: "cream",      name: "Cream",      hex: "#f5f0e0" },
  { id: "aged",       name: "Aged",       hex: "#ede0c4" },
  { id: "white",      name: "White",      hex: "#ffffff" },
  { id: "pale-blue",  name: "Pale Blue",  hex: "#f0f4f8" },
  { id: "pale-green", name: "Pale Green", hex: "#f0f5f0" },
  { id: "blush",      name: "Blush",      hex: "#f8f0f0" },
];

export const PAGE_TEXTURES = [
  { id: "plain",  name: "Plain",       icon: "□" },
  { id: "ruled",  name: "Ruled",       icon: "≡" },
  { id: "dots",   name: "Dot Grid",    icon: "⁚" },
  { id: "grid",   name: "Square Grid", icon: "⊞" },
  { id: "graph",  name: "Graph",       icon: "⊟" },
];

// ─── GUTTER SIZES ─────────────────────────────────────────────────────────────

export const GUTTER_SIZES = [
  { id: "slim",     label: "Slim",     px: 20  },
  { id: "normal",   label: "Normal",   px: 40  },
  { id: "wide",     label: "Wide",     px: 70  },
  { id: "generous", label: "Generous", px: 100 },
];

// ─── GOOGLE FONTS ─────────────────────────────────────────────────────────────
// 16 fonts grouped by character. All 16 appear in every dropdown.
// Each font entry records: id, display name, CSS family string, Google Fonts
// query string, and a "group" label shown as <optgroup> in the select.
//
// Design principle: the user sees the font name rendered IN that font inside
// the live preview below the dropdown, so filtering by "role" is unnecessary —
// they can judge suitability themselves.

export const BOOK_FONTS = [
  // ── Readable Serifs ──────────────────────────────────────────────────────────
  // Best for body text — high legibility at small sizes, classic book feel.
  { id: "lora",           name: "Lora",                family: "'Lora', serif",                      group: "Readable Serifs",    google: "Lora:ital,wght@0,400;0,600;1,400" },
  { id: "playfair",       name: "Playfair Display",    family: "'Playfair Display', serif",           group: "Readable Serifs",    google: "Playfair+Display:ital,wght@0,400;0,700;1,400" },
  { id: "eb-garamond",    name: "EB Garamond",         family: "'EB Garamond', serif",                group: "Readable Serifs",    google: "EB+Garamond:ital,wght@0,400;0,600;1,400" },
  { id: "spectral",       name: "Spectral",            family: "'Spectral', serif",                   group: "Readable Serifs",    google: "Spectral:ital,wght@0,400;0,600;1,400" },
  { id: "merriweather",   name: "Merriweather",        family: "'Merriweather', serif",               group: "Readable Serifs",    google: "Merriweather:ital,wght@0,400;0,700;1,400" },
  // ── Informal & Calligraphy ───────────────────────────────────────────────────
  // Expressive — better for headings and short labels than long body text.
  { id: "dancing-script", name: "Dancing Script",      family: "'Dancing Script', cursive",           group: "Informal & Calligraphy", google: "Dancing+Script:wght@400;700" },
  { id: "caveat",         name: "Caveat",              family: "'Caveat', cursive",                   group: "Informal & Calligraphy", google: "Caveat:wght@400;600" },
  { id: "pacifico",       name: "Pacifico",            family: "'Pacifico', cursive",                 group: "Informal & Calligraphy", google: "Pacifico" },
  { id: "satisfy",        name: "Satisfy",             family: "'Satisfy', cursive",                  group: "Informal & Calligraphy", google: "Satisfy" },
  { id: "kalam",          name: "Kalam",               family: "'Kalam', cursive",                    group: "Informal & Calligraphy", google: "Kalam:wght@400;700" },
  // ── Typewriter ───────────────────────────────────────────────────────────────
  // Monospaced — good for labels, data, margin notes, and technical content.
  { id: "special-elite",  name: "Special Elite",       family: "'Special Elite', cursive",            group: "Typewriter",          google: "Special+Elite" },
  { id: "courier-prime",  name: "Courier Prime",       family: "'Courier Prime', monospace",          group: "Typewriter",          google: "Courier+Prime:ital,wght@0,400;0,700;1,400" },
  { id: "jetbrains",      name: "JetBrains Mono",      family: "'JetBrains Mono', monospace",         group: "Typewriter",          google: "JetBrains+Mono:wght@400;600" },
  // ── Dyslexia-Friendly ────────────────────────────────────────────────────────
  // Designed for maximum readability — wider spacing, distinct letterforms.
  { id: "atkinson",       name: "Atkinson Hyperlegible", family: "'Atkinson Hyperlegible', sans-serif", group: "Dyslexia-Friendly",  google: "Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400" },
  { id: "nunito",         name: "Nunito",              family: "'Nunito', sans-serif",                group: "Dyslexia-Friendly",  google: "Nunito:ital,wght@0,400;0,700;1,400" },
  { id: "andika",         name: "Andika",              family: "'Andika', sans-serif",                group: "Dyslexia-Friendly",  google: "Andika:ital,wght@0,400;1,400" },
];

// Font roles — three distinct roles with different preview texts.
// The "body" role specifically calls out that heavy calligraphic fonts
// are harder to read at length — noted in the description.
export const FONT_ROLES = [
  {
    id: "header",
    label: "Headings & titles",
    description: "Section names, chapter titles, UI labels. Expressive fonts work well here.",
    settingKey: "fontHeader",
    preview: "Morning Check-in",
    previewSub: "Commonplace Book",
  },
  {
    id: "body",
    label: "Body & content text",
    description: "Paragraphs, task names, notes. Prioritise legibility — avoid heavy calligraphy for long reading.",
    settingKey: "fontBody",
    preview: "Today I woke early and made coffee before the sun had fully risen above the garden wall.",
    previewSub: null,
  },
  {
    id: "label",
    label: "Labels, spine & margin",
    description: "Tiny uppercase text in the spine, margin strips, footer nav, and date pills.",
    settingKey: "fontLabel",
    preview: "MORNING · FIRST QUARTER",
    previewSub: "Wed 25 Feb · 🪙 420 pts",
  },
];

export const CHAPTERS = [
  { id: "morning",  name: "Morning"  },
  { id: "plan",     name: "Plan"     },
  { id: "tasks",    name: "Tasks"    },
  { id: "add",      name: "Add"      },
  { id: "rewards",  name: "Rewards"  },
  { id: "calendar", name: "Calendar" },
  { id: "daybook",  name: "Daybook"  },
  { id: "poetry",   name: "Poetry"   },
  { id: "bindery",  name: "Bindery"  },
];

export const SPINE_MAP  = { slim: 28, normal: 38, thick: 52 };
export const MARGIN_MAP = {
  compact:  { top: 12, bottom: 12, side: 12 },
  normal:   { top: 20, bottom: 20, side: 20 },
  generous: { top: 30, bottom: 30, side: 28 },
};

// ─── DEFAULT SETTINGS ─────────────────────────────────────────────────────────

export const DEFAULT_BINDERY = {
  clothColour:     "oxford-navy",
  spineWidth:      "normal",
  marginSize:      "normal",
  // Background (the "desk" behind the book)
  bgTexture:       "linen",
  bgColour:        "#c8b89a",
  // Gutter (centre shadow between pages)
  gutterSize:      "normal",
  // Typography
  fontHeader:      "syne",
  fontBody:        "georgia",
  fontLabel:       "jetbrains",
  // Page global defaults (applied when sections have no override)
  globalPageColour:   "ivory",
  globalPagePattern:  "ruled",
  // Section-level overrides: { [sectionId]: { pageColour, pagePattern, icon, title, allowFillers } }
  sections:        {},
};

export function loadBindery() {
  try {
    return { ...DEFAULT_BINDERY, ...JSON.parse(localStorage.getItem("bindery_v2")) };
  } catch { return { ...DEFAULT_BINDERY }; }
}

export function saveBindery(settings) {
  localStorage.setItem("bindery_v2", JSON.stringify(settings));
}

// ─── PAGE TEXTURE CSS ─────────────────────────────────────────────────────────
// Returns an object of inline style properties (not a CSS string)
// so it can be spread directly onto a style prop.

export function getPageStyle(textureId, pageColourHex) {
  const bg = pageColourHex || "#faf8f2";
  const line = "rgba(100,120,160,0.12)";
  const dot  = "rgba(100,120,160,0.18)";

  const base = { backgroundColor: bg, position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" };

  switch (textureId) {
    case "ruled":
      return {
        ...base,
        backgroundImage: `repeating-linear-gradient(transparent, transparent 23px, ${line} 23px, ${line} 24px)`,
        backgroundSize: "100% 24px",
      };
    case "dots": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='0.9' fill='${dot}'/></svg>`;
      return { ...base, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundSize: "24px 24px" };
    }
    case "grid": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M 24 0 L 0 0 0 24' fill='none' stroke='${line}' stroke-width='0.5'/></svg>`;
      return { ...base, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundSize: "24px 24px" };
    }
    case "graph": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='${line}' stroke-width='0.75'/></svg>`;
      return { ...base, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundSize: "20px 20px" };
    }
    default:
      return base;
  }
}

// ─── SECTION CONFIG RESOLVER ──────────────────────────────────────────────────
// Priority: section override > global setting > SECTION_DEFAULTS
// This means the Pages tab "global" controls work correctly even after a section
// has been visited — the section override only applies when explicitly set.

export function resolveSectionConfig(sectionId, savedSections = {}, globalSettings = {}) {
  const defaults = SECTION_DEFAULTS[sectionId] ?? SECTION_DEFAULTS.morning;
  // Global overrides replace the built-in defaults, but section-specific wins over both
  const globals  = {
    ...(globalSettings.globalPageColour  ? { pageColour:  globalSettings.globalPageColour  } : {}),
    ...(globalSettings.globalPagePattern ? { pagePattern: globalSettings.globalPagePattern } : {}),
  };
  const override = savedSections[sectionId] ?? {};
  return { ...defaults, ...globals, ...override };
}

// ─── BINDERY COMPONENT ────────────────────────────────────────────────────────

export default function Bindery({ settings, onChange }) {
  const [tab, setTab] = useState("cloth");
  const [editingSection, setEditingSection] = useState(null);

  const set = (key, val) => onChange({ ...settings, [key]: val });
  const clothHex = CLOTH_COLOURS.find(c => c.id === settings.clothColour)?.hex || "#1a2744";

  // ── Google Fonts loader ─────────────────────────────────────────────────────
  // Injects a single <link> into <head> for all fonts used by current settings.
  // Re-runs when font settings change so new fonts load immediately.
  useEffect(() => {
    const fontsNeeded = [settings.fontHeader, settings.fontBody, settings.fontLabel]
      .filter(Boolean)
      .map(id => BOOK_FONTS.find(f => f.id === id))
      .filter(Boolean);

    if (!fontsNeeded.length) return;

    const families = fontsNeeded.map(f => f.google).join("&family=");
    const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

    // Avoid duplicate links
    const existing = document.querySelector(`link[data-book-fonts]`);
    if (existing?.href === href) return;
    if (existing) existing.remove();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-book-fonts", "true");
    document.head.appendChild(link);
  }, [settings.fontHeader, settings.fontBody, settings.fontLabel]);

  // ── Font CSS variables ──────────────────────────────────────────────────────
  // Apply chosen fonts as CSS custom properties on :root so every component
  // using var(--font-header), var(--font-body), var(--font-label) updates live.
  useEffect(() => {
    const root = document.documentElement;
    const header = BOOK_FONTS.find(f => f.id === settings.fontHeader);
    const body   = BOOK_FONTS.find(f => f.id === settings.fontBody);
    const label  = BOOK_FONTS.find(f => f.id === settings.fontLabel);
    if (header) root.style.setProperty("--font-header", header.family);
    if (body)   root.style.setProperty("--font-body",   body.family);
    if (label)  root.style.setProperty("--font-label",  label.family);
  }, [settings.fontHeader, settings.fontBody, settings.fontLabel]);

  // Section config helpers
  const getSectionVal = (sectionId, key) => {
    const saved = settings.sections?.[sectionId]?.[key];
    return saved !== undefined ? saved : SECTION_DEFAULTS[sectionId]?.[key];
  };
  const setSectionVal = (sectionId, key, val) => {
    const next = {
      ...settings,
      sections: {
        ...settings.sections,
        [sectionId]: { ...(settings.sections?.[sectionId] || {}), [key]: val },
      },
    };
    onChange(next);
  };

  const tabs = [
    ["cloth",      "Cover"],
    ["pages",      "Pages"],
    ["background", "Desk"],
    ["sections",   "Sections"],
  ];

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 4 }}>Bindery</div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Physical appearance of your commonplace book.
      </p>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "6px 4px", fontSize: 10, fontWeight: 700,
            fontFamily: "var(--font-header)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            background: tab === id ? "var(--acid)" : "var(--surface2)",
            color: tab === id ? "var(--on-accent)" : "var(--muted)",
            letterSpacing: "0.5px", textTransform: "uppercase",
          }}>{label}</button>
        ))}
      </div>

      {/* ── COVER ── */}
      {tab === "cloth" && (
        <div>
          {/* Mini book preview */}
          <div style={{
            display: "flex", height: 70, borderRadius: 4, overflow: "hidden",
            marginBottom: 18, boxShadow: "0 4px 18px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              width: SPINE_MAP[settings.spineWidth],
              background: `linear-gradient(to right, ${clothHex}cc, ${clothHex})`,
              backgroundImage: "repeating-linear-gradient(135deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)",
              borderRight: "2px solid rgba(0,0,0,0.25)", flexShrink: 0,
            }} />
            <div style={{ flex: 1, backgroundColor: PAGE_COLOURS.find(p => p.id === (settings.sections?.morning?.pageColour || "ivory"))?.hex || "#faf8f2" }} />
            <div style={{ flex: 1, backgroundColor: PAGE_COLOURS.find(p => p.id === (settings.sections?.morning?.pageColour || "ivory"))?.hex || "#faf8f2",
              borderLeft: "1px solid rgba(0,0,0,0.06)" }} />
          </div>

          <div className="bd-label">Cloth colour</div>
          <div className="bd-swatches">
            {CLOTH_COLOURS.map(c => (
              <button key={c.id} title={c.name} onClick={() => set("clothColour", c.id)} style={{
                width: 32, height: 32, borderRadius: 4, background: c.hex,
                border: "none", cursor: "pointer",
                backgroundImage: "repeating-linear-gradient(135deg,transparent,transparent 2px,rgba(255,255,255,0.06) 2px,rgba(255,255,255,0.06) 4px)",
                boxShadow: settings.clothColour === c.id ? "0 0 0 3px var(--acid)" : "0 0 0 1px rgba(255,255,255,0.1)",
                transform: settings.clothColour === c.id ? "scale(1.12)" : "scale(1)",
                transition: "all .15s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 5, marginBottom: 16 }}>
            {CLOTH_COLOURS.find(c => c.id === settings.clothColour)?.name}
          </div>

          <div className="bd-label">Spine width</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["slim","normal","thick"].map(v => (
              <button key={v} onClick={() => set("spineWidth", v)} style={{
                flex: 1, padding: "7px 4px", fontSize: 11, fontWeight: 700,
                fontFamily: "var(--font-header)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", cursor: "pointer", textTransform: "capitalize",
                background: settings.spineWidth === v ? "var(--acid)" : "var(--surface2)",
                color: settings.spineWidth === v ? "var(--on-accent)" : "var(--muted)",
              }}>{v}</button>
            ))}
          </div>

          <div className="bd-label">Content margins</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["compact","normal","generous"].map(v => (
              <button key={v} onClick={() => set("marginSize", v)} style={{
                flex: 1, padding: "7px 4px", fontSize: 11, fontWeight: 700,
                fontFamily: "var(--font-header)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", cursor: "pointer", textTransform: "capitalize",
                background: settings.marginSize === v ? "var(--acid)" : "var(--surface2)",
                color: settings.marginSize === v ? "var(--on-accent)" : "var(--muted)",
              }}>{v}</button>
            ))}
          </div>

        </div>
      )}

      {/* ── PAGES ── */}
      {tab === "pages" && (
        <div>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            Global defaults — applied to all sections that haven't been customised in the Sections tab.
          </p>

          {/* Global page colour — stored as globalPageColour, not written into sections */}
          <div className="bd-label">Default page colour</div>
          <div className="bd-swatches" style={{ marginBottom: 14 }}>
            {PAGE_COLOURS.map(p => (
              <button key={p.id} title={p.name}
                onClick={() => set("globalPageColour", p.id)}
                style={{
                  width: 32, height: 32, borderRadius: 4, background: p.hex,
                  border: "none", cursor: "pointer", transition: "all .15s",
                  boxShadow: settings.globalPageColour === p.id
                    ? "0 0 0 3px var(--acid)"
                    : "0 0 0 1px rgba(0,0,0,0.12)",
                  transform: settings.globalPageColour === p.id ? "scale(1.12)" : "scale(1)",
                }} />
            ))}
          </div>

          {/* Global texture */}
          <div className="bd-label">Default texture</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {PAGE_TEXTURES.map(t => (
              <button key={t.id} onClick={() => set("globalPagePattern", t.id)} style={{
                padding: "6px 12px", fontSize: 11, fontWeight: 700,
                fontFamily: "var(--font-header)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", cursor: "pointer",
                display: "flex", gap: 5, alignItems: "center",
                background: settings.globalPagePattern === t.id ? "var(--acid)" : "var(--surface2)",
                color: settings.globalPagePattern === t.id ? "var(--on-accent)" : "var(--muted)",
              }}>
                <span style={{ fontSize: 13 }}>{t.icon}</span> {t.name}
              </button>
            ))}
          </div>

          {/* ── TYPOGRAPHY ── */}
          <div className="bd-label" style={{ marginTop: 4 }}>Typography</div>
          <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
            All 16 fonts are available for each role. Fonts load from Google Fonts — changes apply immediately.
          </p>

          {FONT_ROLES.map(role => {
            // Build grouped <optgroup> structure: group name → fonts
            const groups = {};
            BOOK_FONTS.forEach(f => {
              if (!groups[f.group]) groups[f.group] = [];
              groups[f.group].push(f);
            });
            const selectedFont = BOOK_FONTS.find(f => f.id === settings[role.settingKey]);

            return (
              <div key={role.id} style={{ marginBottom: 20 }}>
                {/* Role label + description */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {role.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>
                  {role.description}
                </div>

                {/* Dropdown — options grouped by font character */}
                <select
                  value={settings[role.settingKey] || ""}
                  onChange={e => set(role.settingKey, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text)",
                    fontSize: 13,
                    // Render the dropdown trigger itself in the selected font
                    fontFamily: selectedFont?.family || "inherit",
                    cursor: "pointer",
                    outline: "none",
                    appearance: "auto", // native dropdown arrow — reliable cross-platform
                  }}
                >
                  {Object.entries(groups).map(([groupName, fonts]) => (
                    <optgroup key={groupName} label={groupName}>
                      {fonts.map(font => (
                        <option
                          key={font.id}
                          value={font.id}
                          // Note: browsers don't apply fontFamily to <option> elements —
                          // the preview div below is how the user sees the actual rendering.
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Live preview — renders the selected font at two sizes */}
                {selectedFont && (
                  <div style={{
                    marginTop: 8,
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: selectedFont.family,
                  }}>
                    <div style={{
                      fontSize: role.id === "label" ? 9 : 14,
                      color: "var(--text)",
                      letterSpacing: role.id === "label" ? "2px" : "normal",
                      textTransform: role.id === "label" ? "uppercase" : "none",
                      lineHeight: 1.5,
                      marginBottom: role.previewSub ? 4 : 0,
                    }}>
                      {role.preview}
                    </div>
                    {role.previewSub && (
                      <div style={{
                        fontSize: role.id === "label" ? 8 : 11,
                        color: "var(--muted)",
                        letterSpacing: role.id === "label" ? "1.5px" : "0.2px",
                        textTransform: role.id === "label" ? "uppercase" : "none",
                        lineHeight: 1.4,
                      }}>
                        {role.previewSub}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── BACKGROUND / DESK ── */}
      {tab === "background" && (
        <div>
          <div className="bd-label">Surface texture</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {BACKGROUND_TEXTURES.map(t => (
              <button key={t.id} onClick={() => set("bgTexture", t.id)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", cursor: "pointer",
                background: settings.bgTexture === t.id ? "rgba(212,240,58,0.06)" : "var(--surface2)",
                borderColor: settings.bgTexture === t.id ? "var(--acid)" : "var(--border)",
              }}>
                {t.preview && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    background: t.preview,
                  }} />
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{t.name}</div>
                </div>
                {settings.bgTexture === t.id && (
                  <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--acid)" }}>✓</div>
                )}
              </button>
            ))}
          </div>

          <div className="bd-label">Background colour</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="color" value={settings.bgColour || "#c8b89a"}
              onChange={e => set("bgColour", e.target.value)}
              style={{ width: 44, height: 36, border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", background: "none", padding: 2 }}
            />
            <input type="text" value={settings.bgColour || "#c8b89a"}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set("bgColour", e.target.value); }}
              style={{
                width: 90, background: "var(--surface2)", border: "1px solid var(--border)",
                color: "var(--text)", padding: "6px 10px", borderRadius: "var(--radius-sm)",
                fontFamily: "JetBrains Mono, monospace", fontSize: 12, outline: "none",
              }}
            />
          </div>

          {/* Live preview */}
          <div style={{
            marginTop: 16, height: 60, borderRadius: 6,
            ...Object.fromEntries(
              getBackgroundCss(settings.bgTexture, settings.bgColour)
                .split(";").filter(s => s.trim())
                .map(s => {
                  const i = s.indexOf(":");
                  const k = s.slice(0, i).trim().replace(/-([a-z])/g, (_, l) => l.toUpperCase());
                  return [k, s.slice(i + 1).trim()];
                })
            ),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 80, height: 44, background: PAGE_COLOURS.find(p => p.id === "ivory")?.hex || "#faf8f2",
              borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.25), -3px 0 8px rgba(0,0,0,0.2)",
              display: "flex",
            }}>
              <div style={{ width: 10, background: clothHex, borderRadius: "2px 0 0 2px",
                backgroundImage: "repeating-linear-gradient(135deg,transparent,transparent 1px,rgba(255,255,255,0.05) 1px,rgba(255,255,255,0.05) 2px)" }} />
              <div style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTIONS ── */}
      {tab === "sections" && (
        <div>
          {editingSection ? (
            <SectionEditor
              section={editingSection}
              values={{
                pageColour:   getSectionVal(editingSection, "pageColour"),
                pagePattern:  getSectionVal(editingSection, "pagePattern"),
                icon:         getSectionVal(editingSection, "icon"),
                title:        getSectionVal(editingSection, "title"),
                allowFillers: getSectionVal(editingSection, "allowFillers"),
              }}
              onChange={(key, val) => setSectionVal(editingSection, key, val)}
              onBack={() => setEditingSection(null)}
              onReset={() => {
                const next = { ...settings, sections: { ...settings.sections } };
                delete next.sections[editingSection];
                onChange(next);
                setEditingSection(null);
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CHAPTERS.map(ch => {
                const colour = getSectionVal(ch.id, "pageColour");
                const pattern = getSectionVal(ch.id, "pagePattern");
                const icon = getSectionVal(ch.id, "icon");
                const hex = PAGE_COLOURS.find(p => p.id === colour)?.hex || "#faf8f2";
                const hasOverride = !!settings.sections?.[ch.id];
                return (
                  <button key={ch.id} onClick={() => setEditingSection(ch.id)} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)", cursor: "pointer",
                    background: "var(--surface)", textAlign: "left",
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--acid)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 3, background: hex, flexShrink: 0,
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.1)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 11 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{ch.name}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                        {colour} · {pattern}
                      </div>
                    </div>
                    {hasOverride && <div style={{ fontSize: 9, color: "var(--teal)", border: "1px solid rgba(61,232,190,.3)", borderRadius: 3, padding: "2px 6px" }}>custom</div>}
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>›</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        .bd-label { font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); margin: 0 0 8px; }
        .bd-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}

// ─── SECTION EDITOR ───────────────────────────────────────────────────────────

function SectionEditor({ section, values, onChange, onBack, onReset }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
          padding: "5px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font-header)", fontWeight: 700,
        }}>← Back</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1, textTransform: "capitalize" }}>{section}</div>
        <button onClick={onReset} style={{
          background: "none", border: "1px solid rgba(255,86,86,.3)", borderRadius: "var(--radius-sm)",
          padding: "5px 10px", fontSize: 10, color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-header)", fontWeight: 700,
        }}>Reset to default</button>
      </div>

      <div className="bd-label">Section title</div>
      <input value={values.title || ""} onChange={e => onChange("title", e.target.value)}
        style={{
          width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
          color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-header)", fontSize: 13, outline: "none", marginBottom: 14,
        }} />

      <div className="bd-label">Section icon</div>
      <input value={values.icon || ""} onChange={e => onChange("icon", e.target.value)}
        style={{
          width: 60, background: "var(--surface2)", border: "1px solid var(--border)",
          color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-header)", fontSize: 18, outline: "none", marginBottom: 14, textAlign: "center",
        }} />

      <div className="bd-label">Page colour</div>
      <div className="bd-swatches" style={{ marginBottom: 14 }}>
        {PAGE_COLOURS.map(p => (
          <button key={p.id} title={p.name} onClick={() => onChange("pageColour", p.id)} style={{
            width: 28, height: 28, borderRadius: 4, background: p.hex, border: "none", cursor: "pointer",
            boxShadow: values.pageColour === p.id ? "0 0 0 3px var(--acid)" : "0 0 0 1px rgba(0,0,0,0.12)",
            transform: values.pageColour === p.id ? "scale(1.12)" : "scale(1)", transition: "all .15s",
          }} />
        ))}
      </div>

      <div className="bd-label">Page texture</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {PAGE_TEXTURES.map(t => (
          <button key={t.id} onClick={() => onChange("pagePattern", t.id)} style={{
            padding: "5px 10px", fontSize: 11, fontWeight: 700,
            fontFamily: "var(--font-header)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            background: values.pagePattern === t.id ? "var(--acid)" : "var(--surface2)",
            color: values.pagePattern === t.id ? "var(--on-accent)" : "var(--muted)",
          }}>
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      <div className="bd-label">Filler images</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
        <input type="checkbox" checked={!!values.allowFillers}
          onChange={e => onChange("allowFillers", e.target.checked)}
          style={{ width: 14, height: 14, accentColor: "var(--acid)", cursor: "pointer" }} />
        Allow filler images in this section
      </label>
    </div>
  );
}
