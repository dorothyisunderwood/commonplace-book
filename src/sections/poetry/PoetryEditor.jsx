// ─────────────────────────────────────────────────────────────────────────────
// PoetryEditor.jsx — Add, edit, and delete poems
//
// Two entry paths:
//   1. "Add poem" — paste raw text → auto-parse → review/correct fields → save
//   2. "Edit poem" — pre-filled form with existing poem data
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.jsx';
import { parsePoem, formatPoemText, deriveFirstLine } from './PoetryUtils.js';

// ── Ink palette (matches BookShell paper aesthetic) ───────────────────────────
const ink    = 'rgba(60,40,20,0.75)';
const inkSub = 'rgba(60,40,20,0.45)';
const inkMut = 'rgba(60,40,20,0.3)';
const paper  = '#faf8f2';
const acid   = '#d4f03a';
const teal   = '#3de8be';
const border = 'rgba(100,120,160,0.18)';

const S = {
  wrap: {
    height: '100%', display: 'flex', flexDirection: 'column',
    fontFamily: "'Syne', sans-serif",
  },
  hdr: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px 8px', borderBottom: `1px solid ${border}`,
    flexShrink: 0,
  },
  hdrTitle: { fontSize: 11, fontWeight: 800, letterSpacing: '1.2px',
    textTransform: 'uppercase', color: inkSub },
  body: { flex: 1, overflowY: 'auto', padding: '14px 16px', scrollbarWidth: 'thin' },
  field: { marginBottom: 14 },
  label: {
    display: 'block', fontSize: 10, fontWeight: 800,
    letterSpacing: '1px', textTransform: 'uppercase',
    color: inkMut, marginBottom: 5,
  },
  hint: { fontSize: 9, color: inkMut, marginTop: 3, lineHeight: 1.5 },
  input: {
    width: '100%', padding: '8px 10px',
    background: 'rgba(100,120,160,0.06)',
    border: `1px solid ${border}`,
    borderRadius: 6, color: ink, fontSize: 12,
    fontFamily: "'Syne', sans-serif",
    outline: 'none', transition: 'border-color .15s',
  },
  textarea: {
    width: '100%', padding: '8px 10px',
    background: 'rgba(100,120,160,0.06)',
    border: `1px solid ${border}`,
    borderRadius: 6, color: ink, fontSize: 12,
    fontFamily: "'EB Garamond', Georgia, serif",
    outline: 'none', resize: 'vertical',
    lineHeight: 1.8, whiteSpace: 'pre-wrap',
    transition: 'border-color .15s',
  },
  pasteArea: {
    width: '100%', minHeight: 160, padding: '10px 12px',
    background: 'rgba(212,240,58,0.04)',
    border: `1.5px dashed rgba(212,240,58,0.35)`,
    borderRadius: 8, color: ink, fontSize: 12,
    fontFamily: 'Georgia, serif',
    outline: 'none', resize: 'vertical', lineHeight: 1.8,
  },
  parseBtn: {
    padding: '8px 16px', background: acid, color: '#0a0b0e',
    border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 800,
    fontFamily: "'Syne', sans-serif", cursor: 'pointer',
    marginTop: 8, transition: 'opacity .15s',
  },
  saveBtn: {
    padding: '10px 18px', background: acid, color: '#0a0b0e',
    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 800,
    fontFamily: "'Syne', sans-serif", cursor: 'pointer',
    flex: 1, transition: 'opacity .15s',
  },
  cancelBtn: {
    padding: '10px 14px', background: 'none',
    border: `1px solid ${border}`, borderRadius: 6,
    fontSize: 11, fontWeight: 700, color: inkSub,
    fontFamily: "'Syne', sans-serif", cursor: 'pointer',
  },
  deleteBtn: {
    padding: '10px 14px', background: 'none',
    border: '1px solid rgba(255,86,86,0.3)', borderRadius: 6,
    fontSize: 11, fontWeight: 700, color: 'rgba(255,86,86,0.7)',
    fontFamily: "'Syne', sans-serif", cursor: 'pointer',
  },
  tagInput: {
    flex: 1, padding: '6px 10px',
    background: 'rgba(100,120,160,0.06)',
    border: `1px solid ${border}`,
    borderRadius: 6, color: ink, fontSize: 11,
    fontFamily: "'Syne', sans-serif", outline: 'none',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 20,
    background: 'rgba(61,232,190,0.1)',
    border: '1px solid rgba(61,232,190,0.25)',
    fontSize: 10, color: 'rgba(20,80,60,0.8)',
    fontFamily: "'JetBrains Mono', monospace",
    margin: '0 3px 4px 0',
  },
  tagSuggestion: {
    padding: '4px 10px', fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
    color: inkSub, cursor: 'pointer',
    borderRadius: 4, background: 'none', border: 'none',
    transition: 'background .1s',
  },
  err: {
    fontSize: 11, color: '#c03030',
    background: 'rgba(255,86,86,0.07)',
    border: '1px solid rgba(255,86,86,0.2)',
    borderRadius: 6, padding: '8px 11px', marginBottom: 10,
  },
  footerRow: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderTop: `1px solid ${border}`, flexShrink: 0,
  },
};

