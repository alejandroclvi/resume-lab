// The style model — a flat token tree that maps 1:1 onto CSS properties in
// the PDF renderer. Everything the Style inspector edits lives here, and the
// Code tab exposes this exact object as editable JSON.
//
// Layout is a 12-column grid: `grid.rows` is a list of horizontal bands, each
// band a list of cells with a column span, each cell an ordered list of
// section blocks. A skills sidebar is simply a narrow cell holding `skills`.
export const BLOCK_IDS = ['header', 'summary', 'experience', 'skills', 'education']

export function box(v = 0) {
  return { top: v, right: v, bottom: v, left: v }
}

export const defaultStyle = {
  page: {
    size: 'LETTER', // LETTER | A4
    margin: { top: 42, right: 48, bottom: 48, left: 48 }, // pt
    background: '#ffffff',
  },
  grid: {
    gutter: 16, // pt between cells
    rows: [
      { id: 'r-head', cells: [{ id: 'c-head', span: 12, blocks: ['header'] }] },
      { id: 'r-body', cells: [{ id: 'c-body', span: 12, blocks: ['summary', 'experience', 'skills', 'education'] }] },
    ],
    unplaced: [], // blocks removed from the page — they sit in the tray, not the PDF
  },
  type: {
    family: 'Helvetica', // Helvetica | Times-Roman | Courier | Lato | PT Serif
    baseSize: 9.5,
    lineHeight: 1.45,
    color: '#1a1817',
    mutedColor: '#555555',
  },
  name: {
    size: 22,
    letterSpacing: 0.2,
    align: 'left', // left | center
    color: '', // empty = type.color
    spacingAfter: 0, // extra space under the name, before the headline
  },
  headline: { size: 11, color: '' }, // empty color = accent
  accent: '#b3341f',
  section: {
    titleSize: 9,
    letterSpacing: 1.8,
    uppercase: true,
    spacingBefore: 10,
    spacingAfter: 5,
    titleColor: '', // empty = accent
  },
  // Per-element overrides — the contextual inspector edits these.
  // null/'' = inherit the global value above. Every section has a full CSS
  // box model: 4-direction margin + padding.
  sections: {
    header: { background: '', margin: box(), padding: box() },
    summary: { title: 'Summary', showTitle: true, hidden: false, spacingBefore: null, textSize: null, titleColor: '', background: '', margin: box(), padding: box() },
    experience: { title: 'Experience', showTitle: true, hidden: false, spacingBefore: null, textSize: null, titleColor: '', background: '', margin: box(), padding: box() },
    skills: { title: 'Technical Skills', showTitle: true, hidden: false, spacingBefore: null, textSize: null, titleColor: '', mode: 'auto', background: '', margin: box(), padding: box() }, // auto | table | stacked
    education: { title: 'Education', showTitle: true, hidden: false, spacingBefore: null, textSize: null, titleColor: '', background: '', margin: box(), padding: box() },
  },
  rule: { show: true, thickness: 1.2, color: '' }, // under the header; empty = type.color
  bullets: {
    marker: '▸', // ▸ • – ◦ ‣
    indent: 10,
    gap: 1.5,
    markerColor: '', // empty = accent
  },
  entry: { spacing: 7 }, // gap between jobs
}

export const FONT_FAMILIES = [
  { id: 'Helvetica', label: 'Helvetica', kind: 'sans', builtin: true },
  { id: 'Times-Roman', label: 'Times', kind: 'serif', builtin: true },
  { id: 'Courier', label: 'Courier', kind: 'mono', builtin: true },
  { id: 'Lato', label: 'Lato', kind: 'sans', builtin: false },
  { id: 'PT Serif', label: 'PT Serif', kind: 'serif', builtin: false },
]

export const ACCENT_SWATCHES = [
  '#b3341f', // redline
  '#1f3a5f', // navy
  '#1e5c46', // forest
  '#5b2a66', // plum
  '#3d4852', // slate
  '#1a1817', // ink
]

export const BULLET_MARKERS = ['▸', '•', '–', '◦', '‣']

export const BLOCK_META = {
  header: { label: 'Header', icon: '¶' },
  summary: { label: 'Summary', icon: '≡' },
  experience: { label: 'Experience', icon: '☰' },
  skills: { label: 'Skills', icon: '⚒' },
  education: { label: 'Education', icon: '🎓' },
}

const clone = (o) => JSON.parse(JSON.stringify(o))

function deepMerge(dst, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      if (!dst[k] || typeof dst[k] !== 'object' || Array.isArray(dst[k])) dst[k] = {}
      deepMerge(dst[k], src[k])
    } else {
      dst[k] = src[k]
    }
  }
  return dst
}

function preset(patch) {
  return deepMerge(clone(defaultStyle), patch)
}

