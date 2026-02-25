import { useState } from "react";
import {
  DEFAULT_THEMES,
  FONT_PAIRS,
  RADIUS_OPTIONS,
  applyTheme,
  saveActiveThemeId,
  saveCustomThemes,
  saveHiddenThemes,
} from "../lib/themes.jsx";

// ─── BLANK CUSTOM THEME TEMPLATE ─────────────────────────────────────────────
// Used when the user clicks "New Theme". Pre-filled with sensible defaults
// so they have something to start editing rather than a blank slate.

function blankCustomTheme() {
  return {
    id: `custom-${Date.now()}`,
    name: "My Theme",
    dark: true,
    builtIn: false,
    colors: {
      bg:      "#111111",
      surface: "#1c1c1c",
      surface2:"#252525",
      surface3:"#2e2e2e",
      border:  "#333333",
      border2: "#444444",
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
  };
}

// ─── COLOR FIELD ─────────────────────────────────────────────────────────────
// One row in the custom theme editor: a label, a native colour picker,
// and a hex text input. Both stay in sync with each other.
// The native <input type="color"> gives us the colour palette UI.
// The text input gives us hex precision. Together they satisfy both requirements.

function ColorField({ label, value, onChange }) {
  return (
    <div className="ts-color-row">
      <span className="ts-color-label">{label}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="ts-color-swatch"
        title={label}
      />
      <input
        type="text"
        value={value}
        onChange={e => {
          // Only update when it looks like a valid hex code
          if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value);
        }}
        className="ts-hex-input"
        spellCheck={false}
        maxLength={7}
      />
    </div>
  );
}

// ─── THEME EDITOR ─────────────────────────────────────────────────────────────
// Full editor panel for a custom theme. Shown inline below the theme card
// when the user clicks Edit or New Theme.

