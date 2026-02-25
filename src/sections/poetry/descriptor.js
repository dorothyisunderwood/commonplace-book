// ─────────────────────────────────────────────────────────────────────────────
// sections/poetry/descriptor.js
//
// Section descriptor — pure data, no React, no side effects.
// Registers the poetry section with the content registry.
// Every future section follows this same shape.
// ─────────────────────────────────────────────────────────────────────────────

const poetryDescriptor = {
  sectionId:   'poetry',
  contentType: 'poem',
  idPrefix:    'poem',

  // ── Field schema ──────────────────────────────────────────────────────────
  // Used by PoetryEditor to render the right input for each field.
  // 'derived' fields are auto-computed on save and never shown in the editor.
  schema: {
    title:         { type: 'string',  required: true,  label: 'Title'           },
    author:        { type: 'string',  required: true,  label: 'Author'          },
    text:          { type: 'text',    required: true,  label: 'Poem text',
                     hint: 'Paste the full poem. Blank lines between stanzas are preserved.' },
    notes:         { type: 'text',    required: false, label: 'Notes'           },
    translator:    { type: 'string',  required: false, label: 'Translator'      },
    collection:    { type: 'string',  required: false, label: 'Collection'      },
    publishedDate: { type: 'string',  required: false, label: 'Date published',
                     hint: 'e.g. 1819, c. 1820, March 1945'                    },
    firstLine:     { type: 'derived', required: false, label: 'First line',
                     hint: 'Auto-derived from poem text on save'               },
  },

  // ── Sort options shown in the left-page browse panel ─────────────────────
  sortOptions: [
    { id: 'random',        label: 'Surprise me',   icon: '🎲' },
    { id: 'title',         label: 'By title',      icon: 'A–Z' },
    { id: 'author',        label: 'By author',     icon: '✍' },
    { id: 'firstLine',     label: 'By first line', icon: '↳'  },
    { id: 'publishedDate', label: 'By date',       icon: '📅' },
    { id: 'created_at',    label: 'Recently added',icon: '✨' },
  ],

  // ── Filter dimensions shown in the browse panel ───────────────────────────
  filterDimensions: ['tags', 'author', 'collection'],

  // ── Auto-parse hints for plain-text paste ─────────────────────────────────
  // Used by PoetryUtils.parsePoem() to detect title, author, etc.
  parseHints: {
    // Patterns that suggest the author follows
    authorPrefixes: [/^[-–—]\s*/,  /^by\s+/i, /^~\s*/],
    // If the last non-blank line matches one of these, treat it as author
    authorSuffixes: true,
    // Lines that look like collection info: "from X", "in X"
    collectionPrefixes: [/^from\s+/i, /^in\s+/i],
  },
};

export default poetryDescriptor;