const SIDEBAR_GRID = (side) => ({
  gutter: 18,
  rows: [
    { id: 'r-head', cells: [{ id: 'c-head', span: 12, blocks: ['header'] }] },
    {
      id: 'r-body',
      cells:
        side === 'left'
          ? [
              { id: 'c-side', span: 4, blocks: ['skills', 'education'] },
              { id: 'c-main', span: 8, blocks: ['summary', 'experience'] },
            ]
          : [
              { id: 'c-main', span: 8, blocks: ['summary', 'experience'] },
              { id: 'c-side', span: 4, blocks: ['skills', 'education'] },
            ],
    },
  ],
})

export const PRESETS = [
  { id: 'proof', label: 'Proof', hint: 'the default — sharp red on white', style: clone(defaultStyle) },
  {
    id: 'classic',
    label: 'Classic',
    hint: 'serif, black & white, generous margins',
    style: preset({
      type: { family: 'PT Serif', baseSize: 9.5, lineHeight: 1.5 },
      accent: '#1a1817',
      name: { size: 24, align: 'center' },
      page: { margin: { top: 54, right: 60, bottom: 56, left: 60 } },
      bullets: { marker: '•' },
      rule: { thickness: 0.8 },
      section: { letterSpacing: 2.2 },
    }),
  },
  {
    id: 'modern',
    label: 'Modern',
    hint: 'Lato, navy accent, tight & airy',
    style: preset({
      type: { family: 'Lato', baseSize: 9, lineHeight: 1.5 },
      accent: '#1f3a5f',
      name: { size: 26, letterSpacing: -0.3 },
      section: { letterSpacing: 2.4, spacingBefore: 12 },
      bullets: { marker: '–' },
      rule: { thickness: 2, color: '#1f3a5f' },
    }),
  },
  {
    id: 'compact',
    label: 'Compact',
    hint: 'fits more on one page',
    style: preset({
      type: { baseSize: 8.5, lineHeight: 1.32 },
      page: { margin: { top: 30, right: 36, bottom: 34, left: 36 } },
      name: { size: 19 },
      section: { spacingBefore: 7, spacingAfter: 3 },
      entry: { spacing: 5 },
      bullets: { gap: 1 },
    }),
  },
  {
    id: 'executive',
    label: 'Executive',
    hint: 'skills sidebar on the right',
    style: preset({
      grid: SIDEBAR_GRID('right'),
      type: { family: 'Lato', baseSize: 9 },
      accent: '#1e5c46',
      name: { size: 24 },
      rule: { thickness: 2, color: '#1e5c46' },
    }),
  },
]

/* ── grid helpers (pure functions over the style object) ─────────── */

export function findBlock(grid, blockId) {
  for (let r = 0; r < grid.rows.length; r++) {
    for (let c = 0; c < grid.rows[r].cells.length; c++) {
      const i = grid.rows[r].cells[c].blocks.indexOf(blockId)
      if (i !== -1) return { row: r, cell: c, index: i }
    }
  }
  return null
}

let uid = 0
const newId = (p) => `${p}-${Date.now().toString(36)}${(uid++).toString(36)}`