// ── Tag input with autocomplete ───────────────────────────────────────────────
function TagInput({ tags, onChange, suggestions }) {
  const [input, setInput] = useState('');
  const [showSug, setShowSug] = useState(false);

  const addTag = (t) => {
    const clean = t.trim().toLowerCase().replace(/\s+/g, '-');
    if (clean && !tags.includes(clean)) onChange([...tags, clean]);
    setInput('');
    setShowSug(false);
  };

  const removeTag = (t) => onChange(tags.filter(x => x !== t));

  const filtered = suggestions
    .filter(s => s.tag.includes(input.toLowerCase()) && !tags.includes(s.tag))
    .slice(0, 8);

  return (
    <div>
      {/* Existing tags */}
      <div style={{ marginBottom: 6, minHeight: 24 }}>
        {tags.map(t => (
          <span key={t} style={S.tag}>
            {t}
            <button onClick={() => removeTag(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, color: 'inherit', fontSize: 10, lineHeight: 1,
            }}>✕</button>
          </span>
        ))}
      </div>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          style={S.tagInput}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSug(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
            if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
          }}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Add tag, press Enter or comma…"
        />
        {/* Autocomplete dropdown */}
        {showSug && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: paper, border: `1px solid ${border}`,
            borderRadius: 6, padding: '4px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            {filtered.map(s => (
              <button key={s.tag} style={S.tagSuggestion}
                onMouseDown={() => addTag(s.tag)}>
                {s.tag}
                {s.section_count > 0 && (
                  <span style={{ color: teal, marginLeft: 4 }}>×{s.section_count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={S.hint}>Separate with Enter or comma. Tags auto-suggest by frequency in Poetry.</div>
    </div>
  );
}

// ── Main PoetryEditor ─────────────────────────────────────────────────────────
export default function PoetryEditor({ existing, onSaved, onCancel }) {
  const isEdit = !!existing;

  // ── Paste state (add mode only) ───────────────────────────────────────────
  const [pasteText,   setPasteText]   = useState('');
  const [parsedDraft, setParsedDraft] = useState(null); // null = show paste box
  const [parseError,  setParseError]  = useState('');

  // ── Form fields ───────────────────────────────────────────────────────────
  const empty = { title: '', author: '', text: '', notes: '', translator: '',
                  collection: '', publishedDate: '' };
  const [fields,  setFields]  = useState(isEdit ? { ...empty, ...existing.data } : empty);
  const [tags,    setTags]    = useState(isEdit ? (existing.tags ?? []) : []);
  const [tagSugs, setTagSugs] = useState([]);

  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');
  const [delConfirm, setDelConfirm] = useState(false);

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  // ── Load tag suggestions on mount ────────────────────────────────────────
  useEffect(() => {
    api.tags('poetry').then(r => setTagSugs(r.tags ?? [])).catch(() => {});
  }, []);

  // ── Parse paste ───────────────────────────────────────────────────────────
  const handleParse = () => {
    const parsed = parsePoem(pasteText);
    if (!parsed.text && !parsed.title) {
      setParseError("Couldn't find any poem content. Paste the full poem text.");
      return;
    }
    setParseError('');
    setFields({ ...empty, ...parsed });
    setParsedDraft(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fields.title.trim()) { setError('Title is required.'); return; }
    if (!fields.author.trim()) { setError('Author is required.'); return; }
    if (!fields.text.trim()) { setError('Poem text is required.'); return; }
    setBusy(true); setError('');
    try {
      const data = {
        ...fields,
        text:      formatPoemText(fields.text),
        firstLine: deriveFirstLine(fields.text),
      };
      if (isEdit) {
        await api.update(existing.id, { data, tags });
      } else {
        await api.create({ sectionId: 'poetry', contentType: 'poem', data, tags });
      }
      onSaved();
    } catch (e) {
      setError(e.message ?? 'Save failed.');
    }
    setBusy(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delConfirm) { setDelConfirm(true); return; }
    setBusy(true);
    try {
      await api.delete(existing.id);
      onSaved();
    } catch (e) {
      setError(e.message ?? 'Delete failed.');
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.hdr}>
        <span style={S.hdrTitle}>{isEdit ? 'Edit poem' : 'Add poem'}</span>
        <button onClick={onCancel} style={{ ...S.cancelBtn, padding: '4px 10px', fontSize: 10 }}>
          ← Back
        </button>
      </div>

      <div style={S.body}>
        {error && <div style={S.err}>{error}</div>}

        {/* ── PASTE BOX (add mode, before parse) ── */}
        {!isEdit && !parsedDraft && (
          <div style={S.field}>
            <label style={S.label}>Paste poem text</label>
            <textarea
              style={S.pasteArea}
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setParseError(''); }}
              placeholder={`Paste the full poem here.\n\nThe parser will try to detect the title, author, and body automatically.\nYou can correct anything it gets wrong in the form below.\n\nExample:\n\nOde to a Nightingale\n\nMy heart aches, and a drowsy numbness pains...\n\n— John Keats, 1819`}
            />
            {parseError && <div style={{ fontSize: 11, color: '#c03030', marginTop: 5 }}>{parseError}</div>}
            <button style={S.parseBtn} onClick={handleParse} disabled={!pasteText.trim()}>
              Parse poem →
            </button>
            <div style={S.hint}>
              Tip: Include "— Author", "by Author", "from Collection", or "translated by X"
              anywhere in the text for better auto-detection.
            </div>
          </div>
        )}

        {/* ── FORM (edit mode, or after parse) ── */}
        {(isEdit || parsedDraft) && (
          <>
            {!isEdit && (
              <div style={{
                fontSize: 10, color: 'rgba(61,100,60,0.8)',
                background: 'rgba(61,232,190,0.07)',
                border: '1px solid rgba(61,232,190,0.2)',
                borderRadius: 6, padding: '7px 10px', marginBottom: 14,
              }}>
                ✓ Poem parsed — review and correct anything below, then save.
                <button onClick={() => setParsedDraft(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(61,100,60,0.7)', fontSize: 10, marginLeft: 8,
                  textDecoration: 'underline', padding: 0,
                }}>Re-paste</button>
              </div>
            )}

            {/* Title */}
            <div style={S.field}>
              <label style={S.label}>Title *</label>
              <input style={S.input} value={fields.title} onChange={set('title')} placeholder="e.g. Ode to a Nightingale" />
            </div>

            {/* Author */}
            <div style={S.field}>
              <label style={S.label}>Author *</label>
              <input style={S.input} value={fields.author} onChange={set('author')} placeholder="e.g. John Keats" />
            </div>

            {/* Poem text */}
            <div style={S.field}>
              <label style={S.label}>Poem text *</label>
              <textarea
                style={{ ...S.textarea, minHeight: 180 }}
                value={fields.text}
                onChange={set('text')}
                placeholder="The full poem text. Blank lines between stanzas are preserved."
              />
              <div style={S.hint}>Blank lines = stanza breaks. Leading spaces are preserved for indented lines.</div>
            </div>

            {/* Notes */}
            <div style={S.field}>
              <label style={S.label}>Notes</label>
              <textarea
                style={{ ...S.textarea, minHeight: 70, fontSize: 11 }}
                value={fields.notes}
                onChange={set('notes')}
                placeholder="Your notes on this poem, context, why you love it…"
              />
            </div>

            {/* Row: Translator + Collection */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Translator</label>
                <input style={S.input} value={fields.translator} onChange={set('translator')} placeholder="If translated" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Collection</label>
                <input style={S.input} value={fields.collection} onChange={set('collection')} placeholder="e.g. Lamia and Other Poems" />
              </div>
            </div>

            {/* Date published */}
            <div style={S.field}>
              <label style={S.label}>Date published</label>
              <input style={S.input} value={fields.publishedDate} onChange={set('publishedDate')} placeholder="e.g. 1819, c. 1820, March 1945" />
            </div>

            {/* Tags */}
            <div style={S.field}>
              <label style={S.label}>Tags</label>
              <TagInput tags={tags} onChange={setTags} suggestions={tagSugs} />
            </div>

            {/* Delete confirm */}
            {isEdit && delConfirm && (
              <div style={{
                fontSize: 11, padding: '10px 12px', marginBottom: 10,
                background: 'rgba(255,86,86,0.06)', borderRadius: 6,
                border: '1px solid rgba(255,86,86,0.2)', color: '#c03030',
              }}>
                Delete "{fields.title}" permanently? This cannot be undone.
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer buttons */}
      {(isEdit || parsedDraft) && (
        <div style={S.footerRow}>
          <button style={S.saveBtn} onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Add to collection')}
          </button>
          {isEdit && (
            <button
              style={{ ...S.deleteBtn, ...(delConfirm ? { background: 'rgba(255,86,86,0.1)' } : {}) }}
              onClick={handleDelete} disabled={busy}
            >
              {delConfirm ? 'Confirm delete' : 'Delete'}
            </button>
          )}
          <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}
