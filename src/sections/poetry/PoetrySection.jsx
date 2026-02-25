// ─────────────────────────────────────────────────────────────────────────────
// PoetrySection.jsx — Two-page poetry browser
//
// Left page:  browse panel — sort controls, filter by tag/author, poem list
// Right page: poem display — title, author, scrollable text, metadata, notes
//
// Opening state: random poem (fetched on mount)
// Long poems: scroll within the right page
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api.jsx';
import PoetryEditor from './PoetryEditor.jsx';
import descriptor from './descriptor.js';

// ── Ink palette ───────────────────────────────────────────────────────────────
const ink    = 'rgba(60,40,20,0.80)';
const inkSub = 'rgba(60,40,20,0.50)';
const inkMut = 'rgba(60,40,20,0.32)';
const border = 'rgba(100,120,160,0.15)';
const acid   = '#d4f03a';
const teal   = '#3de8be';

// ── Left page: Browse panel ───────────────────────────────────────────────────
function BrowsePanel({
  poems, sort, setSort, filterTag, setFilterTag,
  filterAuthor, setFilterAuthor,
  activePoemId, onSelect, onAdd,
  tags, authors, loading, onClearFilters,
}) {
  const [search, setSearch] = useState('');
  const hasFilter = filterTag || filterAuthor || search;

  // Filter client-side by search (server handles tag/author filters)
  const visible = search
    ? poems.filter(p =>
        p.data.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.data.author?.toLowerCase().includes(search.toLowerCase()) ||
        p.data.firstLine?.toLowerCase().includes(search.toLowerCase())
      )
    : poems;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Browse controls ── */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        {/* Sort row */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px',
            textTransform: 'uppercase', color: inkMut, marginBottom: 5 }}>Browse by</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {descriptor.sortOptions.map(opt => (
              <button key={opt.id} onClick={() => setSort(opt.id)} style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 700,
                fontFamily: "'Syne', sans-serif",
                background: sort === opt.id ? acid : 'rgba(100,120,160,0.08)',
                border: `1px solid ${sort === opt.id ? acid : border}`,
                borderRadius: 20, cursor: 'pointer', color: sort === opt.id ? '#0a0b0e' : inkSub,
                transition: 'all .12s',
              }}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title, author, first line…"
          style={{
            width: '100%', padding: '6px 10px', fontSize: 11,
            background: 'rgba(100,120,160,0.06)',
            border: `1px solid ${border}`, borderRadius: 6,
            color: ink, fontFamily: "'Syne', sans-serif", outline: 'none',
          }}
        />

        {/* Tag filter */}
        {tags.length > 0 && (
          <div style={{ marginTop: 7 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px',
              textTransform: 'uppercase', color: inkMut, marginBottom: 4 }}>Filter by tag</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxHeight: 60, overflow: 'hidden' }}>
              {tags.slice(0, 20).map(t => (
                <button key={t.tag} onClick={() => setFilterTag(filterTag === t.tag ? '' : t.tag)} style={{
                  padding: '2px 7px', fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: filterTag === t.tag
                    ? 'rgba(61,232,190,0.25)' : 'rgba(61,232,190,0.06)',
                  border: `1px solid ${filterTag === t.tag ? teal : 'rgba(61,232,190,0.2)'}`,
                  borderRadius: 20, cursor: 'pointer',
                  color: filterTag === t.tag ? 'rgba(20,80,60,0.9)' : inkSub,
                  transition: 'all .1s',
                }}>
                  {t.tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Author filter */}
        {authors.length > 1 && (
          <div style={{ marginTop: 7 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px',
              textTransform: 'uppercase', color: inkMut, marginBottom: 4 }}>Filter by author</div>
            <select
              value={filterAuthor}
              onChange={e => setFilterAuthor(e.target.value)}
              style={{
                width: '100%', padding: '5px 8px', fontSize: 11,
                background: 'rgba(100,120,160,0.06)',
                border: `1px solid ${border}`, borderRadius: 6,
                color: ink, fontFamily: "'Syne', sans-serif", outline: 'none',
              }}
            >
              <option value="">All authors</option>
              {authors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}

        {/* Clear filters */}
        {hasFilter && (
          <button onClick={onClearFilters} style={{
            marginTop: 6, fontSize: 10, color: inkMut, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
          }}>Clear filters</button>
        )}
      </div>

      {/* ── Poem list ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {loading && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: inkMut }}>
            Loading poems…
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: inkMut }}>
            {poems.length === 0 ? 'No poems yet — add your first one.' : 'No matches.'}
          </div>
        )}
        {visible.map(poem => (
          <button
            key={poem.id}
            onClick={() => onSelect(poem)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 12px', background: 'none',
              borderBottom: `1px solid ${border}`,
              border: 'none', borderBottom: `1px solid ${border}`,
              cursor: 'pointer',
              background: poem.id === activePoemId
                ? 'rgba(212,240,58,0.08)' : 'none',
              borderLeft: poem.id === activePoemId
                ? `2px solid ${acid}` : '2px solid transparent',
              transition: 'background .12s',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: ink,
              marginBottom: 2, lineHeight: 1.3 }}>
              {poem.data.title || '(Untitled)'}
            </div>
            <div style={{ fontSize: 10, color: inkSub }}>
              {poem.data.author}
              {poem.data.publishedDate && (
                <span style={{ color: inkMut }}> · {poem.data.publishedDate}</span>
              )}
            </div>
            {poem.data.firstLine && (
              <div style={{ fontSize: 9, color: inkMut, marginTop: 2,
                fontStyle: 'italic', fontFamily: 'Georgia, serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {poem.data.firstLine}…
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── Add poem button ── */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
        <button onClick={onAdd} style={{
          width: '100%', padding: '8px', fontSize: 11, fontWeight: 800,
          background: 'rgba(212,240,58,0.1)',
          border: `1px solid rgba(212,240,58,0.3)`,
          borderRadius: 6, cursor: 'pointer', color: 'rgba(60,40,0,0.7)',
          fontFamily: "'Syne', sans-serif", transition: 'background .12s',
        }}>
          + Add poem
        </button>
        <div style={{ fontSize: 9, color: inkMut, textAlign: 'center', marginTop: 4 }}>
          {poems.length} poem{poems.length !== 1 ? 's' : ''} in collection
        </div>
      </div>
    </div>
  );
}

// ── Right page: Poem display ──────────────────────────────────────────────────
function PoemDisplay({ poem, onEdit, fontBody, fontHeader }) {
  if (!poem) return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 12,
      color: inkMut,
    }}>
      <div style={{ fontSize: 28, opacity: 0.4 }}>✦</div>
      <div style={{ fontSize: 12, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
        Select a poem to read
      </div>
    </div>
  );

  const { data, tags, id } = poem;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Poem header ── */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color: ink,
          fontFamily: fontHeader || "'Playfair Display', Georgia, serif",
          lineHeight: 1.25, marginBottom: 4,
        }}>
          {data.title || '(Untitled)'}
        </div>
        <div style={{
          fontSize: 12, color: inkSub,
          fontFamily: fontHeader || "'Playfair Display', Georgia, serif",
          fontStyle: 'italic',
        }}>
          {data.author}
          {data.translator && (
            <span style={{ color: inkMut }}> · trans. {data.translator}</span>
          )}
        </div>
        {(data.collection || data.publishedDate) && (
          <div style={{ fontSize: 10, color: inkMut, marginTop: 3 }}>
            {[data.collection, data.publishedDate].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {/* ── Scrollable poem body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'thin' }}>
        {/* Poem text — preserves whitespace/stanza breaks */}
        <div style={{
          fontFamily: fontBody || "'EB Garamond', Georgia, serif",
          fontSize: 15,
          lineHeight: 1.9,
          color: ink,
          whiteSpace: 'pre-wrap',
          marginBottom: 24,
          // Indent continuation lines (hanging indent effect)
          paddingLeft: '1.2em',
          textIndent: '-1.2em',
        }}>
          {data.text}
        </div>

        {/* ── Metadata block ── */}
        <div style={{
          borderTop: `1px solid ${border}`,
          paddingTop: 16, marginBottom: 16,
          display: 'flex', flexWrap: 'wrap', gap: '6px 16px',
        }}>
          {data.collection && (
            <MetaChip label="Collection" value={data.collection} />
          )}
          {data.publishedDate && (
            <MetaChip label="Published" value={data.publishedDate} />
          )}
          {data.translator && (
            <MetaChip label="Translated by" value={data.translator} />
          )}
        </div>

        {/* ── Tags ── */}
        {tags?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {tags.map(t => (
              <span key={t} style={{
                display: 'inline-block', marginRight: 5, marginBottom: 4,
                padding: '2px 8px', borderRadius: 20, fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                background: 'rgba(61,232,190,0.08)',
                border: '1px solid rgba(61,232,190,0.2)',
                color: 'rgba(20,80,60,0.7)',
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* ── Notes ── */}
        {data.notes && (
          <div style={{
            borderTop: `1px solid ${border}`, paddingTop: 14,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px',
              textTransform: 'uppercase', color: inkMut, marginBottom: 8 }}>
              Notes
            </div>
            <div style={{
              fontSize: 11, color: inkSub, lineHeight: 1.7,
              fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
            }}>
              {data.notes}
            </div>
          </div>
        )}

        {/* Edit button — subtle, at bottom */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${border}` }}>
          <button onClick={onEdit} style={{
            fontSize: 10, color: inkMut, background: 'none',
            border: `1px solid ${border}`, borderRadius: 5,
            padding: '4px 10px', cursor: 'pointer',
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            transition: 'color .12s',
          }}>
            Edit poem
          </button>
          <span style={{ fontSize: 9, color: inkMut, marginLeft: 10 }}>
            ID: {id}
          </span>
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div style={{ fontSize: 10 }}>
      <span style={{ color: inkMut, textTransform: 'uppercase', letterSpacing: '0.8px',
        fontSize: 9, fontWeight: 700 }}>{label} </span>
      <span style={{ color: inkSub, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{value}</span>
    </div>
  );
}

// ── Main PoetrySection ────────────────────────────────────────────────────────
export default function PoetrySection({ bindery }) {
  const [poems,        setPoems]        = useState([]);
  const [activePoem,   setActivePoem]   = useState(null);
  const [sort,         setSort]         = useState('random');
  const [filterTag,    setFilterTag]    = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [tags,         setTags]         = useState([]);
  const [authors,      setAuthors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [editingPoem,  setEditingPoem]  = useState(null); // null | 'new' | poem object
  const [apiError,     setApiError]     = useState('');

  // Bindery font preferences
  const fontBody   = bindery?.fontBody   ? `'${bindery.fontBody}', Georgia, serif`   : undefined;
  const fontHeader = bindery?.fontHeader ? `'${bindery.fontHeader}', Georgia, serif` : undefined;

  // ── Fetch poems ────────────────────────────────────────────────────────────
  const fetchPoems = useCallback(async (opts = {}) => {
    setLoading(true); setApiError('');
    try {
      const params = {
        sort: sort === 'random' ? 'created_at' : sort,
        ...(filterTag    ? { tag: filterTag }       : {}),
        ...(filterAuthor ? { author: filterAuthor } : {}),
        ...opts,
      };
      const res = await api.list('poetry', params);
      let list = res.items ?? [];
      // Client-side shuffle for random sort
      if (sort === 'random') list = list.sort(() => Math.random() - 0.5);
      setPoems(list);
    } catch (e) {
      setApiError(e.message ?? 'Failed to load poems.');
    }
    setLoading(false);
  }, [sort, filterTag, filterAuthor]);

  const fetchMeta = useCallback(async () => {
    try {
      const [tagRes, authorRes] = await Promise.all([
        api.tags('poetry'),
        api.authors('poetry'),
      ]);
      setTags(tagRes.tags ?? []);
      setAuthors(authorRes.authors ?? []);
    } catch {}
  }, []);

  // ── Opening state: random poem ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [randRes] = await Promise.all([
          api.random('poetry'),
          fetchMeta(),
        ]);
        if (randRes.item) setActivePoem(randRes.item);
      } catch (e) {
        setApiError(e.message ?? 'Could not reach the poetry collection.');
      }
      setLoading(false);
      fetchPoems();
    };
    init();
  }, []);

  // Re-fetch when sort/filter changes
  useEffect(() => { fetchPoems(); }, [fetchPoems]);

  const handleSortChange = (newSort) => {
    // Clicking random again reshuffles
    setSort(newSort);
    if (newSort === 'random' && !activePoem) {
      api.random('poetry').then(r => r.item && setActivePoem(r.item)).catch(() => {});
    }
  };

  const clearFilters = () => {
    setFilterTag('');
    setFilterAuthor('');
  };

  const handleSaved = () => {
    setEditingPoem(null);
    fetchPoems();
    fetchMeta();
  };

  // ── Editing overlay ────────────────────────────────────────────────────────
  if (editingPoem !== null) {
    return (
      <PoetryEditor
        existing={editingPoem === 'new' ? null : editingPoem}
        onSaved={handleSaved}
        onCancel={() => setEditingPoem(null)}
      />
    );
  }

  // ── Two-page layout ────────────────────────────────────────────────────────
  // BookShell already provides the two-page scaffold (left + gutter + right).
  // PoetrySection renders content FOR those pages, not the pages themselves.
  // The parent BookShell passes left/right content as children via sectionContent.
  // We return an object { left, right } that BookShell places in each page.
  //
  // Actually: BookShell renders one child per page slot.
  // PoetrySection IS the child for the right page; BookShell's leftContent prop
  // receives the left panel. We export a helper for that pattern.
  //
  // Since the current BookShell renders a single `children` prop per page,
  // we use a compound component pattern: PoetrySection.Left and PoetrySection.Right
  // are separate exports, both sharing state via a context.
  //
  // For now: render full-width with a flex row split internally.
  // This lets PoetrySection work within BookShell's existing single-child slot.

  return (
    <div style={{ height: '100%', display: 'flex' }}>

      {/* ── LEFT: browse panel ── */}
      <div style={{
        width: '42%', minWidth: 180, maxWidth: 260,
        borderRight: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {apiError && (
          <div style={{
            padding: '8px 12px', fontSize: 10,
            color: '#c03030', background: 'rgba(255,86,86,0.06)',
            borderBottom: `1px solid rgba(255,86,86,0.15)`,
          }}>
            {apiError}
          </div>
        )}
        <BrowsePanel
          poems={poems}
          sort={sort}
          setSort={handleSortChange}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          filterAuthor={filterAuthor}
          setFilterAuthor={setFilterAuthor}
          activePoemId={activePoem?.id}
          onSelect={setActivePoem}
          onAdd={() => setEditingPoem('new')}
          tags={tags}
          authors={authors}
          loading={loading}
          onClearFilters={clearFilters}
        />
      </div>

      {/* ── RIGHT: poem display ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <PoemDisplay
          poem={activePoem}
          onEdit={() => setEditingPoem(activePoem)}
          fontBody={fontBody}
          fontHeader={fontHeader}
        />
      </div>

    </div>
  );
}
