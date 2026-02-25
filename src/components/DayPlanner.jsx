import { useState, useEffect, useCallback, useRef } from "react";
import { splitChapter, makeStubChapter } from "../lib/chapterHelpers.jsx";
import ThemeSettings from "./ThemeSettings.jsx";
import {
  DEFAULT_THEMES,
  applyTheme,
  loadActiveThemeId,
  saveActiveThemeId,
  loadCustomThemes,
  loadHiddenThemes,
} from "../lib/themes.jsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ENERGY_LABELS = ["","Exhausted","Very Low","Low","Below Avg","Moderate","Good","High","Very High","Peak","Maximum"];
const SLEEP_SCORES = { terrible: 1, poor: 3, ok: 5, good: 7, great: 9 };
const FREQ_DAYS = { daily: 1, "2x_daily": 0.5, "3x_weekly": 2.33, weekly: 7, "2x_weekly": 3.5, biweekly: 14, monthly: 30, once: 9999 };

// ─── POINT ECONOMY ────────────────────────────────────────────────────────────
// Base points = energy_required × duration_minutes / 10  (rounded)
// e.g. energy 7 × 60min / 10 = 42pts  |  energy 1 × 2min / 10 = 0.2 → 1pt min
const BASE_POINTS_MIN = 1;
const FEEDBACK_POINTS = 15;
const PERFECT_DAY_BONUS = 200;

// Scaled low-energy multiplier: the worse you feel, the more credit you get
const LOW_ENERGY_SCALE = { 1: 3.0, 2: 2.5, 3: 2.0, 4: 1.5 }; // energy → multiplier

function getLowEnergyMultiplier(morningEnergy) {
  return LOW_ENERGY_SCALE[morningEnergy] || 1.0;
}

function calcTaskPoints(task, morningEnergy) {
  const base = Math.max(BASE_POINTS_MIN, Math.round((task.energy_required * task.duration_minutes) / 10));
  const multiplier = getLowEnergyMultiplier(morningEnergy);
  const lowEnergyBonus = multiplier > 1.0;
  const pts = lowEnergyBonus ? Math.round(base * multiplier) : base;
  return { base, pts, lowEnergyBonus, multiplier };
}

const DEFAULT_REWARDS = [
  { id: "r1", name: "30 min guilt-free gaming", cost: 150, emoji: "🎮", category: "leisure" },
  { id: "r2", name: "Nice takeaway meal", cost: 300, emoji: "🍜", category: "food" },
  { id: "r3", name: "Full rest day (no tasks)", cost: 500, emoji: "🛋️", category: "rest" },
  { id: "r4", name: "New book or game", cost: 400, emoji: "📚", category: "purchase" },
  { id: "r5", name: "Movie night / binge session", cost: 250, emoji: "🎬", category: "leisure" },
  { id: "r6", name: "Fancy coffee or treat", cost: 80, emoji: "☕", category: "food" },
  { id: "r7", name: "Weekend lie-in (no alarm)", cost: 180, emoji: "😴", category: "rest" },
  { id: "r8", name: "Buy something on the wishlist", cost: 600, emoji: "🛍️", category: "purchase" },
];

// ─── SAMPLE TASKS ─────────────────────────────────────────────────────────────
const SAMPLE_TASKS = [
  { id: "meds-am", name: "Take morning medications", mandatory: true, category: "health", energy_required: 1, duration_minutes: 2, frequency: "daily", time_of_day: "morning", days_available: ["mon","tue","wed","thu","fri","sat","sun"], variants: [], subtasks: [], blockers: [], cost: 0 },
  { id: "breakfast", name: "Breakfast", mandatory: true, category: "health", energy_required: 2, duration_minutes: 20, frequency: "daily", time_of_day: "morning", days_available: ["mon","tue","wed","thu","fri","sat","sun"], variants: [{ name: "Cereal or yogurt", duration_minutes: 5, energy_required: 1 }, { name: "Toast & eggs", duration_minutes: 15, energy_required: 2 }, { name: "Full cooked breakfast", duration_minutes: 35, energy_required: 3 }], subtasks: [], blockers: [], cost: 0 },
  { id: "lunch", name: "Lunch", mandatory: true, category: "health", energy_required: 2, duration_minutes: 30, frequency: "daily", time_of_day: "afternoon", days_available: ["mon","tue","wed","thu","fri","sat","sun"], variants: [{ name: "Snack / quick bite", duration_minutes: 10, energy_required: 1 }, { name: "Sandwich or leftovers", duration_minutes: 20, energy_required: 2 }, { name: "Cook proper lunch", duration_minutes: 40, energy_required: 4 }], subtasks: [], blockers: [], cost: 0 },
  { id: "dinner", name: "Dinner", mandatory: true, category: "health", energy_required: 3, duration_minutes: 45, frequency: "daily", time_of_day: "evening", days_available: ["mon","tue","wed","thu","fri","sat","sun"], variants: [{ name: "Takeaway or microwave meal", duration_minutes: 10, energy_required: 1 }, { name: "Simple pasta or stir-fry", duration_minutes: 25, energy_required: 3 }, { name: "Cook proper dinner", duration_minutes: 60, energy_required: 5 }], subtasks: [], blockers: [], cost: 0 },
  { id: "q1-report", name: "Q1 Report for CFMS", critical: true, category: "work", project: "CFMS", energy_required: 7, duration_minutes: 60, frequency: "once", deadline: "2026-03-26", days_available: ["mon","tue","wed","thu","fri"], variants: [], subtasks: ["Outline sections","Write draft","Review numbers"], blockers: [], cost: 0 },
  { id: "exercise", name: "Exercise", critical: true, category: "health", energy_required: 7, duration_minutes: 45, frequency: "3x_weekly", days_available: ["mon","tue","wed","thu","fri","sat","sun"], variants: [{ name: "Light walk (15 min)", duration_minutes: 15, energy_required: 3 }, { name: "Moderate workout (30 min)", duration_minutes: 30, energy_required: 6 }, { name: "Full workout (60 min)", duration_minutes: 60, energy_required: 9 }], subtasks: [], blockers: [], cost: 0 },
  { id: "email-triage", name: "Email triage & responses", category: "work", energy_required: 4, duration_minutes: 30, frequency: "daily", days_available: ["mon","tue","wed","thu","fri"], variants: [], subtasks: [], blockers: [], cost: 0 },
  { id: "weekly-review", name: "Weekly review", category: "admin", energy_required: 5, duration_minutes: 45, frequency: "weekly", days_available: ["fri","sat"], variants: [], subtasks: ["Review completed tasks","Plan next week","Update task list"], blockers: [], cost: 0 },
];

// ─── AI BATCH PARSER ─────────────────────────────────────────────────────────
// One API call handles all lines. Blank lines and # comments are stripped first.
async function parseTaskBatch(rawInput) {
  const lines = rawInput
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"));
  if (!lines.length) throw new Error("No tasks found.");

  const todayStr = new Date().toISOString().split("T")[0];
  const yearStr  = todayStr.slice(0, 4);

  const systemPrompt =
    "You are a task parsing assistant. You receive a numbered list of task descriptions " +
    "and return a JSON array — one object per task, in the same order.\n\n" +
    "Return ONLY a valid JSON array (no markdown, no backticks, no preamble). Each element:\n" +
    '{"id":"slug","name":"Task name","mandatory":false,"critical":false,' +
    '"category":"work|health|admin|personal|home|finance|social","project":null,' +
    '"energy_required":5,"duration_minutes":30,' +
    '"frequency":"daily|2x_daily|3x_weekly|2x_weekly|weekly|biweekly|monthly|once",' +
    '"deadline":null,"time_of_day":"morning|afternoon|evening|any",' +
    '"days_available":["mon","tue","wed","thu","fri","sat","sun"],' +
    '"variants":[],"subtasks":[],"blockers":[],"cost":0,' +
    '"confidence_notes":"brief note on assumptions"}\n\n' +
    "Guidelines:\n" +
    "- energy_required: 1=trivial (take a pill), 3=low (read email), 5=moderate (write a doc), 7=demanding (deep focus), 9=intense (hard exercise)\n" +
    "- duration_minutes: use stated estimate or sensible default for the task type\n" +
    "- mandatory: true only for eating, meds, sleep, hygiene\n" +
    "- critical: true if urgent or high importance\n" +
    "- deadline: parse relative dates like '26 Mar' to " + yearStr + "-MM-DD. Today is " + todayStr + "\n" +
    "- Work/admin tasks default to weekdays [mon,tue,wed,thu,fri]; personal/health default to all days\n" +
    "- id: lowercase hyphenated slug, unique across items\n" +
    "- If ambiguous, make the most reasonable assumption and note it in confidence_notes";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: lines.map((l, i) => (i + 1) + ". " + l).join("\n")
      }]
    })
  });

  const data = await response.json();
  const text = (data.content || []).map(b => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  return parsed.map(t => ({
    ...t,
    variants:  t.variants  || [],
    subtasks:  t.subtasks  || [],
    blockers:  t.blockers  || [],
    cost:      t.cost  ?? 0,
  }));
}

// ─── PRIORITY ALGORITHM ───────────────────────────────────────────────────────
function scoreTask(task, morningData, learnedData, today) {
  const { sleep, energy } = morningData;
  const sleepScore = SLEEP_SCORES[sleep] || 5;
  const learned = learnedData[task.id] || {};
  const effectiveDuration = learned.avg_duration || task.duration_minutes;
  const effectiveEnergy = learned.avg_energy || task.energy_required;
  let urgency = 0;
  if (task.deadline) {
    const daysLeft = Math.ceil((new Date(task.deadline) - today) / 86400000);
    if (daysLeft <= 0) urgency = 30;
    else if (daysLeft <= 1) urgency = 28;
    else if (daysLeft <= 3) urgency = 22;
    else if (daysLeft <= 7) urgency = 16;
    else if (daysLeft <= 14) urgency = 10;
    else if (daysLeft <= 30) urgency = 5;
    else urgency = 1;
  }
  const criticality = task.mandatory ? 25 : task.critical ? 15 : 0;
  const sleepMultiplier = 1 + (5 - sleepScore) * 0.1;
  const energyDiff = Math.abs(energy - effectiveEnergy);
  const energyFit = Math.max(0, 20 - energyDiff * 2.5) * sleepMultiplier;
  let overduePts = 0;
  if (learned.last_done && task.frequency && FREQ_DAYS[task.frequency]) {
    const daysSince = (today - new Date(learned.last_done)) / 86400000;
    const expected = FREQ_DAYS[task.frequency];
    if (daysSince > expected) overduePts = Math.min(15, ((daysSince - expected) / expected) * 15);
  }
  const dayName = ["sun","mon","tue","wed","thu","fri","sat"][today.getDay()];
  if (task.days_available?.length && !task.days_available.includes(dayName)) return null;
  if (task.blockers?.length && task.blockers.some(b => !learnedData[b]?.completed_today)) {
    return { ...task, score: 0, blocked: true, effectiveDuration, effectiveEnergy };
  }
  const score = urgency + criticality + energyFit + overduePts;
  return { ...task, score, urgency, criticality, energyFit, overduePts, effectiveDuration, effectiveEnergy, blocked: false };
}

