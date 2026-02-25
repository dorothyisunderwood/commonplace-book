// ─────────────────────────────────────────────────────────────────────────────
// PoetryUtils.js — Plain text poem parser and text utilities
//
// parsePoem(rawText) attempts to extract:
//   title, author, translator, collection, publishedDate, text
// from a plain paste. Returns a partial record; the editor lets the user
// correct anything the parser got wrong.
//
// Strategy (in order of confidence):
//   1. Explicit prefixes: "by X", "— X", "translated by X", "from X"
//   2. Structural heuristics: first non-blank line = title,
//      last non-blank line before a separator = author
//   3. Everything in between = poem text
// ─────────────────────────────────────────────────────────────────────────────

// ── Derive first line ─────────────────────────────────────────────────────────
// Strips leading whitespace and returns the first non-blank line of the poem body.
export function deriveFirstLine(text) {
  if (!text) return '';
  const line = text.split('\n').find(l => l.trim().length > 0) ?? '';
  return line.trim().replace(/\s+/g, ' ');
}

// ── Strip attribution suffixes ────────────────────────────────────────────────
// Removes leading dashes, tildes, "by " from an author string
function cleanAuthor(raw) {
  return raw
    .replace(/^[-–—~]+\s*/, '')
    .replace(/^by\s+/i, '')
    .trim();
}

// ── Looks like a year or date string? ────────────────────────────────────────
function looksLikeDate(s) {
  return /^(c\.?\s*)?\d{4}/.test(s) ||
         /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s);
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parsePoem(rawText) {
  if (!rawText.trim()) return {};

  const lines = rawText.split('\n');

  // Result fields (all start empty — only set when confident)
  let title         = '';
  let author        = '';
  let translator    = '';
  let collection    = '';
  let publishedDate = '';
  let bodyLines     = [];

  // ── Pass 1: extract explicit-prefix lines ─────────────────────────────────
  // These can appear anywhere in the text (top, bottom, after poem body).
  const remainingLines = [];

  for (const line of lines) {
    const t = line.trim();

    // "translated by X" / "trans. X" / "tr. X"
    const transMatch = t.match(/^trans(?:lated)?\s+(?:by\s+)?(.+)/i) ||
                       t.match(/^tr\.\s+(?:by\s+)?(.+)/i);
    if (transMatch) { translator = transMatch[1].trim(); continue; }

    // "from X" / "in X" (collection)
    const collMatch = t.match(/^from\s+['"""']?(.+?)['"""']?\s*$/i) ||
                      t.match(/^in\s+['"""']?(.+?)['"""']?\s*$/i);
    if (collMatch && !looksLikeDate(collMatch[1])) {
      collection = collMatch[1].trim(); continue;
    }

    // "by X" at start of a standalone line (not mid-poem)
    const byMatch = t.match(/^by\s+([A-Z].+)$/);
    if (byMatch && !author) { author = byMatch[1].trim(); continue; }

    // "— X" / "~ X" attribution dash
    const dashMatch = t.match(/^[-–—~]\s+(.+)$/);
    if (dashMatch && !author) { author = cleanAuthor(dashMatch[0]); continue; }

    remainingLines.push(line);
  }

  // ── Pass 2: structural heuristics on remaining lines ──────────────────────
  // Find first and last non-blank line indices
  const nonBlank = remainingLines
    .map((l, i) => ({ i, t: l.trim() }))
    .filter(x => x.t.length > 0);

  if (nonBlank.length === 0) return { title, author, translator, collection, publishedDate, text: '' };

  const firstIdx = nonBlank[0].i;
  const lastIdx  = nonBlank[nonBlank.length - 1].i;

  // Candidate title: first non-blank line, IF it looks like a title
  // (short, no punctuation in the middle, not all-caps sentence)
  const firstLine = nonBlank[0].t;
  const looksLikeTitle = firstLine.length <= 80 &&
    !firstLine.endsWith(',') &&
    nonBlank.length > 1; // not the only line

  if (looksLikeTitle && !title) {
    title = firstLine;
  }

  // Candidate author: last non-blank line, IF it's short and we don't have one
  const lastLine = nonBlank[nonBlank.length - 1].t;
  const looksLikeAuthor = !author &&
    lastLine.length <= 60 &&
    nonBlank.length > 2 &&
    !/[.!?,]$/.test(lastLine) && // doesn't end with sentence punctuation
    !/^[a-z]/.test(lastLine);    // starts with capital

  if (looksLikeAuthor) {
    author = cleanAuthor(lastLine);
  }

  // Body: everything between title line and (optional) last author line
  const bodyStart = (looksLikeTitle && !title.length) ? firstIdx + 1 : firstIdx + (looksLikeTitle ? 1 : 0);
  const bodyEnd   = looksLikeAuthor ? lastIdx : remainingLines.length;

  // If title was set and is the same as firstLine, skip firstLine in body
  const bodySlice = remainingLines.slice(
    title && remainingLines[firstIdx]?.trim() === title ? firstIdx + 1 : firstIdx,
    looksLikeAuthor ? lastIdx : undefined
  );

  // Trim leading/trailing blank lines from body
  let bodyText = bodySlice.join('\n');
  bodyText = bodyText.replace(/^\n+/, '').replace(/\n+$/, '');

  // ── Pass 3: look for a date in the author line (e.g. "Keats, 1819") ───────
  if (author) {
    const dateInAuthor = author.match(/,\s*((?:c\.?\s*)?\d{4}.*)$/);
    if (dateInAuthor) {
      publishedDate = dateInAuthor[1].trim();
      author = author.replace(dateInAuthor[0], '').trim();
    }
  }

  const firstLineOfBody = deriveFirstLine(bodyText);

  return {
    title:         title         || '',
    author:        author        || '',
    translator:    translator    || '',
    collection:    collection    || '',
    publishedDate: publishedDate || '',
    text:          bodyText,
    firstLine:     firstLineOfBody,
  };
}

// ── Format poem text for display ─────────────────────────────────────────────
// Normalises line endings, preserves stanza breaks (blank lines),
// but collapses 3+ consecutive blank lines to 2.
export function formatPoemText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Word count ────────────────────────────────────────────────────────────────
export function wordCount(text) {
  return (text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

// ── Estimated reading time in seconds ─────────────────────────────────────────
// Poetry is read slower than prose — assume ~80 wpm
export function readingSeconds(text) {
  return Math.ceil(wordCount(text) / 80 * 60);
}
