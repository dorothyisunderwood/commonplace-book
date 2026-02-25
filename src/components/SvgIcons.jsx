// ─── SVG ICONS ────────────────────────────────────────────────────────────────
// All icons are inline SVG — no external dependencies, no font files.
// Each returns an <svg> element sized to 1em × 1em by default.
// Props: size (px number), color (CSS string), strokeWidth (number)
// ─────────────────────────────────────────────────────────────────────────────

const defaults = { size: 20, color: "currentColor", strokeWidth: 1.5 };

function Icon({ size, color, strokeWidth, children, viewBox = "0 0 24 24" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export function IconSun({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </Icon>
  );
}

export function IconMoon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  );
}

export function IconMorning({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Sunrise over horizon
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M12 2v4M4.93 7.93l2.83 2.83M2 15h4M18 10.76l2.83-2.83M22 15h-4" />
      <path d="M5 19a7 7 0 0 1 14 0" />
      <line x1="3" y1="19" x2="21" y2="19" />
    </Icon>
  );
}

export function IconPlan({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Clipboard with checklist
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
      <polyline points="9 8 10.5 9.5 13 7" />
    </Icon>
  );
}

export function IconTasks({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Checkbox list
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="3" y="5" width="4" height="4" rx="0.5" />
      <polyline points="4 7 5 8 7 6" />
      <line x1="9" y1="7" x2="21" y2="7" />
      <rect x="3" y="13" width="4" height="4" rx="0.5" />
      <line x1="9" y1="15" x2="21" y2="15" />
      <rect x="3" y="19" width="4" height="4" rx="0.5" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </Icon>
  );
}

export function IconAdd({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Plus in a circle
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </Icon>
  );
}

export function IconRewards({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Star
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Icon>
  );
}

export function IconCalendar({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <rect x="8" y="14" width="2" height="2" fill={color} stroke="none" />
      <rect x="13" y="14" width="2" height="2" fill={color} stroke="none" />
    </Icon>
  );
}

export function IconPoetry({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Quill pen — feather tip writing
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </Icon>
  );
}

export function IconDaybook({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Open book
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Icon>
  );
}

export function IconLists({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Stacked horizontal lines (themed lists)
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="15" y2="18" />
      <circle cx="19" cy="18" r="2" />
    </Icon>
  );
}

export function IconBindery({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  // Book with paint brush / settings feel
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="12" y1="7" x2="16" y2="7" />
      <line x1="12" y1="11" x2="16" y2="11" />
      <circle cx="9" cy="9" r="1.5" fill={color} stroke="none" />
    </Icon>
  );
}

export function IconSettings({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  );
}

// Moon phase icons — rendered as filled SVG arcs
// phase: 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
export function IconMoonPhase({ phase = 0, size = 18, color = "#8a8070" }) {
  // Draw the illuminated portion using two arcs
  // Left half: dark or light depending on phase
  // Right half: dark or light depending on phase
  const r = 8;
  const cx = 10;
  const cy = 10;

  // illumination fraction 0..1 mapped to visual arc
  // We'll use a simplified approach: ellipse width varies
  const illumination = Math.sin(phase * Math.PI); // 0 at new/full edges, 1 at quarters
  const waxing = phase < 0.5;

  // Outer circle always drawn
  // Inner ellipse represents the shadow terminator
  const ellipseRx = Math.abs(Math.cos(phase * 2 * Math.PI)) * r;

  let darkLeft, darkRight;
  if (phase < 0.5) {
    // Waxing: right side lit
    darkLeft = true;
    darkRight = false;
  } else {
    // Waning: left side lit
    darkLeft = false;
    darkRight = true;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "inline-block", verticalAlign: "middle" }}>
      {/* Full circle background (dark) */}
      <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.25" />
      {/* Illuminated half */}
      <clipPath id={`mp-right-${phase}`}>
        <rect x={cx} y={cy - r} width={r} height={r * 2} />
      </clipPath>
      <clipPath id={`mp-left-${phase}`}>
        <rect x={cx - r} y={cy - r} width={r} height={r * 2} />
      </clipPath>
      {phase >= 0.5 && (
        <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.85" clipPath={`url(#mp-left-${phase})`} />
      )}
      {phase < 0.5 && (
        <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.85" clipPath={`url(#mp-right-${phase})`} />
      )}
      {/* Terminator ellipse */}
      <ellipse cx={cx} cy={cy} rx={ellipseRx} ry={r}
        fill={phase < 0.5 ? color : "transparent"}
        opacity={phase < 0.5 ? "0.85" : "0"}
        stroke="none"
      />
      {/* Outline */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

// Bookmark ribbon shape
export function IconBookmark({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </Icon>
  );
}

// Index card corner (for the stub)
export function IconIndexCard({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="2" y="6" width="20" height="14" rx="1" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="7" y1="13" x2="17" y2="13" />
      <line x1="7" y1="16" x2="14" y2="16" />
    </Icon>
  );
}

// Polaroid camera icon (for the stub)
export function IconPolaroid({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="2" y="4" width="20" height="18" rx="1" />
      <rect x="5" y="7" width="14" height="10" rx="0.5" />
      <circle cx="12" cy="12" r="3" />
      <line x1="8" y1="19" x2="16" y2="19" />
    </Icon>
  );
}

// Weather icons
export function IconCloud({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }) {
  return (
    <Icon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </Icon>
  );
}

export function IconSunSmall({ size = 14, color = "#8a7a50" }) {
  return <IconSun size={size} color={color} strokeWidth={1.2} />;
}

// ─── PAPERCLIP + DAISY ────────────────────────────────────────────────────────
// A paperclip with a small daisy flower at the top.
// This is the interactive element that opens the sticker picker.
// Designed to look like it's physically clipped to the page edge.

export function IconPaperclipDaisy({ size = 48 }) {
  return (
    <svg width={size} height={size * 2.2} viewBox="0 0 24 52" fill="none"
      style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>

      {/* Daisy petals — small flower at top */}
      <g transform="translate(12, 7)">
        {/* 6 petals radiating from centre */}
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <ellipse key={angle}
            cx={Math.cos((angle - 90) * Math.PI / 180) * 3.5}
            cy={Math.sin((angle - 90) * Math.PI / 180) * 3.5}
            rx="1.8" ry="2.8"
            transform={`rotate(${angle}, ${Math.cos((angle - 90) * Math.PI / 180) * 3.5}, ${Math.sin((angle - 90) * Math.PI / 180) * 3.5})`}
            fill="white"
            stroke="rgba(200,180,120,0.6)"
            strokeWidth="0.3"
          />
        ))}
        {/* Centre disc */}
        <circle cx="0" cy="0" r="2.2" fill="#e8c840" />
        <circle cx="0" cy="0" r="1.4" fill="#d4a820" />
        {/* Centre texture dots */}
        <circle cx="-0.5" cy="-0.5" r="0.3" fill="#b89018" />
        <circle cx="0.5" cy="0.3" r="0.3" fill="#b89018" />
        <circle cx="0" cy="0.7" r="0.25" fill="#b89018" />
      </g>

      {/* Paperclip body — classic double-loop shape */}
      {/* Outer loop */}
      <path
        d="M 10 15 L 10 38 Q 10 42 14 42 Q 18 42 18 38 L 18 18 Q 18 14 14 14 Q 10 14 10 18 L 10 36 Q 10 39 13 39 Q 16 39 16 36 L 16 20"
        stroke="#8a8a9a"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