function pickVariant(task, energy, sleep, timeRemaining, timePressure = false) {
  if (!task.variants?.length) return null;
  const sleepScore = SLEEP_SCORES[sleep] || 5;
  const effectiveEnergy = (energy + sleepScore / 2) / 1.5;

  // Always sort shortest-first so [0] is the quickest fallback
  const sorted = [...task.variants].sort((a, b) => a.duration_minutes - b.duration_minutes);

  // Under time pressure: pick the shortest variant that fits, no energy matching
  if (timePressure) {
    const fits = sorted.filter(v => v.duration_minutes <= timeRemaining);
    return fits.length ? fits[0] : sorted[0];
  }

  const fitting = sorted.filter(v => v.duration_minutes <= timeRemaining);
  if (!fitting.length) return sorted[0]; // shortest available as last resort
  if (effectiveEnergy < 3.5) return fitting[0]; // low energy → shortest
  // Normal: best energy match among those that fit
  return fitting.reduce((best, v) =>
    Math.abs(v.energy_required - effectiveEnergy) < Math.abs(best.energy_required - effectiveEnergy) ? v : best,
    fitting[0]
  );
}

function buildDayPlan(tasks, morningData, learnedData) {
  const today = new Date(); today.setHours(0,0,0,0);
  const availableMinutes = morningData.hours * 60;
  const scored = tasks.map(t => scoreTask(t, morningData, learnedData, today)).filter(Boolean).filter(t => !t.blocked);
  const mandatory = scored.filter(t => t.mandatory).sort((a,b) => b.score - a.score);
  const critical = scored.filter(t => !t.mandatory && t.critical).sort((a,b) => b.score - a.score);
  const normal = scored.filter(t => !t.mandatory && !t.critical).sort((a,b) => b.score - a.score);
  const blocked = tasks.filter(t => { const s = scoreTask(t, morningData, learnedData, today); return s?.blocked; });
  const plan = []; const alerts = []; let minutesUsed = 0;
  for (const task of mandatory) {
    const variant = pickVariant(task, morningData.energy, morningData.sleep, availableMinutes - minutesUsed);
    const duration = variant ? variant.duration_minutes : task.effectiveDuration;
    plan.push({ ...task, scheduledDuration: duration, displayName: variant ? `${task.name} — ${variant.name}` : task.name, variant, pinned: true });
    minutesUsed += duration;
  }
  // ── Critical tasks: try shortest variants under time pressure ──────────────
  // First pass: check if full-duration critical tasks fit
  const remainingForCritical = availableMinutes - minutesUsed;
  const critMinsNormal   = critical.reduce((s,t) => s + t.effectiveDuration, 0);
  // Second pass: what if we use shortest variants?
  const critMinsCompressed = critical.reduce((s,t) => {
    if (!t.variants?.length) return s + t.effectiveDuration;
    const shortest = Math.min(...t.variants.map(v => v.duration_minutes));
    return s + Math.min(t.effectiveDuration, shortest);
  }, 0);

  const timePressure = critMinsNormal > remainingForCritical;
  const canFitCompressed = critMinsCompressed <= remainingForCritical;

  if (timePressure) {
    if (canFitCompressed) {
      alerts.push({ type: "warning", message: "⏱ Time is tight — switching critical tasks to their shorter variants to fit your day." });
    } else {
      const shortfall = Math.round(critMinsCompressed - remainingForCritical);
      alerts.push({ type: "error", message: `⚠ Critical tasks need ${Math.round(critMinsCompressed/60*10)/10}h even at shortest variants, but only ${Math.round(remainingForCritical/60*10)/10}h remain. You're ${shortfall}min short — consider deferring a task.` });
    }
  }

  for (const task of critical) {
    const variant = pickVariant(task, morningData.energy, morningData.sleep, availableMinutes - minutesUsed, timePressure);
    const duration = variant ? variant.duration_minutes : task.effectiveDuration;
    // Allow critical tasks a 15min grace only if compressed variants exhausted
    if (minutesUsed + duration <= availableMinutes + 15) {
      plan.push({ ...task, scheduledDuration: duration, displayName: variant ? `${task.name} — ${variant.name}` : task.name, variant, compressed: timePressure && !!variant });
      minutesUsed += duration;
    }
  }
  for (const task of normal) {
    if (minutesUsed >= availableMinutes) break;
    // Also apply time pressure to normal tasks when we're over 90% capacity
    const normalPressure = minutesUsed / availableMinutes > 0.90;
    const variant = pickVariant(task, morningData.energy, morningData.sleep, availableMinutes - minutesUsed, normalPressure);
    const duration = variant ? variant.duration_minutes : task.effectiveDuration;
    if (minutesUsed + duration <= availableMinutes) {
      plan.push({ ...task, scheduledDuration: duration, displayName: variant ? `${task.name} — ${variant.name}` : task.name, variant, compressed: normalPressure && !!variant });
      minutesUsed += duration;
    }
  }
  if (scored.filter(t => t.overduePts > 10).length) alerts.push({ type: "warning", message: `📅 Overdue tasks auto-promoted.` });
  if (morningData.energy <= 3 || morningData.sleep === "terrible") alerts.push({ type: "info", message: `🌙 Low energy detected — variants scaled down. Low-energy bonus ×1.5 pts active today!` });
  return { plan, alerts, minutesUsed, availableMinutes, blocked };
}

function taskToYaml(task) {
  const lines = [`- id: ${task.id}`, `  name: ${task.name}`];
  if (task.mandatory) lines.push(`  mandatory: true`);
  if (task.critical) lines.push(`  critical: true`);
  if (task.category) lines.push(`  category: ${task.category}`);
  if (task.project) lines.push(`  project: ${task.project}`);
  lines.push(`  energy_required: ${task.energy_required}`, `  duration_minutes: ${task.duration_minutes}`, `  frequency: ${task.frequency || "once"}`);
  if (task.deadline) lines.push(`  deadline: "${task.deadline}"`);
  if (task.time_of_day) lines.push(`  time_of_day: ${task.time_of_day}`);
  if (task.days_available?.length) lines.push(`  days_available: [${task.days_available.join(",")}]`);
  if (task.variants?.length) { lines.push(`  variants:`); task.variants.forEach(v => lines.push(`    - name: ${v.name}`, `      duration_minutes: ${v.duration_minutes}`, `      energy_required: ${v.energy_required}`)); }
  if (task.subtasks?.length) { lines.push(`  subtasks:`); task.subtasks.forEach(s => lines.push(`    - ${s}`)); }
  if (task.confidence_notes) lines.push(`  # AI note: ${task.confidence_notes}`);
  return lines.join("\n");
}


// ─── TASK EDITOR COMPONENT ────────────────────────────────────────────────────
const CATEGORIES   = ["work","health","admin","personal","home","finance","social"];
const FREQUENCIES  = ["daily","2x_daily","3x_weekly","2x_weekly","weekly","biweekly","monthly","once"];
const TIME_OF_DAYS = ["morning","afternoon","evening","any"];
const ALL_DAYS     = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS   = { mon:"M", tue:"T", wed:"W", thu:"T", fri:"F", sat:"S", sun:"S" };