// Every mutation returns a NEW style object (immutably via structuredClone).
export const gridOps = {
  moveBlockToCell(style, blockId, rowIdx, cellIdx, position = Infinity) {
    const next = structuredClone(style)
    const loc = findBlock(next.grid, blockId)
    if (loc) next.grid.rows[loc.row].cells[loc.cell].blocks.splice(loc.index, 1)
    next.grid.unplaced = (next.grid.unplaced || []).filter((b) => b !== blockId)
    const target = next.grid.rows[rowIdx]?.cells[cellIdx]
    if (!target) return style
    target.blocks.splice(Math.min(position, target.blocks.length), 0, blockId)
    return next
  },
  // Remove a block from the page — it waits in the tray, out of the PDF.
  unplaceBlock(style, blockId) {
    const next = structuredClone(style)
    const loc = findBlock(next.grid, blockId)
    if (loc) next.grid.rows[loc.row].cells[loc.cell].blocks.splice(loc.index, 1)
    next.grid.unplaced = (next.grid.unplaced || []).filter((b) => b !== blockId)
    next.grid.unplaced.push(blockId)
    return next
  },
  shiftBlock(style, blockId, dir) {
    const next = structuredClone(style)
    const loc = findBlock(next.grid, blockId)
    if (!loc) return style
    const blocks = next.grid.rows[loc.row].cells[loc.cell].blocks
    const j = loc.index + dir
    if (j < 0 || j >= blocks.length) return style
    ;[blocks[loc.index], blocks[j]] = [blocks[j], blocks[loc.index]]
    return next
  },
  setCellSpan(style, rowIdx, cellIdx, span) {
    const next = structuredClone(style)
    const cell = next.grid.rows[rowIdx]?.cells[cellIdx]
    if (!cell) return style
    cell.span = Math.max(2, Math.min(12, span))
    return next
  },
  addRow(style, afterIdx) {
    const next = structuredClone(style)
    next.grid.rows.splice(afterIdx + 1, 0, { id: newId('r'), cells: [{ id: newId('c'), span: 12, blocks: [] }] })
    return next
  },
  addCell(style, rowIdx) {
    const next = structuredClone(style)
    const row = next.grid.rows[rowIdx]
    if (!row || row.cells.length >= 4) return style
    row.cells.push({ id: newId('c'), span: 4, blocks: [] })
    return next
  },
  // Deleting a cell or row never loses content — its blocks go to the tray.
  deleteCell(style, rowIdx, cellIdx) {
    const next = structuredClone(style)
    const row = next.grid.rows[rowIdx]
    const cell = row?.cells[cellIdx]
    if (!cell) return style
    next.grid.unplaced = [...(next.grid.unplaced || []), ...cell.blocks]
    row.cells.splice(cellIdx, 1)
    if (row.cells.length === 0) next.grid.rows.splice(rowIdx, 1)
    if (next.grid.rows.length === 0) next.grid.rows = [{ id: newId('r'), cells: [{ id: newId('c'), span: 12, blocks: [] }] }]
    return next
  },
  deleteRow(style, rowIdx) {
    const next = structuredClone(style)
    const row = next.grid.rows[rowIdx]
    if (!row) return style
    next.grid.unplaced = [...(next.grid.unplaced || []), ...row.cells.flatMap((c) => c.blocks)]
    next.grid.rows.splice(rowIdx, 1)
    if (next.grid.rows.length === 0) next.grid.rows = [{ id: newId('r'), cells: [{ id: newId('c'), span: 12, blocks: [] }] }]
    return next
  },
  // One-click sidebar: a narrow cell with skills (+education) beside the main flow.
  makeSidebar(style, side) {
    const next = structuredClone(style)
    next.grid = structuredClone(SIDEBAR_GRID(side))
    return next
  },
  resetGrid(style) {
    const next = structuredClone(style)
    next.grid = structuredClone(defaultStyle.grid)
    return next
  },
  // A rectangle drawn with the mouse becomes a new row: empty spacer cells
  // pad the drawn cell so it sits at the drawn column offset.
  insertDrawnBlock(style, rowIdx, startCol, span, blockId) {
    const next = structuredClone(style)
    const cells = []
    if (startCol > 0) cells.push({ id: newId('c'), span: startCol, blocks: [] })
    cells.push({ id: newId('c'), span, blocks: [blockId] })
    if (startCol + span < 12) cells.push({ id: newId('c'), span: 12 - startCol - span, blocks: [] })
    next.grid.rows.splice(Math.max(0, Math.min(rowIdx, next.grid.rows.length)), 0, { id: newId('r'), cells })
    if (!next.sections[blockId]) next.sections[blockId] = customSectionDefaults()
    return next
  },
  removeBlock(style, blockId) {
    const next = structuredClone(style)
    const loc = findBlock(next.grid, blockId)
    if (loc) next.grid.rows[loc.row].cells[loc.cell].blocks.splice(loc.index, 1)
    next.grid.unplaced = (next.grid.unplaced || []).filter((b) => b !== blockId)
    delete next.sections[blockId]
    return next
  },
}

export const isCustomId = (id) => /^custom-/.test(id)

export function customSectionDefaults() {
  return { showTitle: true, hidden: false, spacingBefore: null, textSize: null, titleColor: '', background: '', margin: box(), padding: box() }
}

// Upgrades any older saved style (v1 layout.mode era, missing keys) to the
// current model.
export function migrateStyle(saved) {
  const out = structuredClone(saved || {})
  if (!out.grid && out.layout?.mode === 'two-column') {
    out.grid = SIDEBAR_GRID(out.layout.sidebarSide || 'right')
    out.grid.gutter = out.layout.columnGap || 18
  }
  delete out.layout
  const merged = deepMerge(structuredClone(defaultStyle), out)
  // ensure every block appears exactly once across the page + the tray
  // (custom-* blocks are allowed too)
  const seen = new Set()
  const keep = (b) => (BLOCK_IDS.includes(b) || isCustomId(b)) && !seen.has(b) && (seen.add(b) || true)
  for (const row of merged.grid.rows) for (const cell of row.cells) cell.blocks = cell.blocks.filter(keep)
  merged.grid.unplaced = (merged.grid.unplaced || []).filter(keep)
  // built-in blocks missing everywhere land in the tray, never silently lost
  merged.grid.unplaced.push(...BLOCK_IDS.filter((b) => !seen.has(b)))
  // custom blocks always have a sections entry
  for (const b of seen) if (isCustomId(b) && !merged.sections[b]) merged.sections[b] = customSectionDefaults()
  // older styles had a single-number padding and no margin — expand to boxes
  for (const cfg of Object.values(merged.sections)) {
    if (typeof cfg.padding === 'number') cfg.padding = box(cfg.padding)
    if (!cfg.padding || typeof cfg.padding !== 'object') cfg.padding = box()
    if (!cfg.margin || typeof cfg.margin !== 'object') cfg.margin = box()
  }
  return merged
}