function ThemeEditor({ theme, onSave, onCancel, onDelete }) {
  const [t, setT] = useState({ ...theme, colors: { ...theme.colors }, fonts: { ...theme.fonts } });

  const setColor = (key, val) => setT(p => ({ ...p, colors: { ...p.colors, [key]: val } }));
  const setFont  = (key, val) => setT(p => ({ ...p, fonts:  { ...p.fonts,  [key]: val } }));

  // Live preview — apply the theme as the user edits it
  // We call applyTheme on every change so they see instant feedback
  const preview = (updated) => {
    setT(updated);
    applyTheme(updated);
  };

  // Group colors into logical sections so the editor isn't one long undifferentiated list
  const colorGroups = [
    {
      label: "Backgrounds",
      keys: [
        { key: "bg",       label: "Page background" },
        { key: "surface",  label: "Card / panel" },
        { key: "surface2", label: "Input / inner surface" },
        { key: "surface3", label: "Deepest surface" },
      ]
    },
    {
      label: "Borders",
      keys: [
        { key: "border",  label: "Default border" },
        { key: "border2", label: "Stronger border" },
      ]
    },
    {
      label: "Accent colours",
      keys: [
        { key: "acid",  label: "Primary accent" },
        { key: "acid2", label: "Primary accent light" },
        { key: "teal",  label: "Secondary accent" },
        { key: "teal2", label: "Secondary accent light" },
        { key: "gold",  label: "Points / rewards" },
        { key: "gold2", label: "Points light" },
      ]
    },
    {
      label: "Status",
      keys: [
        { key: "red",  label: "Error / danger" },
        { key: "warn", label: "Warning" },
      ]
    },
    {
      label: "Text",
      keys: [
        { key: "text",  label: "Primary text" },
        { key: "text2", label: "Secondary text" },
        { key: "muted", label: "Muted / labels" },
      ]
    },
  ];

  return (
    <div className="ts-editor">
      {/* Name + dark mode toggle */}
      <div className="ts-editor-header">
        <input
          className="ts-name-input"
          value={t.name}
          onChange={e => preview({ ...t, name: e.target.value })}
          placeholder="Theme name"
        />
        <label className="ts-dark-toggle">
          <input
            type="checkbox"
            checked={t.dark}
            onChange={e => preview({ ...t, dark: e.target.checked })}
          />
          <span>Dark mode</span>
        </label>
      </div>

      {/* Font pair selector */}
      <div className="ts-section-label">Fonts</div>
      <div className="ts-font-grid">
        {FONT_PAIRS.map(pair => {
          const active = t.fonts.header === pair.header && t.fonts.body === pair.body;
          return (
            <button
              key={pair.label}
              className={`ts-font-btn ${active ? "active" : ""}`}
              onClick={() => preview({ ...t, fonts: { header: pair.header, body: pair.body } })}
            >
              <span className="ts-font-name">{pair.header}</span>
              <span className="ts-font-sub">{pair.body}</span>
            </button>
          );
        })}
      </div>

      {/* Border radius */}
      <div className="ts-section-label">Corners</div>
      <div className="ts-radius-row">
        {RADIUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`ts-radius-btn ${t.radius === opt.value ? "active" : ""}`}
            onClick={() => preview({ ...t, radius: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Color groups */}
      {colorGroups.map(group => (
        <div key={group.label}>
          <div className="ts-section-label">{group.label}</div>
          <div className="ts-color-group">
            {group.keys.map(({ key, label }) => (
              <ColorField
                key={key}
                label={label}
                value={t.colors[key]}
                onChange={val => preview({ ...t, colors: { ...t.colors, [key]: val } })}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="ts-editor-actions">
        <button className="ts-save-btn" onClick={() => onSave(t)}>Save Theme</button>
        {onDelete && (
          <button className="ts-delete-btn" onClick={onDelete}>Delete</button>
        )}
        <button className="ts-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── MAIN THEME SETTINGS COMPONENT ───────────────────────────────────────────

export default function ThemeSettings({ activeThemeId, customThemes, hiddenThemes, onThemeChange, onCustomThemesChange, onHiddenChange }) {
  const [editing, setEditing]         = useState(null);   // theme being edited (or "new")
  const [showHidden, setShowHidden]   = useState(false);  // toggle to reveal hidden defaults

  const allThemes = [...DEFAULT_THEMES, ...customThemes];
  const visibleDefaults = DEFAULT_THEMES.filter(t => showHidden || !hiddenThemes.includes(t.id));

  function activateTheme(theme) {
    applyTheme(theme);
    saveActiveThemeId(theme.id);
    onThemeChange(theme.id);
  }

  function saveCustom(updated) {
    const exists = customThemes.find(t => t.id === updated.id);
    const next = exists
      ? customThemes.map(t => t.id === updated.id ? updated : t)
      : [...customThemes, updated];
    saveCustomThemes(next);
    onCustomThemesChange(next);
    // Activate the theme we just saved
    activateTheme(updated);
    setEditing(null);
  }

  function deleteCustom(id) {
    const next = customThemes.filter(t => t.id !== id);
    saveCustomThemes(next);
    onCustomThemesChange(next);
    // Fall back to terminal-green if we deleted the active theme
    if (activeThemeId === id) {
      const fallback = DEFAULT_THEMES[0];
      activateTheme(fallback);
    }
    setEditing(null);
  }

  function toggleHidden(id) {
    const next = hiddenThemes.includes(id)
      ? hiddenThemes.filter(x => x !== id)
      : [...hiddenThemes, id];
    saveHiddenThemes(next);
    onHiddenChange(next);
    // If we just hid the active theme, switch to first visible default
    if (next.includes(activeThemeId)) {
      const fallback = DEFAULT_THEMES.find(t => !next.includes(t.id)) || DEFAULT_THEMES[0];
      activateTheme(fallback);
    }
  }

  // When editing is cancelled we need to re-apply the currently active theme
  // to undo the live preview changes
  function cancelEdit() {
    const current = allThemes.find(t => t.id === activeThemeId) || DEFAULT_THEMES[0];
    applyTheme(current);
    setEditing(null);
  }

  return (
    <div>
      <div className="section-title">Appearance</div>

      {/* ── DEFAULT THEMES ── */}
      <div className="ts-group-label">
        Built-in themes
        <button
          className="ts-subtle-btn"
          onClick={() => setShowHidden(v => !v)}
        >
          {showHidden ? "Hide hidden" : `Show hidden (${hiddenThemes.length})`}
        </button>
      </div>

      <div className="ts-theme-grid">
        {visibleDefaults.map(theme => {
          const isActive  = activeThemeId === theme.id;
          const isHidden  = hiddenThemes.includes(theme.id);
          const isEditing = editing === theme.id;
          return (
            <div key={theme.id}>
              <div
                className={`ts-theme-card ${isActive ? "active" : ""} ${isHidden ? "hidden-theme" : ""}`}
                style={{ background: theme.colors.bg, borderColor: isActive ? theme.colors.acid : theme.colors.border }}
                onClick={() => !isEditing && activateTheme(theme)}
              >
                {/* Mini colour swatches */}
                <div className="ts-swatches">
                  {[theme.colors.bg, theme.colors.surface, theme.colors.acid, theme.colors.teal, theme.colors.gold].map((c, i) => (
                    <div key={i} className="ts-swatch" style={{ background: c }} />
                  ))}
                </div>
                <div className="ts-theme-name" style={{ color: theme.colors.text, fontFamily: `'${theme.fonts.header}', sans-serif` }}>
                  {theme.name}
                </div>
                <div className="ts-theme-meta" style={{ color: theme.colors.muted }}>
                  {theme.dark ? "Dark" : "Light"} · {theme.radius}
                </div>
                {/* Hide / show toggle */}
                <button
                  className="ts-hide-btn"
                  style={{ color: theme.colors.muted }}
                  onClick={e => { e.stopPropagation(); toggleHidden(theme.id); }}
                  title={isHidden ? "Unhide" : "Hide"}
                >
                  {isHidden ? "Show" : "Hide"}
                </button>
                {isActive && <div className="ts-active-dot" style={{ background: theme.colors.acid }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CUSTOM THEMES ── */}
      <div className="ts-group-label" style={{ marginTop: 20 }}>
        Custom themes
        <button className="ts-subtle-btn" onClick={() => setEditing("new")}>+ New theme</button>
      </div>

      {customThemes.length === 0 && editing !== "new" && (
        <div className="ts-empty">No custom themes yet. Click "+ New theme" to create one.</div>
      )}

      {/* New theme editor */}
      {editing === "new" && (
        <ThemeEditor
          theme={blankCustomTheme()}
          onSave={saveCustom}
          onCancel={cancelEdit}
        />
      )}

      {/* Existing custom themes */}
      <div className="ts-theme-grid">
        {customThemes.map(theme => {
          const isActive  = activeThemeId === theme.id;
          const isEditing = editing === theme.id;
          return (
            <div key={theme.id}>
              <div
                className={`ts-theme-card ${isActive ? "active" : ""}`}
                style={{ background: theme.colors.bg, borderColor: isActive ? theme.colors.acid : theme.colors.border }}
                onClick={() => !isEditing && activateTheme(theme)}
              >
                <div className="ts-swatches">
                  {[theme.colors.bg, theme.colors.surface, theme.colors.acid, theme.colors.teal, theme.colors.gold].map((c, i) => (
                    <div key={i} className="ts-swatch" style={{ background: c }} />
                  ))}
                </div>
                <div className="ts-theme-name" style={{ color: theme.colors.text }}>
                  {theme.name}
                </div>
                <div className="ts-theme-meta" style={{ color: theme.colors.muted }}>
                  {theme.dark ? "Dark" : "Light"} · {theme.radius}
                </div>
                <button
                  className="ts-hide-btn"
                  style={{ color: theme.colors.muted }}
                  onClick={e => { e.stopPropagation(); setEditing(isEditing ? null : theme.id); }}
                >
                  {isEditing ? "Close" : "Edit"}
                </button>
                {isActive && <div className="ts-active-dot" style={{ background: theme.colors.acid }} />}
              </div>
              {isEditing && (
                <ThemeEditor
                  theme={theme}
                  onSave={saveCustom}
                  onCancel={cancelEdit}
                  onDelete={() => deleteCustom(theme.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