function TaskEditor({ task, learnedData, onSave, onDelete, onCancel }) {
  const [t, setT] = useState({ ...task });
  const [newVariant, setNewVariant] = useState({ name:"", duration_minutes:15, energy_required:3 });
  const [newSubtask, setNewSubtask] = useState("");
  const [showYaml, setShowYaml] = useState(false);

  const set = (k, v) => setT(prev => ({ ...prev, [k]: v }));
  const learned = learnedData[t.id];

  const toggleDay = (d) => {
    const cur = t.days_available || [];
    set("days_available", cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  };

  const addVariant = () => {
    if (!newVariant.name.trim()) return;
    set("variants", [...(t.variants||[]), { ...newVariant, duration_minutes: parseInt(newVariant.duration_minutes)||15, energy_required: parseInt(newVariant.energy_required)||3 }]);
    setNewVariant({ name:"", duration_minutes:15, energy_required:3 });
  };

  const removeVariant = (i) => set("variants", t.variants.filter((_,idx) => idx !== i));

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    set("subtasks", [...(t.subtasks||[]), newSubtask.trim()]);
    setNewSubtask("");
  };

  const removeSubtask = (i) => set("subtasks", t.subtasks.filter((_,idx) => idx !== i));

  const { base } = calcTaskPoints(t, 6); // preview at neutral energy

  return (
    <div>
      <div className="section-hdr">
        <div className="section-title" style={{marginBottom:0}}>Edit Task</div>
        <div style={{display:"flex",gap:6}}>
          <button className={`small-btn ${showYaml?"on":""}`} onClick={() => setShowYaml(v=>!v)}>YAML</button>
          <button className="small-btn" onClick={onCancel}>← Back</button>
        </div>
      </div>

      {learned && (
        <div className="preview-note" style={{marginBottom:14}}>
          📈 Learned data: {learned.count} completions
          {learned.avg_duration ? ` · avg ${learned.avg_duration}min (est: ${t.duration_minutes}min)` : ""}
          {learned.avg_energy   ? ` · avg ⚡${learned.avg_energy} (est: ${t.energy_required})` : ""}
        </div>
      )}

      <div className="edit-form">

        {/* Name */}
        <div className="ef-group">
          <label className="ef-label">Task name</label>
          <input className="ef-input" value={t.name} onChange={e => set("name", e.target.value)} placeholder="Task name" />
        </div>

        {/* Category */}
        <div className="ef-group">
          <label className="ef-label">Category</label>
          <div className="ef-radio-row">
            {CATEGORIES.map(c => (
              <button key={c} className={`ef-radio-btn ${t.category===c?"active":""}`} onClick={() => set("category", c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div className="ef-group">
          <label className="ef-label">Project <span className="ef-optional">(optional)</span></label>
          <input className="ef-input" value={t.project||""} onChange={e => set("project", e.target.value||null)} placeholder="e.g. CFMS, Home, Q1" />
        </div>

        {/* Flags row */}
        <div className="ef-group">
          <label className="ef-label">Flags</label>
          <div className="ef-check-row">
            <label className="ef-check">
              <input type="checkbox" checked={!!t.mandatory} onChange={e => set("mandatory", e.target.checked)} />
              <span>Mandatory</span>
            </label>
            <label className="ef-check">
              <input type="checkbox" checked={!!t.critical} onChange={e => set("critical", e.target.checked)} />
              <span>Critical</span>
            </label>
          </div>
        </div>

        {/* Energy */}
        <div className="ef-group">
          <label className="ef-label">
            Energy required — <span style={{color:"var(--acid)",fontFamily:"JetBrains Mono,monospace"}}>{t.energy_required}/10</span>
            <span className="ef-optional" style={{marginLeft:6}}>{["","Trivial","Very low","Low","Below avg","Moderate","Good","High","Very high","Peak","Maximum"][t.energy_required]}</span>
          </label>
          <div className="ef-scale-row">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} className={`ef-scale-btn ${t.energy_required===n?"active":""}`} onClick={() => set("energy_required", n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="ef-group">
          <label className="ef-label">Estimated duration — <span style={{color:"var(--acid)",fontFamily:"JetBrains Mono,monospace"}}>{t.duration_minutes} min</span></label>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="range" min={2} max={240} step={5} value={t.duration_minutes}
              onChange={e => set("duration_minutes", parseInt(e.target.value))}
              style={{flex:1,WebkitAppearance:"none",height:3,background:"var(--surface2)",borderRadius:2,outline:"none"}}
            />
            <input type="number" className="ef-input" style={{width:72}} value={t.duration_minutes}
              onChange={e => set("duration_minutes", Math.max(1, parseInt(e.target.value)||1))}
            />
          </div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>Base points at neutral energy: <span style={{color:"var(--gold)"}}>{base}pts</span></div>
        </div>

        {/* Frequency */}
        <div className="ef-group">
          <label className="ef-label">Frequency</label>
          <div className="ef-radio-row">
            {FREQUENCIES.map(f => (
              <button key={f} className={`ef-radio-btn ${t.frequency===f?"active":""}`} onClick={() => set("frequency", f)}>{f.replace("_"," ")}</button>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div className="ef-group">
          <label className="ef-label">Deadline <span className="ef-optional">(optional)</span></label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="date" className="ef-input" style={{flex:1}}
              value={t.deadline||""}
              onChange={e => set("deadline", e.target.value||null)}
            />
            {t.deadline && <button className="small-btn" onClick={() => set("deadline", null)}>Clear</button>}
          </div>
        </div>

        {/* Time of day */}
        <div className="ef-group">
          <label className="ef-label">Preferred time of day</label>
          <div className="ef-radio-row">
            {TIME_OF_DAYS.map(tod => (
              <button key={tod} className={`ef-radio-btn ${t.time_of_day===tod?"active":""}`} onClick={() => set("time_of_day", tod)}>{tod}</button>
            ))}
          </div>
        </div>

        {/* Days available */}
        <div className="ef-group">
          <label className="ef-label">Days available</label>
          <div style={{display:"flex",gap:5}}>
            {ALL_DAYS.map(d => (
              <button key={d} className={`ef-day-btn ${(t.days_available||[]).includes(d)?"active":""}`} onClick={() => toggleDay(d)}>
                {DAY_LABELS[d]}<span style={{fontSize:8,display:"block",opacity:.7}}>{d.slice(1)}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <button className="small-btn" onClick={() => set("days_available", ["mon","tue","wed","thu","fri"])}>Weekdays</button>
            <button className="small-btn" onClick={() => set("days_available", ["sat","sun"])}>Weekends</button>
            <button className="small-btn" onClick={() => set("days_available", [...ALL_DAYS])}>All</button>
          </div>
        </div>

        {/* Variants */}
        <div className="ef-group">
          <label className="ef-label">Variations <span className="ef-optional">(shorter/easier alternatives the algorithm can pick)</span></label>
          {(t.variants||[]).length === 0 && (
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>No variations yet. Add lighter versions for when time or energy is short.</div>
          )}
          {(t.variants||[]).map((v, i) => (
            <div key={i} className="ef-variant-row">
              <div style={{flex:1}}>
                <input className="ef-input ef-input-sm" value={v.name}
                  onChange={e => set("variants", t.variants.map((x,xi) => xi===i ? {...x,name:e.target.value} : x))}
                  placeholder="Variant name"
                />
              </div>
              <input className="ef-input ef-input-sm" style={{width:64}} type="number" value={v.duration_minutes}
                onChange={e => set("variants", t.variants.map((x,xi) => xi===i ? {...x,duration_minutes:parseInt(e.target.value)||1} : x))}
                title="Duration (min)"
              />
              <span style={{fontSize:10,color:"var(--muted)"}}>min</span>
              <div className="ef-scale-row" style={{gap:3}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} className={`ef-scale-btn ef-scale-sm ${v.energy_required===n?"active":""}`}
                    onClick={() => set("variants", t.variants.map((x,xi) => xi===i ? {...x,energy_required:n} : x))}
                  >{n}</button>
                ))}
              </div>
              <span style={{fontSize:10,color:"var(--muted)"}}>⚡</span>
              <button className="ef-remove-btn" onClick={() => removeVariant(i)}>✕</button>
            </div>
          ))}
          <div className="ef-variant-row" style={{marginTop:6}}>
            <div style={{flex:1}}>
              <input className="ef-input ef-input-sm" value={newVariant.name}
                onChange={e => setNewVariant(p=>({...p,name:e.target.value}))}
                placeholder="New variant name (e.g. Quick walk)"
                onKeyDown={e => e.key==="Enter" && addVariant()}
              />
            </div>
            <input className="ef-input ef-input-sm" style={{width:64}} type="number" value={newVariant.duration_minutes}
              onChange={e => setNewVariant(p=>({...p,duration_minutes:e.target.value}))}
              title="Duration (min)"
            />
            <span style={{fontSize:10,color:"var(--muted)"}}>min</span>
            <div className="ef-scale-row" style={{gap:3}}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} className={`ef-scale-btn ef-scale-sm ${newVariant.energy_required===n?"active":""}`}
                  onClick={() => setNewVariant(p=>({...p,energy_required:n}))}
                >{n}</button>
              ))}
            </div>
            <span style={{fontSize:10,color:"var(--muted)"}}>⚡</span>
            <button className="parse-btn" style={{padding:"5px 10px",fontSize:11,marginTop:0}} onClick={addVariant}>+ Add</button>
          </div>
        </div>

        {/* Subtasks */}
        <div className="ef-group">
          <label className="ef-label">Subtasks</label>
          {(t.subtasks||[]).map((s, i) => (
            <div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
              <span style={{fontSize:11,color:"var(--muted)"}}>↳</span>
              <input className="ef-input ef-input-sm" style={{flex:1}} value={s}
                onChange={e => set("subtasks", t.subtasks.map((x,xi)=>xi===i?e.target.value:x))}
              />
              <button className="ef-remove-btn" onClick={() => removeSubtask(i)}>✕</button>
            </div>
          ))}
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <input className="ef-input ef-input-sm" style={{flex:1}} value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              placeholder="Add a subtask…"
              onKeyDown={e => e.key==="Enter" && addSubtask()}
            />
            <button className="parse-btn" style={{padding:"5px 10px",fontSize:11,marginTop:0}} onClick={addSubtask}>+ Add</button>
          </div>
        </div>

        {showYaml && <div className="yaml-block" style={{marginTop:4}}>{taskToYaml(t)}</div>}

        {/* Action buttons */}
        <div className="confirm-row" style={{marginTop:16}}>
          <button className="btn-confirm" onClick={() => onSave(t)}>Save Changes</button>
          <button className="btn-discard" onClick={onDelete} style={{color:"var(--red)",borderColor:"rgba(255,86,86,.3)"}}>Delete</button>
          <button className="btn-discard" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DayPlanner({ children, onNavigate = () => {} }) {
  const [view, setView] = useState("morning");
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [learnedData, setLearnedData] = useState({});
  const [morningData, setMorningData] = useState({ sleep: "ok", hours: 8, energy: 6 });
  const [dayPlan, setDayPlan] = useState(null);
  const [nlInput, setNlInput] = useState("");
  const [parsedPreview, setParsedPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [completedTasks, setCompletedTasks] = useState({});
  const [actualTimes, setActualTimes] = useState({});
  const [actualEnergy, setActualEnergy] = useState({});
  const [feedbackLogged, setFeedbackLogged] = useState({});
  const [reviewMode, setReviewMode] = useState(false);
  const [yamlView, setYamlView] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toast, setToast] = useState(null);
  const [pointsBank, setPointsBank] = useState(0);
  const [pointsLog, setPointsLog] = useState([]);
  const [rewards, setRewards] = useState(DEFAULT_REWARDS);
  const [editingReward, setEditingReward] = useState(null);
  const [newReward, setNewReward] = useState({ name: "", cost: 100, emoji: "🎁", category: "leisure" });
  const [showAddReward, setShowAddReward] = useState(false);
  const [perfectDayAwarded, setPerfectDayAwarded] = useState(false);
  const [flyingPts, setFlyingPts] = useState(null);
  const [activeThemeId, setActiveThemeId] = useState(loadActiveThemeId);
  const [customThemes, setCustomThemes] = useState(loadCustomThemes);
  const [hiddenThemes, setHiddenThemes] = useState(loadHiddenThemes);

  // Apply the saved theme on first load
  useEffect(() => {
    const all = [...DEFAULT_THEMES, ...customThemes];
    const saved = all.find(t => t.id === activeThemeId) || DEFAULT_THEMES[0];
    applyTheme(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      try {
        const td = await window.storage.get("tasks_v2"); if (td) setTasks(JSON.parse(td.value));
        const ld = await window.storage.get("learned_v2"); if (ld) setLearnedData(JSON.parse(ld.value));
        const pb = await window.storage.get("points_bank"); if (pb) setPointsBank(parseInt(pb.value));
        const pl = await window.storage.get("points_log"); if (pl) setPointsLog(JSON.parse(pl.value));
        const rw = await window.storage.get("rewards_v2"); if (rw) setRewards(JSON.parse(rw.value));
      } catch {}
    };
    load();
  }, []);

  const saveTasksDB = useCallback(async (t) => { setTasks(t); try { await window.storage.set("tasks_v2", JSON.stringify(t)); } catch {} }, []);
  const saveLearnedDB = useCallback(async (l) => { setLearnedData(l); try { await window.storage.set("learned_v2", JSON.stringify(l)); } catch {} }, []);
  const saveRewardsDB = useCallback(async (r) => { setRewards(r); try { await window.storage.set("rewards_v2", JSON.stringify(r)); } catch {} }, []);

  const awardPoints = useCallback(async (pts, reason, color = "#e8f03a") => {
    const newBank = pointsBank + pts;
    const entry = { pts, reason, date: new Date().toLocaleDateString(), ts: Date.now() };
    const newLog = [entry, ...pointsLog].slice(0, 200);
    setPointsBank(newBank);
    setPointsLog(newLog);
    setFlyingPts({ pts: `+${pts}`, color });
    setTimeout(() => setFlyingPts(null), 1800);
    try {
      await window.storage.set("points_bank", String(newBank));
      await window.storage.set("points_log", JSON.stringify(newLog));
    } catch {}
    showToast(`+${pts} pts — ${reason}`, color === "#4de8c2" ? "teal" : color === "#ffb547" ? "gold" : "default");
  }, [pointsBank, pointsLog]);

  const showToast = (msg, type = "default") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const generatePlan = () => {
    const plan = buildDayPlan(tasks, morningData, learnedData);
    setDayPlan(plan);
    setCompletedTasks({}); setActualTimes({}); setActualEnergy({}); setFeedbackLogged({}); setPerfectDayAwarded(false);
    onNavigate("plan");
    try { window.storage.set("morning", JSON.stringify(morningData)); } catch {}
  };

  const markComplete = async (task) => {
    if (completedTasks[task.id]) return;
    const { pts, lowEnergyBonus } = calcTaskPoints(task, morningData.energy);
    setCompletedTasks(prev => ({ ...prev, [task.id]: { pts, lowEnergyBonus } }));
    const reason = lowEnergyBonus ? `${task.name} (low-energy bonus!)` : task.name;
    await awardPoints(pts, reason, lowEnergyBonus ? "#4de8c2" : "#e8f03a");

    // Check perfect day after marking — deferred so state settles
    setTimeout(async () => {
      const total = dayPlan?.plan?.length || 0;
      const nowDone = Object.keys(completedTasks).length + 1;
      if (!perfectDayAwarded && total > 0 && nowDone >= total) {
        setPerfectDayAwarded(true);
        await awardPoints(PERFECT_DAY_BONUS, "🏆 PERFECT DAY — all tasks completed!", "#ffb547");
      }
    }, 400);
  };

  const logFeedback = async (taskId) => {
    if (feedbackLogged[taskId]) return;
    setFeedbackLogged(prev => ({ ...prev, [taskId]: true }));
    await awardPoints(FEEDBACK_POINTS, `Feedback logged for task`, "#4de8c2");
  };

  const submitReview = async () => {
    const newLearned = { ...learnedData };
    for (const id of Object.keys(completedTasks)) {
      const prev = newLearned[id] || { count: 0, avg_duration: 0, avg_energy: 0 };
      const actualMin = parseInt(actualTimes[id]) || null;
      const actualEng = parseFloat(actualEnergy[id]) || null;
      const count = prev.count + 1;
      newLearned[id] = {
        ...prev, count,
        last_done: new Date().toISOString().split("T")[0],
        completed_today: true,
        avg_duration: actualMin ? Math.round(((prev.avg_duration * (count-1)) + actualMin) / count) : prev.avg_duration,
        avg_energy: actualEng ? Math.round(((prev.avg_energy||0) * (count-1) + actualEng) / count * 10) / 10 : prev.avg_energy
      };
      if (actualMin && !feedbackLogged[id]) await logFeedback(id);
    }
    await saveLearnedDB(newLearned);
    setReviewMode(false);
    showToast("✓ Estimates updated");
  };

  const redeemReward = async (reward) => {
    if (pointsBank < reward.cost) { showToast("Not enough points!", "error"); return; }
    const newBank = pointsBank - reward.cost;
    const entry = { pts: -reward.cost, reason: `Redeemed: ${reward.name}`, date: new Date().toLocaleDateString(), ts: Date.now() };
    const newLog = [entry, ...pointsLog].slice(0, 200);
    setPointsBank(newBank); setPointsLog(newLog);
    try { await window.storage.set("points_bank", String(newBank)); await window.storage.set("points_log", JSON.stringify(newLog)); } catch {}
    showToast(`${reward.emoji} Enjoy: ${reward.name}!`, "gold");
  };

  const handleNLParse = async () => {
    if (!nlInput.trim()) return;
    setParsing(true); setParseError(null); setParsedPreview(null);
    try {
      const results = await parseTaskBatch(nlInput);
      setParsedPreview(results.map(t => ({ ...t, _approved: true })));
    } catch (e) {
      setParseError("Parse failed — try: one task per line, e.g. 'Q1 report due 26 Mar, 1hr'. " + (e.message || ""));
    }
    setParsing(false);
  };

  const confirmAddTask = () => {
    if (!parsedPreview?.length) return;
    const toAdd = parsedPreview.filter(t => t._approved);
    const clean = toAdd.map(({ _approved, confidence_notes, ...t }) => t);
    const existing = tasks.filter(ex => !clean.some(n => n.id === ex.id));
    saveTasksDB([...existing, ...clean]);
    setParsedPreview(null); setNlInput("");
    showToast("✓ " + clean.length + " task" + (clean.length !== 1 ? "s" : "") + " added");
  };

  const togglePreviewItem = (idx) => {
    setParsedPreview(prev => prev.map((t, i) =>
      i === idx ? { ...t, _approved: !t._approved } : t
    ));
  };

  const completedCount = Object.keys(completedTasks).length;
  const totalPlanned = dayPlan?.plan?.length || 0;
  const pointsToday = Object.values(completedTasks).reduce((s, v) => s + (v.pts || 0), 0) + (perfectDayAwarded ? PERFECT_DAY_BONUS : 0);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0a0b0e;--surface:#13151c;--surface2:#1a1d26;--surface3:#20232e;
      --border:#252835;--border2:#2e3245;
      --gold:#f0c040;--gold2:#ffd97a;
      --teal:#3de8be;--teal2:#7fffd4;
      --acid:#d4f03a;--acid2:#eeff70;
      --red:#ff5656;--warn:#ff9f43;
      --muted:#5a6070;--text:#dde1ee;--text2:#8a90a8;
      --font-header:'Syne',sans-serif;
      --font-body:'JetBrains Mono',monospace;
      --on-accent:#0a0b0e;
      --radius-sm:6px;--radius-md:9px;--radius-lg:12px;--radius-xl:16px;
    }
    body{background:var(--bg);color:var(--text);font-family:var(--font-header);min-height:100vh}
    .app{max-width:700px;margin:0 auto;padding:20px 14px 100px;position:relative}

    /* ── HEADER */
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
    .logo{font-size:21px;font-weight:800;letter-spacing:-1px}
    .logo em{color:var(--acid);font-style:normal}
    .hdr-right{display:flex;align-items:center;gap:10px}
    .date-pill{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);background:var(--surface);padding:4px 10px;border-radius:20px;border:1px solid var(--border)}

    /* ── BANK WIDGET */
    .bank-chip{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#1a1a08,#2a2a10);border:1px solid rgba(240,192,64,0.4);border-radius:24px;padding:5px 14px;cursor:pointer;transition:all .15s}
    .bank-chip:hover{border-color:var(--gold);box-shadow:0 0 12px rgba(240,192,64,0.15)}
    .bank-pts{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:var(--gold)}
    .bank-label{font-size:10px;color:var(--muted);letter-spacing:.5px}
    .bank-coin{font-size:14px}

    /* ── NAV */
    .nav{display:flex;gap:3px;background:var(--surface);border-radius:10px;padding:4px;border:1px solid var(--border);margin-bottom:22px}
    .nav-btn{flex:1;padding:8px 2px;font-size:11px;font-weight:700;font-family:var(--font-header);background:none;border:none;color:var(--muted);cursor:pointer;border-radius:var(--radius-md);transition:all .15s;letter-spacing:.3px}
    .nav-btn.active{background:var(--acid);color:var(--on-accent)}
    .nav-btn:hover:not(.active){color:var(--text);background:var(--surface2)}

    /* ── MORNING */
    .morning-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px}
    .morning-q{margin-bottom:24px}
    .morning-q label{display:block;font-size:13px;font-weight:700;margin-bottom:10px;letter-spacing:.3px}
    .sleep-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
    .sleep-btn{padding:9px 4px;font-size:11px;font-weight:700;font-family:var(--font-header);background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;border-radius:var(--radius-md);transition:all .15s}
    .sleep-btn.active{background:var(--acid);color:var(--on-accent);border-color:var(--acid)}
    .slider-row{display:flex;align-items:center;gap:10px}
    .slider-row input[type=range]{flex:1;-webkit-appearance:none;height:3px;background:var(--surface2);border-radius:2px;outline:none}
    .slider-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;background:var(--acid);border-radius:50%;cursor:pointer}
    .mono-val{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:var(--acid)}
    .gen-btn{width:100%;padding:15px;font-size:14px;font-weight:800;font-family:var(--font-header);background:var(--acid);color:var(--on-accent);border:none;border-radius:var(--radius-lg);cursor:pointer;letter-spacing:.5px;transition:opacity .15s;margin-top:4px}
    .gen-btn:hover{opacity:.87}

    /* ── ALERTS */
    .alert{padding:12px 15px;border-radius:9px;font-size:12px;line-height:1.5;margin-bottom:8px}
    .alert.error{background:rgba(255,86,86,.1);border:1px solid rgba(255,86,86,.25);color:#ffaaaa}
    .alert.warning{background:rgba(255,159,67,.08);border:1px solid rgba(255,159,67,.2);color:#ffd090}
    .alert.info{background:rgba(61,232,190,.07);border:1px solid rgba(61,232,190,.18);color:var(--teal2)}

    /* ── PLAN STATS */
    .plan-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
    .stat-pill{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 13px;font-size:11px;color:var(--text2)}
    .stat-pill strong{display:block;font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--acid)}
    .stat-pill.gold-pill strong{color:var(--gold)}
    .progress-track{height:4px;background:var(--surface2);border-radius:2px;margin-bottom:14px;overflow:hidden}
    .progress-fill{height:100%;background:linear-gradient(90deg,var(--teal),var(--acid));border-radius:2px;transition:width .5s}

    /* ── PERFECT DAY BANNER */
    .perfect-banner{background:linear-gradient(135deg,rgba(240,192,64,.15),rgba(212,240,58,.1));border:1px solid rgba(240,192,64,.4);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;margin-bottom:14px;animation:popIn .3s ease}
    @keyframes popIn{from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)}}
    .perfect-emoji{font-size:28px}
    .perfect-text{flex:1}
    .perfect-text strong{display:block;font-size:14px;font-weight:800;color:var(--gold);margin-bottom:2px}
    .perfect-text span{font-size:12px;color:var(--text2)}
    .perfect-pts{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;color:var(--gold)}

    /* ── TASK CARDS */
    .task-card{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:14px;margin-bottom:7px;transition:all .15s;position:relative}
    .task-card.done{opacity:.42}
    .task-card.pinned{border-color:rgba(61,232,190,.25);background:rgba(61,232,190,.03)}
    .task-card.critical-card{border-color:rgba(255,159,67,.2)}
    .task-top{display:flex;align-items:flex-start;gap:11px}
    .check-btn{width:22px;height:22px;min-width:22px;border-radius:50%;border:2px solid var(--border2);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-top:1px}
    .check-btn.checked{background:var(--teal);border-color:var(--teal)}
    .check-btn.checked::after{content:'✓';font-size:11px;color:#0a0b0e;font-weight:900}
    .task-info{flex:1;min-width:0}
    .task-name{font-size:13px;font-weight:700;margin-bottom:5px;line-height:1.3}
    .task-meta{display:flex;gap:6px;flex-wrap:wrap}
    .tag{font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;font-family:'JetBrains Mono',monospace;letter-spacing:.3px;white-space:nowrap}
    .tag.t-time{background:var(--surface2);color:var(--text2);border:1px solid var(--border)}
    .tag.t-cat{background:rgba(212,240,58,.08);color:var(--acid);border:1px solid rgba(212,240,58,.18)}
    .tag.t-mand{background:rgba(61,232,190,.1);color:var(--teal);border:1px solid rgba(61,232,190,.22)}
    .tag.t-crit{background:rgba(255,159,67,.08);color:var(--warn);border:1px solid rgba(255,159,67,.2)}
    .tag.t-pts{background:rgba(240,192,64,.12);color:var(--gold2);border:1px solid rgba(240,192,64,.25)}
    .tag.t-bonus{background:rgba(61,232,190,.15);color:var(--teal2);border:1px solid rgba(61,232,190,.3)}
    .tag.t-learned{background:rgba(138,144,168,.08);color:var(--muted);border:1px solid var(--border)}
    .score-bar{height:2px;background:var(--surface2);border-radius:1px;margin-top:9px}
    .score-fill{height:100%;border-radius:1px;background:linear-gradient(90deg,var(--teal),var(--acid))}
    .task-num{font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted);min-width:18px;text-align:right}
    .subtask-list{margin-top:8px;padding-left:32px}
    .subtask-item{font-size:11px;color:var(--text2);padding:1px 0}
    .subtask-item::before{content:'↳ ';color:var(--muted)}

    /* ── FLYING POINTS */
    .flying-pts{position:fixed;top:80px;right:24px;font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;pointer-events:none;z-index:9999;animation:flyUp 1.8s ease forwards}
    @keyframes flyUp{0%{opacity:0;transform:translateY(0) scale(.8)} 20%{opacity:1;transform:translateY(-8px) scale(1.1)} 70%{opacity:1;transform:translateY(-30px) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(.9)}}

    /* ── REVIEW PANEL */
    .review-panel{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:18px;margin-top:14px}
    .review-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px}
    .review-label{flex:1;color:var(--text2)}
    .review-row input{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:6px;width:60px;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none}
    .review-row input:focus{border-color:var(--teal)}
    .feedback-badge{font-size:10px;background:rgba(61,232,190,.1);color:var(--teal);border:1px solid rgba(61,232,190,.25);padding:2px 8px;border-radius:20px;white-space:nowrap}

    /* ── BLOCKED */
    .blocked-section{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:13px 15px;margin-top:14px}
    .blocked-item{font-size:11px;color:var(--muted);padding:3px 0}

    /* ── REWARDS ── */
    .rewards-hero{background:linear-gradient(135deg,#1a1708,#12100a);border:1px solid rgba(240,192,64,.25);border-radius:14px;padding:20px 22px;margin-bottom:18px;display:flex;align-items:center;gap:16px}
    .bank-big{font-family:'JetBrains Mono',monospace;font-size:40px;font-weight:700;color:var(--gold);line-height:1}
    .bank-sub{font-size:11px;color:var(--muted);margin-top:4px}
    .bank-today{font-size:12px;color:var(--acid);font-family:'JetBrains Mono',monospace}
    .rewards-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .reward-card{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:14px;transition:all .15s;cursor:default}
    .reward-card.affordable{border-color:rgba(240,192,64,.3);cursor:pointer}
    .reward-card.affordable:hover{background:rgba(240,192,64,.06);transform:translateY(-1px);box-shadow:0 4px 16px rgba(240,192,64,.1)}
    .reward-emoji{font-size:26px;margin-bottom:6px}
    .reward-name{font-size:13px;font-weight:700;margin-bottom:6px;line-height:1.3}
    .reward-cost{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);font-weight:600}
    .reward-cost.cant{color:var(--muted)}
    .redeem-btn{margin-top:10px;width:100%;padding:7px;font-size:11px;font-weight:800;font-family:var(--font-header);background:var(--gold);color:var(--on-accent);border:none;border-radius:var(--radius-md);cursor:pointer;transition:opacity .15s}
    .redeem-btn:hover{opacity:.85}
    .cant-text{margin-top:8px;font-size:10px;color:var(--muted);text-align:center}
    .edit-reward-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
    .edit-reward-box{background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:24px;width:100%;max-width:360px}
    .edit-reward-box input{width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:9px 12px;border-radius:7px;font-family:'Syne',sans-serif;font-size:13px;margin-bottom:10px;outline:none}
    .edit-reward-box input:focus{border-color:var(--gold)}
    .reward-edit-row{display:flex;gap:8px;align-items:center;margin-bottom:10px}
    .reward-edit-row label{font-size:12px;color:var(--text2);min-width:60px}
    .reward-edit-row input{margin-bottom:0;flex:1}
    .pts-log{background:var(--surface);border:1px solid var(--border);border-radius:11px;overflow:hidden;margin-top:14px}
    .pts-log-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px}
    .pts-log-item:last-child{border-bottom:none}
    .pts-log-item .pts-val{font-family:'JetBrains Mono',monospace;font-weight:700}
    .pts-log-item .pts-val.pos{color:var(--acid)}
    .pts-log-item .pts-val.neg{color:var(--muted)}
    .pts-log-reason{flex:1;color:var(--text2);margin:0 10px}
    .pts-log-date{font-size:10px;color:var(--muted)}

    /* ── ADD TASK */
    .nl-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:14px}
    .nl-input{width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:'Syne',sans-serif;font-size:13px;padding:12px;border-radius:8px;resize:none;outline:none;transition:border-color .15s}
    .nl-input:focus{border-color:var(--acid)}
    .nl-hint{font-size:10px;color:var(--muted);margin-top:7px;line-height:1.6}
    .parse-btn{padding:9px 18px;background:var(--acid);color:var(--on-accent);font-weight:800;font-family:var(--font-header);font-size:12px;border:none;border-radius:var(--radius-md);cursor:pointer;margin-top:10px;transition:opacity .15s}
    .parse-btn:hover{opacity:.85}
    .parse-btn:disabled{opacity:.35;cursor:not-allowed}
    .preview-card{background:var(--surface2);border:1px solid rgba(61,232,190,.25);border-radius:11px;padding:18px}
    .preview-field{display:flex;gap:8px;margin-bottom:5px;font-size:12px}
    .preview-key{color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:10px;min-width:130px;margin-top:1px}
    .preview-val{color:var(--text);font-weight:600}
    .preview-note{font-size:11px;color:var(--teal);margin-top:9px;padding:8px 11px;background:rgba(61,232,190,.06);border-radius:6px;border-left:2px solid var(--teal)}
    .confirm-row{display:flex;gap:8px;margin-top:12px}
    .btn-confirm{flex:1;padding:9px;background:var(--teal);color:var(--on-accent);font-weight:800;font-family:var(--font-header);font-size:12px;border:none;border-radius:var(--radius-md);cursor:pointer}
    .btn-discard{padding:9px 14px;background:var(--surface);color:var(--muted);font-weight:700;font-family:'Syne',sans-serif;font-size:12px;border:1px solid var(--border);border-radius:7px;cursor:pointer}
    .yaml-block{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--acid);background:rgba(212,240,58,.03);border:1px solid rgba(212,240,58,.12);padding:12px;border-radius:7px;white-space:pre;overflow-x:auto;margin-top:10px;line-height:1.6}

    /* ── TASKS LIST */
    .task-list-item{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:12px 14px;margin-bottom:5px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .15s}
    .task-list-item:hover{border-color:var(--acid)}
    .tli-name{flex:1;font-size:12px;font-weight:700}
    .tli-meta{font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;text-align:right}
    .learned-badge{font-size:9px;background:rgba(61,232,190,.08);color:var(--teal);border:1px solid rgba(61,232,190,.18);padding:2px 7px;border-radius:20px;margin-top:3px;display:inline-block}

    /* ── MISC */
    .section-title{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
    .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .small-btn{font-size:11px;font-weight:700;font-family:'Syne',sans-serif;padding:5px 11px;background:var(--surface2);border:1px solid var(--border);color:var(--muted);border-radius:6px;cursor:pointer;transition:all .15s}
    .small-btn:hover{border-color:var(--acid);color:var(--acid)}
    .small-btn.on{border-color:var(--acid);color:var(--acid);background:rgba(212,240,58,.06)}
    .divider{height:1px;background:var(--border);margin:18px 0}
    .empty-state{text-align:center;padding:40px 20px;color:var(--muted);font-size:13px}
    .gcal-banner{background:rgba(61,232,190,.05);border:1px solid rgba(61,232,190,.18);border-radius:9px;padding:13px 15px;display:flex;align-items:center;gap:11px;margin-bottom:18px;font-size:12px}
    .gcal-text{flex:1;color:var(--text2)}
    .gcal-text strong{color:var(--teal);display:block;margin-bottom:1px}
    .gcal-btn{font-size:10px;font-weight:800;font-family:'Syne',sans-serif;padding:5px 11px;background:rgba(61,232,190,.12);border:1px solid rgba(61,232,190,.3);color:var(--teal);border-radius:6px;cursor:pointer;white-space:nowrap}
    .toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 20px;border-radius:30px;font-size:12px;font-weight:700;z-index:9998;animation:slideup .2s ease;white-space:nowrap;max-width:90vw}
    .toast.default{background:var(--surface);border:1px solid var(--acid);color:var(--acid)}
    .toast.teal{background:var(--surface);border:1px solid var(--teal);color:var(--teal)}
    .toast.gold{background:linear-gradient(135deg,#1a1708,#12100a);border:1px solid var(--gold);color:var(--gold)}
    .toast.error{background:var(--surface);border:1px solid var(--red);color:var(--red)}
    @keyframes slideup{from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @media(max-width:480px){.sleep-grid{grid-template-columns:repeat(3,1fr)}.rewards-grid{grid-template-columns:1fr}.plan-bar{flex-wrap:wrap}}

    /* ── THEME SETTINGS ── */
    .ts-group-label{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;gap:10px}
    .ts-subtle-btn{font-size:10px;font-weight:700;font-family:var(--font-header);padding:3px 10px;background:var(--surface2);border:1px solid var(--border);color:var(--text2);border-radius:var(--radius-sm);cursor:pointer;transition:all .15s}
    .ts-subtle-btn:hover{border-color:var(--acid);color:var(--acid)}
    .ts-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}
    .ts-theme-card{border:2px solid transparent;border-radius:var(--radius-lg);padding:12px;cursor:pointer;transition:all .2s;position:relative;min-height:90px}
    .ts-theme-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.3)}
    .ts-theme-card.active{box-shadow:0 0 0 2px var(--acid)}
    .ts-theme-card.hidden-theme{opacity:.45}
    .ts-swatches{display:flex;gap:3px;margin-bottom:8px}
    .ts-swatch{width:14px;height:14px;border-radius:3px;flex-shrink:0}
    .ts-theme-name{font-size:12px;font-weight:700;margin-bottom:2px;line-height:1.2}
    .ts-theme-meta{font-size:9px;letter-spacing:.3px}
    .ts-hide-btn{position:absolute;top:8px;right:8px;font-size:9px;font-weight:700;padding:2px 6px;background:rgba(0,0,0,.3);border:none;border-radius:3px;cursor:pointer;transition:opacity .15s}
    .ts-hide-btn:hover{opacity:.7}
    .ts-active-dot{position:absolute;bottom:8px;right:8px;width:8px;height:8px;border-radius:50%}
    .ts-empty{font-size:12px;color:var(--muted);padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:10px;text-align:center}

    /* ── THEME EDITOR ── */
    .ts-editor{background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-lg);padding:20px;margin-bottom:10px}
    .ts-editor-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    .ts-name-input{flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:9px 12px;border-radius:var(--radius-md);font-family:var(--font-header);font-size:14px;font-weight:700;outline:none}
    .ts-name-input:focus{border-color:var(--acid)}
    .ts-dark-toggle{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);cursor:pointer;white-space:nowrap}
    .ts-dark-toggle input{width:14px;height:14px;accent-color:var(--acid);cursor:pointer}
    .ts-section-label{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 8px}
    .ts-font-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:4px}
    .ts-font-btn{padding:9px 10px;background:var(--surface2);border:1px solid var(--border);color:var(--text2);border-radius:var(--radius-md);cursor:pointer;text-align:left;transition:all .12s}
    .ts-font-btn.active{border-color:var(--acid);background:rgba(212,240,58,.06)}
    .ts-font-btn:hover:not(.active){border-color:var(--text2)}
    .ts-font-name{display:block;font-size:12px;font-weight:700;color:var(--text)}
    .ts-font-sub{display:block;font-size:10px;color:var(--muted);margin-top:1px}
    .ts-radius-row{display:flex;gap:6px;margin-bottom:4px}
    .ts-radius-btn{flex:1;padding:7px;font-size:11px;font-weight:700;font-family:var(--font-header);background:var(--surface2);border:1px solid var(--border);color:var(--muted);border-radius:var(--radius-md);cursor:pointer;transition:all .12s}
    .ts-radius-btn.active{background:var(--acid);color:var(--on-accent);border-color:var(--acid)}
    .ts-color-group{display:flex;flex-direction:column;gap:5px;margin-bottom:4px}
    .ts-color-row{display:flex;align-items:center;gap:8px}
    .ts-color-label{font-size:11px;color:var(--text2);flex:1;min-width:130px}
    .ts-color-swatch{width:32px;height:28px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;padding:0;background:none}
    .ts-hex-input{width:82px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:var(--radius-sm);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;letter-spacing:.5px}
    .ts-hex-input:focus{border-color:var(--acid)}
    .ts-editor-actions{display:flex;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)}
    .ts-save-btn{flex:1;padding:9px;background:var(--teal);color:var(--on-accent);font-weight:800;font-family:var(--font-header);font-size:12px;border:none;border-radius:var(--radius-md);cursor:pointer}
    .ts-delete-btn{padding:9px 14px;background:rgba(255,86,86,.1);color:var(--red);font-weight:700;font-family:var(--font-header);font-size:12px;border:1px solid rgba(255,86,86,.3);border-radius:var(--radius-md);cursor:pointer}
    .ts-cancel-btn{padding:9px 14px;background:var(--surface2);color:var(--muted);font-weight:700;font-family:var(--font-header);font-size:12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer}
    @media(max-width:480px){.ts-theme-grid{grid-template-columns:repeat(2,1fr)}.ts-font-grid{grid-template-columns:1fr}}
    /* ── TASK EDITOR FORM */
    .edit-form{display:flex;flex-direction:column;gap:2px}
    .ef-group{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:6px}
    .ef-label{display:block;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
    .ef-optional{font-weight:400;text-transform:none;letter-spacing:0;font-size:10px}
    .ef-input{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:8px 11px;border-radius:7px;font-family:'Syne',sans-serif;font-size:13px;outline:none;width:100%;transition:border-color .15s}
    .ef-input:focus{border-color:var(--acid)}
    .ef-input-sm{padding:5px 8px;font-size:12px}
    .ef-radio-row{display:flex;gap:5px;flex-wrap:wrap}
    .ef-radio-btn{padding:5px 12px;font-size:11px;font-weight:700;font-family:var(--font-header);background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;border-radius:var(--radius-sm);transition:all .12s}
    .ef-radio-btn.active{background:var(--acid);color:var(--on-accent);border-color:var(--acid)}
    .ef-radio-btn:hover:not(.active){border-color:var(--text2);color:var(--text)}
    .ef-check-row{display:flex;gap:16px}
    .ef-check{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text2)}
    .ef-check input{width:16px;height:16px;accent-color:var(--acid);cursor:pointer}
    .ef-scale-row{display:flex;gap:4px;flex-wrap:wrap}
    .ef-scale-btn{width:28px;height:28px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;border-radius:5px;transition:all .1s;display:flex;align-items:center;justify-content:center}
    .ef-scale-btn.active{background:var(--acid);color:#0a0b0e;border-color:var(--acid)}
    .ef-scale-btn.ef-scale-sm{width:22px;height:22px;font-size:10px;border-radius:4px}
    .ef-day-btn{width:36px;height:44px;font-size:12px;font-weight:800;font-family:'Syne',sans-serif;background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;border-radius:7px;transition:all .12s;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
    .ef-day-btn.active{background:var(--teal);color:#0a0b0e;border-color:var(--teal)}
    input[type=date].ef-input{color-scheme:dark}
    .ef-variant-row{display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap}
    .ef-remove-btn{width:22px;height:22px;font-size:11px;background:rgba(255,86,86,.1);border:1px solid rgba(255,86,86,.25);color:var(--red);cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s}
    .ef-remove-btn:hover{background:rgba(255,86,86,.25)}

  `;

  // Build the chapter content map — a plain object mapping chapter id to JSX.
  // This is passed to children() (the render prop from App.jsx) which gives it
  // to BookShell. BookShell renders whichever chapter is currently active.
  // The reward overlay and toast are global and rendered at this level.

  const chapterMap = {
    morning: splitChapter(
    (
      <div style={{padding:"12px 0",fontFamily:"var(--font-body)"}}>
        <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.4)",marginBottom:12}}>Today's Context</div>
        <div style={{fontSize:11,color:"rgba(100,80,60,0.5)",lineHeight:1.8}}>
          <div>📅 Google Calendar</div>
          <div style={{fontSize:10,opacity:.6,marginLeft:14,marginTop:2}}>Connect to see upcoming events here</div>
        </div>
        <div style={{marginTop:16,padding:"10px 0",borderTop:"1px solid rgba(100,120,160,0.1)"}}>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.35)",marginBottom:8}}>Morning Stats</div>
          <div style={{fontSize:10,color:"rgba(100,80,60,0.45)",lineHeight:2}}>
            <div>Sleep quality ·· <em>set on check-in</em></div>
            <div>Energy level ·· <em>set on check-in</em></div>
          </div>
        </div>
      </div>
    ),
    (
<div>
            <div className="gcal-banner">
              <div style={{fontSize:18}}>📅</div>
              <div className="gcal-text"><strong>Google Calendar</strong>Connect to auto-block scheduled time and surface important dates.</div>
              <button className="gcal-btn">Connect</button>
            </div>
            <div className="section-title">Morning check-in</div>
            <div className="morning-card">
              <div className="morning-q">
                <label>How did you sleep?</label>
                <div className="sleep-grid">
                  {["terrible","poor","ok","good","great"].map(s => (
                    <button key={s} className={`sleep-btn ${morningData.sleep===s?"active":""}`} onClick={() => setMorningData(p=>({...p,sleep:s}))}>
                      {s.charAt(0).toUpperCase()+s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="morning-q">
                <label>Hours available — <span className="mono-val">{morningData.hours}h</span></label>
                <div className="slider-row">
                  <span style={{fontSize:10,color:"var(--muted)",fontFamily:"monospace"}}>1</span>
                  <input type="range" min={1} max={14} step={0.5} value={morningData.hours} onChange={e => setMorningData(p=>({...p,hours:parseFloat(e.target.value)}))} />
                  <span style={{fontSize:10,color:"var(--muted)",fontFamily:"monospace"}}>14</span>
                </div>
              </div>
              <div className="morning-q" style={{marginBottom:6}}>
                <label>Energy level — <span className="mono-val">{morningData.energy}/10</span> <span style={{fontSize:11,color:"var(--muted)"}}>{ENERGY_LABELS[morningData.energy]}</span></label>
                <div className="slider-row">
                  <span style={{fontSize:10,color:"var(--muted)",fontFamily:"monospace"}}>1</span>
                  <input type="range" min={1} max={10} value={morningData.energy} onChange={e => setMorningData(p=>({...p,energy:parseInt(e.target.value)}))} />
                  <span style={{fontSize:10,color:"var(--muted)",fontFamily:"monospace"}}>10</span>
                </div>
                {morningData.energy <= 4 && (
                  <div style={{fontSize:11,color:"var(--teal)",marginTop:8,background:"rgba(61,232,190,.07)",padding:"6px 10px",borderRadius:6,border:"1px solid rgba(61,232,190,.18)"}}>
                    ⚡ Low energy day — task points earn ×1.5 bonus today
                  </div>
                )}
              </div>
              <button className="gen-btn" onClick={generatePlan}>Generate Today's Plan →</button>
            </div>
          </div>
    )
  ),
    plan: splitChapter(
    (
      <div style={{padding:"12px 0",fontFamily:"var(--font-body)"}}>
        <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.4)",marginBottom:12}}>Day Summary</div>
        {dayPlan && (
          <div style={{fontSize:11,color:"rgba(100,80,60,0.5)",lineHeight:2}}>
            <div>Tasks planned ·· {dayPlan.plan.length}</div>
            <div>Hours scheduled ·· {Math.round(dayPlan.minutesUsed/60*10)/10}h</div>
            <div>Completed ·· {Object.keys(completedTasks).length}/{dayPlan.plan.length}</div>
            <div>Points today ·· {Object.values(completedTasks).reduce((s,v)=>s+(v.pts||0),0)}</div>
          </div>
        )}
        {!dayPlan && <div style={{fontSize:11,color:"rgba(100,80,60,0.35)",fontStyle:"italic"}}>Generate your plan first →</div>}
      </div>
    ),
    (
<div>
            {!dayPlan ? (
              <div className="empty-state">
                <div style={{fontSize:32,marginBottom:12}}>🌅</div>
                <div>Complete your morning check-in first</div>
                <button className="parse-btn" style={{marginTop:16}} onClick={() => onNavigate("morning")}>Go to Morning Check-in</button>
              </div>
            ) : (
              <>
                {dayPlan.alerts.map((a,i) => <div key={i} className={`alert ${a.type}`}>{a.message}</div>)}

                {/* Perfect day banner */}
                {perfectDayAwarded && (
                  <div className="perfect-banner">
                    <div className="perfect-emoji">🏆</div>
                    <div className="perfect-text">
                      <strong>Perfect Day!</strong>
                      <span>All {totalPlanned} tasks completed — bonus awarded</span>
                    </div>
                    <div className="perfect-pts">+{PERFECT_DAY_BONUS}</div>
                  </div>
                )}

                {/* Stats */}
                <div className="plan-bar">
                  <div className="stat-pill"><strong>{totalPlanned}</strong>planned</div>
                  <div className="stat-pill"><strong>{completedCount}/{totalPlanned}</strong>done</div>
                  <div className="stat-pill"><strong>{Math.round(dayPlan.minutesUsed/60*10)/10}h</strong>est. time</div>
                  <div className="stat-pill gold-pill"><strong>{pointsToday}</strong>pts today</div>
                </div>

                {completedCount > 0 && (
                  <div className="progress-track">
                    <div className="progress-fill" style={{width:`${(completedCount/totalPlanned)*100}%`}} />
                  </div>
                )}

                {dayPlan.plan.map((task, idx) => {
                  const done = !!completedTasks[task.id];
                  const { pts, lowEnergyBonus, multiplier } = calcTaskPoints(task, morningData.energy);
                  return (
                    <div key={task.id+idx} className={`task-card ${done?"done":""} ${task.pinned?"pinned":""} ${task.critical&&!task.mandatory?"critical-card":""}`}>
                      <div className="task-top">
                        <button className={`check-btn ${done?"checked":""}`} onClick={() => !done && markComplete(task)} />
                        <div className="task-info">
                          <div className="task-name">{task.displayName}</div>
                          <div className="task-meta">
                            <span className="tag t-time">⏱ {task.scheduledDuration}min</span>
                            <span className="tag t-cat">{task.category}</span>
                            {task.mandatory && <span className="tag t-mand">mandatory</span>}
                            {task.critical && !task.mandatory && <span className="tag t-crit">critical</span>}
                            <span className={`tag ${lowEnergyBonus?"t-bonus":"t-pts"}`}>
                              {lowEnergyBonus ? `⚡×1.5 → ${pts}pts` : `${pts}pts`}
                            </span>
                            {learnedData[task.id]?.count > 0 && (
                              <span className="tag t-learned">learned ×{learnedData[task.id].count}</span>
                            )}
                          </div>
                          {task.subtasks?.length > 0 && (
                            <div className="subtask-list">
                              {task.subtasks.map((s,i) => <div key={i} className="subtask-item">{s}</div>)}
                            </div>
                          )}
                          {task.deadline && <div style={{fontSize:10,color:"var(--muted)",marginTop:5,fontFamily:"monospace"}}>due {task.deadline}</div>}
                        </div>
                        <div className="task-num">#{idx+1}</div>
                      </div>
                      <div className="score-bar">
                        <div className="score-fill" style={{width:`${Math.min(100,task.score)}%`}} />
                      </div>
                    </div>
                  );
                })}

                {dayPlan.blocked?.length > 0 && (
                  <div className="blocked-section">
                    <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,marginBottom:7}}>BLOCKED TODAY</div>
                    {dayPlan.blocked.map(t => <div key={t.id} className="blocked-item">🔒 {t.name} — waiting on: {t.blockers?.join(", ")}</div>)}
                  </div>
                )}

                <div className="divider" />

                {!reviewMode ? (
                  <button className="small-btn" style={{width:"100%",padding:11}} onClick={() => setReviewMode(true)}>
                    📊 Log actual times (+{FEEDBACK_POINTS}pts per task)
                  </button>
                ) : (
                  <div className="review-panel">
                    <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>How did it actually go?</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Log actual minutes and energy → earn {FEEDBACK_POINTS}pts per task + improve future estimates</div>
                    {dayPlan.plan.filter(t => completedTasks[t.id]).map(task => (
                      <div key={task.id} className="review-row">
                        <div className="review-label">{task.name}</div>
                        <input placeholder="min" type="number" value={actualTimes[task.id]||""} onChange={e => setActualTimes(p=>({...p,[task.id]:e.target.value}))} title="Actual minutes" />
                        <input placeholder="⚡" type="number" min="1" max="10" value={actualEnergy[task.id]||""} onChange={e => setActualEnergy(p=>({...p,[task.id]:e.target.value}))} title="Actual energy 1-10" />
                        {feedbackLogged[task.id] && <span className="feedback-badge">+{FEEDBACK_POINTS}pts ✓</span>}
                      </div>
                    ))}
                    {dayPlan.plan.filter(t => completedTasks[t.id]).length === 0 && (
                      <div style={{color:"var(--muted)",fontSize:11}}>Mark tasks complete first, then log times here.</div>
                    )}
                    <div className="confirm-row" style={{marginTop:12}}>
                      <button className="btn-confirm" onClick={submitReview}>Save & Earn Points</button>
                      <button className="btn-discard" onClick={() => setReviewMode(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
    )
  ),
    tasks: splitChapter(
    (
      <div style={{padding:"12px 0",fontFamily:"var(--font-body)"}}>
        <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.4)",marginBottom:12}}>Task Library</div>
        <div style={{fontSize:11,color:"rgba(100,80,60,0.5)",lineHeight:2}}>
          <div>Total tasks ·· {tasks.length}</div>
          <div>Mandatory ·· {tasks.filter(t=>t.mandatory).length}</div>
          <div>Critical ·· {tasks.filter(t=>t.critical&&!t.mandatory).length}</div>
          <div>With variants ·· {tasks.filter(t=>t.variants?.length>0).length}</div>
        </div>
        <div style={{marginTop:16,padding:"10px 0",borderTop:"1px solid rgba(100,120,160,0.1)"}}>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.35)",marginBottom:8}}>Learned</div>
          <div style={{fontSize:10,color:"rgba(100,80,60,0.4)"}}>
            {Object.keys(learnedData).length} tasks calibrated
          </div>
        </div>
      </div>
    ),
    (
<div>
            <div className="section-hdr">
              <div className="section-title" style={{marginBottom:0}}>Task List ({tasks.length})</div>
              <button className={`small-btn ${yamlView?"on":""}`} onClick={() => setYamlView(v=>!v)}>{yamlView?"Cards":"YAML"}</button>
            </div>
            {yamlView ? (
              <div className="yaml-block">{tasks.map(t => taskToYaml(t)).join("\n\n")}</div>
            ) : tasks.map(task => {
              const learned = learnedData[task.id];
              const { pts } = calcTaskPoints(task, morningData.energy);
              return (
                <div key={task.id} className="task-list-item" onClick={() => { setEditingTask(task); onNavigate("add"); }}>
                  <div style={{fontSize:14}}>{task.mandatory ? "🔒" : task.critical ? "⚠️" : "○"}</div>
                  <div className="tli-name">{task.name}</div>
                  <div>
                    <div className="tli-meta">{task.duration_minutes}min · ⚡{task.energy_required} · <span style={{color:"var(--gold)"}}>{pts}pts</span></div>
                    {learned?.count > 0 && <div className="learned-badge">×{learned.count} · {learned.avg_duration||task.duration_minutes}min avg</div>}
                  </div>
                </div>
              );
            })}
          </div>
    )
  ),
    add: splitChapter(
    (
      <div style={{padding:"12px 0",fontFamily:"var(--font-body)"}}>
        <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.4)",marginBottom:12}}>How to Add Tasks</div>
        <div style={{fontSize:10,color:"rgba(100,80,60,0.45)",lineHeight:1.9}}>
          <div>Type one task per line in plain English. The AI will infer:</div>
          <div style={{marginTop:8,paddingLeft:8}}>
            <div>· Category & energy level</div>
            <div>· Frequency & deadline</div>
            <div>· Days available</div>
          </div>
          <div style={{marginTop:12,fontStyle:"italic",opacity:.7}}>e.g. "gym 3x per week, 1hr"</div>
          <div style={{fontStyle:"italic",opacity:.7}}>"Q1 report due 26 Mar, 1hr"</div>
        </div>
      </div>
    ),
    (
<div>
            {editingTask ? (
              <TaskEditor
                task={editingTask}
                learnedData={learnedData}
                onSave={(updated) => {
                  saveTasksDB(tasks.map(t => t.id === updated.id ? updated : t));
                  setEditingTask(null);
                  showToast("✓ Task saved");
                }}
                onDelete={() => {
                  saveTasksDB(tasks.filter(t => t.id !== editingTask.id));
                  setEditingTask(null);
                  showToast(`"${editingTask.name}" removed`);
                }}
                onCancel={() => setEditingTask(null)}
              />
            ) : (
              <div>
                <div className="section-title">Add Tasks in Plain English</div>
                <div className="nl-box">
                  <textarea className="nl-input" rows={5}
                    placeholder="One task per line, e.g.:\nQ1 report for CFMS due 26 Mar, maybe 1hr\nweekly team standup Tuesdays, 30 min\ntake vitamins every morning, 2 mins\ngym 3x per week, high energy, 1 hour\n\n# Lines starting with # are ignored"
                    value={nlInput} onChange={e => setNlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleNLParse(); }}
                  />
                  <div className="nl-hint">
                    Enter one task per line — paste as many as you like. One API call handles the whole batch.
                    AI infers category, energy, frequency, and deadline. Review each one before saving.
                  </div>
                  <button className="parse-btn" onClick={handleNLParse} disabled={parsing || !nlInput.trim()}>
                    {parsing
                      ? "Parsing " + nlInput.split("\n").filter(l => l.trim() && !l.startsWith("#")).length + " tasks…"
                      : "Parse Tasks →"}
                  </button>
                </div>
                {parseError && <div className="alert error" style={{marginBottom:12}}>{parseError}</div>}
                {parsedPreview && parsedPreview.length > 0 && (
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{fontSize:12,fontWeight:800,color:"var(--teal)"}}>
                        {parsedPreview.length} task{parsedPreview.length !== 1 ? "s" : ""} parsed — toggle to approve
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button className="small-btn" onClick={() => setParsedPreview(p => p.map(t => ({...t,_approved:true})))}>All ✓</button>
                        <button className="small-btn" onClick={() => setParsedPreview(p => p.map(t => ({...t,_approved:false})))}>None</button>
                      </div>
                    </div>
                    {parsedPreview.map((task, idx) => (
                      <div key={idx} className="preview-card" style={{marginBottom:8,opacity:task._approved?1:0.45,borderColor:task._approved?"rgba(61,232,190,.3)":"var(--border)"}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                          <button onClick={() => togglePreviewItem(idx)} style={{marginTop:2,width:20,height:20,minWidth:20,borderRadius:"50%",border:"2px solid " + (task._approved ? "var(--teal)" : "var(--border2)"),background:task._approved?"var(--teal)":"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {task._approved && <span style={{fontSize:10,color:"#0a0b0e",fontWeight:900}}>✓</span>}
                          </button>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:13,marginBottom:6}}>{task.name}</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              <span className="tag t-cat">{task.category}</span>
                              <span className="tag t-time">{task.duration_minutes}min</span>
                              <span className="tag t-learned">⚡{task.energy_required} · {task.frequency}</span>
                              {task.deadline && <span className="tag t-crit">due {task.deadline}</span>}
                              {task.mandatory && <span className="tag t-mand">mandatory</span>}
                              {task.critical && !task.mandatory && <span className="tag t-crit">critical</span>}
                              <span className="tag t-pts">{calcTaskPoints(task, morningData.energy).base}pts base</span>
                            </div>
                            {task.confidence_notes && (
                              <div style={{fontSize:10,color:"var(--teal)",marginTop:6,fontStyle:"italic"}}>💡 {task.confidence_notes}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="confirm-row" style={{marginTop:12}}>
                      <button className="btn-confirm" onClick={confirmAddTask} disabled={!parsedPreview.some(t => t._approved)}>
                        ✓ Add {parsedPreview.filter(t => t._approved).length} task{parsedPreview.filter(t => t._approved).length !== 1 ? "s" : ""}
                      </button>
                      <button className="btn-discard" onClick={() => { setParsedPreview(null); setNlInput(""); }}>Discard All</button>
                    </div>
                  </div>
                )}
                <div className="divider" />
                <div className="section-title">Learning Status</div>
                {Object.keys(learnedData).length === 0
                  ? <div style={{fontSize:11,color:"var(--muted)"}}>No learned data yet. Complete tasks and log actuals to improve estimates.</div>
                  : Object.entries(learnedData).map(([id,d]) => {
                    const task = tasks.find(t => t.id === id); if (!task) return null;
                    const drifted = d.avg_duration && Math.abs(d.avg_duration - task.duration_minutes) > 5;
                    return (
                      <div key={id} className="task-list-item" style={{cursor:"default"}}>
                        <div style={{flex:1}}>
                          <div className="tli-name" style={{fontSize:11}}>{task.name}</div>
                          <div className="tli-meta">{d.count} logged · avg {d.avg_duration||task.duration_minutes}min (est: {task.duration_minutes}){d.avg_energy?` · avg ⚡${d.avg_energy}`:""}</div>
                        </div>
                        <div style={{fontSize:9,color:drifted?"var(--warn)":"var(--teal)",fontFamily:"monospace",fontWeight:700}}>{drifted?"⚠ drifted":"✓ calibrated"}</div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
    )
  ),
    rewards: splitChapter(
    (
      <div style={{padding:"12px 0",fontFamily:"var(--font-body)"}}>
        <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.4)",marginBottom:12}}>Points Bank</div>
        <div style={{fontSize:28,fontWeight:700,fontFamily:"var(--font-header)",color:"rgba(100,80,60,0.6)",lineHeight:1,marginBottom:4}}>
          {pointsBank.toLocaleString()}
        </div>
        <div style={{fontSize:10,color:"rgba(100,80,60,0.4)",marginBottom:16}}>points accumulated</div>
        <div style={{padding:"10px 0",borderTop:"1px solid rgba(100,120,160,0.1)"}}>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.35)",marginBottom:8}}>Recent</div>
          {pointsLog.slice(0,5).map((e,i)=>(
            <div key={i} style={{fontSize:10,color:"rgba(100,80,60,0.45)",lineHeight:1.8,display:"flex",justifyContent:"space-between"}}>
              <span style={{opacity:.7,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.reason}</span>
              <span style={{fontFamily:"var(--font-body)",color:e.pts>0?"rgba(80,120,60,0.7)":"rgba(120,60,60,0.5)"}}>{e.pts>0?`+${e.pts}`:e.pts}</span>
            </div>
          ))}
          {pointsLog.length===0&&<div style={{fontSize:10,color:"rgba(100,80,60,0.3)",fontStyle:"italic"}}>No activity yet</div>}
        </div>
      </div>
    ),
    (
<div>
            {/* Bank hero */}
            <div className="rewards-hero">
              <div>
                <div style={{fontSize:11,color:"var(--muted)",letterSpacing:"1.5px",fontWeight:700,marginBottom:6}}>POINTS BANK</div>
                <div className="bank-big">{pointsBank.toLocaleString()}</div>
                <div className="bank-sub">Total accumulated</div>
              </div>
              <div style={{flex:1}} />
              <div style={{textAlign:"right"}}>
                {pointsToday > 0 && <div className="bank-today">+{pointsToday} today</div>}
                <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
                  Perfect day: <span style={{color:"var(--gold)"}}>{PERFECT_DAY_BONUS}pts</span><br/>
                  Feedback: <span style={{color:"var(--teal)"}}>{FEEDBACK_POINTS}pts/task</span><br/>
                  Low energy: <span style={{color:"var(--acid)"}}>×1.5 bonus</span>
                </div>
              </div>
            </div>

            <div className="section-hdr">
              <div className="section-title" style={{marginBottom:0}}>Rewards Shop</div>
              <button className="small-btn" onClick={() => setShowAddReward(true)}>+ Add Reward</button>
            </div>

            <div className="rewards-grid">
              {rewards.map(r => {
                const canAfford = pointsBank >= r.cost;
                return (
                  <div key={r.id} className={`reward-card ${canAfford?"affordable":""}`} onClick={() => canAfford && setEditingReward(r)}>
                    <div className="reward-emoji">{r.emoji}</div>
                    <div className="reward-name">{r.name}</div>
                    <div className={`reward-cost ${canAfford?"":"cant"}`}>🪙 {r.cost.toLocaleString()} pts</div>
                    {canAfford
                      ? <button className="redeem-btn" onClick={e => { e.stopPropagation(); redeemReward(r); }}>Redeem</button>
                      : <div className="cant-text">Need {(r.cost - pointsBank).toLocaleString()} more</div>
                    }
                  </div>
                );
              })}
            </div>

            {/* Points history */}
            {pointsLog.length > 0 && (
              <>
                <div className="divider" />
                <div className="section-title">Points History</div>
                <div className="pts-log">
                  {pointsLog.slice(0, 20).map((entry, i) => (
                    <div key={i} className="pts-log-item">
                      <div className={`pts-val ${entry.pts > 0 ? "pos" : "neg"}`}>{entry.pts > 0 ? `+${entry.pts}` : entry.pts}</div>
                      <div className="pts-log-reason">{entry.reason}</div>
                      <div className="pts-log-date">{entry.date}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
    )
  ),
    settings: splitChapter(
    (
      <div style={{padding:"12px 0",fontFamily:"var(--font-body)"}}>
        <div style={{fontSize:9,fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"rgba(100,80,60,0.4)",marginBottom:12}}>Theme</div>
        <div style={{fontSize:10,color:"rgba(100,80,60,0.45)",lineHeight:1.8}}>Choose a colour theme and font pair for the application UI.</div>
      </div>
    ),
    (
<ThemeSettings
            activeThemeId={activeThemeId}
            customThemes={customThemes}
            hiddenThemes={hiddenThemes}
            onThemeChange={id => { setActiveThemeId(id); saveActiveThemeId(id); }}
            onCustomThemesChange={setCustomThemes}
            onHiddenChange={setHiddenThemes}
          />
    )
  ),
    poetry: makeStubChapter(
      "Poetry",
      "Write, collect and arrange poems. Coming soon.",
      "✍"
    ),
  };

  return (
    <>
      <style>{css}</style>

      {/* Render prop: App.jsx passes children as a function that receives the chapter map */}
      {children({ chapters: chapterMap, pointsBank })}

      {/* ── FLYING POINTS (global overlay) ── */}
      {flyingPts && (
        <div className="flying-pts" style={{ color: flyingPts.color }}>{flyingPts.pts}</div>
      )}

      {/* ── EDIT/ADD REWARD OVERLAY ── */}
      {(editingReward || showAddReward) && (
        <div className="edit-reward-overlay" onClick={() => { setEditingReward(null); setShowAddReward(false); }}>
          <div className="edit-reward-box" onClick={e => e.stopPropagation()}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:16,color:"var(--gold)"}}>
              {showAddReward ? "Add New Reward" : "Edit Reward"}
            </div>
            {(() => {
              const r = showAddReward ? newReward : editingReward;
              const set = showAddReward
                ? (k, v) => setNewReward(p => ({...p,[k]:v}))
                : (k, v) => setEditingReward(p => ({...p,[k]:v}));
              return (
                <>
                  <div className="reward-edit-row"><label>Emoji</label><input value={r.emoji} onChange={e => set("emoji", e.target.value)} style={{maxWidth:70}} /></div>
                  <div className="reward-edit-row"><label>Name</label><input value={r.name} onChange={e => set("name", e.target.value)} placeholder="Reward name" /></div>
                  <div className="reward-edit-row"><label>Cost (pts)</label><input type="number" value={r.cost} onChange={e => set("cost", parseInt(e.target.value)||0)} /></div>
                  <div className="confirm-row">
                    <button className="btn-confirm" onClick={() => {
                      if (showAddReward) {
                        if (!newReward.name.trim()) return;
                        const updated = [...rewards, {...newReward, id:`r${Date.now()}`}];
                        saveRewardsDB(updated);
                        setNewReward({ name:"", cost:100, emoji:"🎁", category:"leisure" });
                        setShowAddReward(false);
                      } else {
                        saveRewardsDB(rewards.map(x => x.id === editingReward.id ? editingReward : x));
                        setEditingReward(null);
                      }
                    }}>Save</button>
                    {!showAddReward && (
                      <button className="btn-discard" onClick={() => {
                        saveRewardsDB(rewards.filter(x => x.id !== editingReward.id));
                        setEditingReward(null);
                        showToast("Reward removed");
                      }}>Remove</button>
                    )}
                    <button className="btn-discard" onClick={() => { setEditingReward(null); setShowAddReward(false); }}>Cancel</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
