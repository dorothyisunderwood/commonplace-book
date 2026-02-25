// ─── MOON PHASE ───────────────────────────────────────────────────────────────
// Calculates the current lunar phase entirely locally — no API needed.
//
// How it works:
// The lunar cycle is 29.53059 days (a synodic month).
// We know a reference new moon date (Jan 6, 2000 is a well-documented one).
// We calculate how many days have elapsed since then, divide by the cycle length,
// and take the fractional part — that gives us 0..1 where:
//   0.00 = New Moon
//   0.25 = First Quarter (waxing)
//   0.50 = Full Moon
//   0.75 = Last Quarter (waning)
//   1.00 = New Moon again
// ─────────────────────────────────────────────────────────────────────────────

const LUNAR_CYCLE = 29.53059; // days
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime(); // ms

export function getMoonPhase(date = new Date()) {
  const elapsed = date.getTime() - KNOWN_NEW_MOON;
  const days = elapsed / (1000 * 60 * 60 * 24);
  const phase = ((days % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE / LUNAR_CYCLE;
  return phase; // 0..1
}

export function getMoonPhaseName(phase) {
  if (phase < 0.03 || phase > 0.97) return "New Moon";
  if (phase < 0.22) return "Waxing Crescent";
  if (phase < 0.28) return "First Quarter";
  if (phase < 0.47) return "Waxing Gibbous";
  if (phase < 0.53) return "Full Moon";
  if (phase < 0.72) return "Waning Gibbous";
  if (phase < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

// Returns a unicode moon emoji for quick display
export function getMoonEmoji(phase) {
  const emojis = ["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"];
  return emojis[Math.round(phase * 8) % 8];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
// Renders the moon phase as a small drawn SVG disc with name label.
// Designed to sit in the left margin strip — very compact and faded.

// ─── COMPONENT ────────────────────────────────────────────────────────────────
// Props:
//   faded    — reduces opacity for margin use
//   vertical — renders disc + name in the SAME writing-mode:vertical-rl flow
//              as the section title, so they share one continuous vertical strip.
//              In vertical mode the SVG is rotated 90° so it sits upright,
//              and the name flows below it as rotated text.

export default function MoonPhase({ faded = true, vertical = false }) {
  const phase = getMoonPhase();
  const name  = getMoonPhaseName(phase);

  const r  = 7;
  const cx = 10;
  const cy = 10;
  const angle     = phase * 2 * Math.PI;
  const terminatorX = Math.cos(angle) * r;
  const waxing    = phase < 0.5;
  const inkColor  = faded ? "rgba(100,88,70,0.42)" : "rgba(100,88,70,0.85)";
  const fillLight = faded ? "rgba(240,228,200,0.55)" : "rgba(240,228,200,0.9)";
  const fillDark  = faded ? "rgba(80,70,55,0.22)"   : "rgba(80,70,55,0.5)";
  const clipId    = `moon-clip-${Math.round(phase * 100)}`;

  const disc = (
    <svg width="16" height="16" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={fillDark} />
      <g clipPath={`url(#${clipId})`}>
        {waxing
          ? <rect x={cx}     y={cy - r} width={r} height={r * 2} fill={fillLight} />
          : <rect x={cx - r} y={cy - r} width={r} height={r * 2} fill={fillLight} />
        }
        <ellipse
          cx={cx} cy={cy}
          rx={Math.abs(terminatorX)} ry={r}
          fill={terminatorX > 0 ? (waxing ? fillDark : fillLight)
                                : (waxing ? fillLight : fillDark)}
        />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={inkColor} strokeWidth="0.75" />
    </svg>
  );

  if (vertical) {
    // In vertical mode both disc and name sit inside writing-mode:vertical-rl.
    // The SVG disc is wrapped in a span so it sits naturally in the text flow.
    // The name follows on the same axis, reading bottom-to-top like the title.
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        opacity: faded ? 0.72 : 1,
        // No writing-mode here — parent LeftMarginStrip handles that
      }}>
        {disc}
        <span style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transform: "rotate(180deg)",
          fontSize: 6,
          fontFamily: "var(--font-label, var(--font-body))",
          color: inkColor,
          letterSpacing: "1.5px",
          whiteSpace: "nowrap",
          userSelect: "none",
          marginTop: 2,
        }}>
          {name}
        </span>
      </div>
    );
  }

  // Horizontal (default) — SVG beside text, used in non-margin contexts
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, opacity: faded ? 0.7 : 1 }}>
      {disc}
      <span style={{
        fontSize: 10,
        fontFamily: "var(--font-body)",
        color: inkColor,
        letterSpacing: "0.3px",
        lineHeight: 1.2,
      }}>
        {name}
      </span>
    </div>
  );
}
