import { useEffect, useState } from 'react'
import {
  PRESETS, FONT_FAMILIES, ACCENT_SWATCHES, BULLET_MARKERS,
  defaultStyle, BLOCK_META, findBlock, gridOps, isCustomId,
} from '../data/defaultStyle.js'

/* ── control primitives ─────────────────────────────────────────── */

function Group({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sp-group">
      <button className="sp-group-head" onClick={() => setOpen(!open)}>
        <span className="tick">{open ? '▾' : '▸'}</span> {label}
      </button>
      {open && <div className="sp-group-body">{children}</div>}
    </div>
  )
}

function Row({ label, children, title }) {
  return (
    <div className="sp-row" title={title}>
      <span className="sp-row-label">{label}</span>
      <div className="sp-row-ctrl">{children}</div>
    </div>
  )
}

function Num({ value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <div className="sp-num">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="sp-num-val">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) onChange(n)
          }}
        />
        {unit && <span className="sp-unit">{unit}</span>}
      </div>
    </div>
  )
}

// Num that can be "inherit" (null) — shows the inherited value greyed until touched.
function NumInherit({ value, inherited, onChange, min, max, step = 1, unit = '' }) {
  const active = value !== null && value !== undefined
  return (
    <div className={`sp-inherit ${active ? '' : 'inheriting'}`}>
      <Num value={active ? value : inherited} onChange={onChange} min={min} max={max} step={step} unit={unit} />
      {active && (
        <button className="sp-clear" title="Back to inherited" onClick={() => onChange(null)}>↺</button>
      )}
    </div>
  )
}

function Seg({ options, value, onChange }) {
  return (
    <div className="sp-seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button className={`sp-toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <span className="knob" />
    </button>
  )
}

function ColorCtrl({ value, onChange, allowEmpty, emptyLabel = 'auto' }) {
  return (
    <div className="sp-color">
      <label className="sp-swatch-picker" style={{ background: value || 'transparent' }}>
        <input type="color" value={value || '#1a1817'} onChange={(e) => onChange(e.target.value)} />
        {!value && <span className="auto">A</span>}
      </label>
      <input
        className="sp-hex"
        value={value}
        placeholder={allowEmpty ? emptyLabel : '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      {allowEmpty && value && (
        <button className="sp-clear" title="Back to automatic" onClick={() => onChange('')}>↺</button>
      )}
    </div>
  )
}

function BoxModel({ margin, onChange, label = 'margin · pt', inner = 'content' }) {
  const side = (key) => (
    <input
      type="number"
      value={margin[key]}
      min={0}
      max={120}
      onChange={(e) => onChange({ ...margin, [key]: Number(e.target.value) || 0 })}
    />
  )
  return (
    <div className="boxmodel">
      <span className="bm-tag">{label}</span>
      <div className="bm-top">{side('top')}</div>
      <div className="bm-mid">
        {side('left')}
        <div className="bm-content">{inner}</div>
        {side('right')}
      </div>
      <div className="bm-bottom">{side('bottom')}</div>
    </div>
  )
}

/* ── advanced JSON editor ───────────────────────────────────────── */

function AdvancedEditor({ style, setStyle }) {
  const [text, setText] = useState(() => JSON.stringify(style, null, 2))
  const [err, setErr] = useState(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) setText(JSON.stringify(style, null, 2))
  }, [style, dirty])

  const apply = () => {
    try {
      const parsed = JSON.parse(text)
      setStyle(parsed)
      setErr(null)
      setDirty(false)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="sp-advanced">
      <p className="sp-hint">The whole style model as JSON — every key maps to CSS in the PDF template. Edit and apply.</p>
      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true) }}
        rows={18}
      />
      {err && <div className="sp-err">✗ {err}</div>}
      <div className="sp-adv-actions">
        <button className="sp-apply" onClick={apply} disabled={!dirty}>Apply</button>
        <button className="sp-ghost" onClick={() => { setText(JSON.stringify(style, null, 2)); setDirty(false); setErr(null) }} disabled={!dirty}>Discard</button>
        <button className="sp-ghost" onClick={() => navigator.clipboard.writeText(text)}>Copy</button>
      </div>
    </div>
  )
}

/* ── scoped inspectors ──────────────────────────────────────────── */

function BulletControls({ style, set }) {
  return (
    <>
      <Row label="Marker">
        <div className="sp-markers">
          {BULLET_MARKERS.map((m) => (
            <button key={m} className={`sp-marker ${style.bullets.marker === m ? 'on' : ''}`} onClick={() => set('bullets.marker', m)}>
              {m}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Indent">
        <Num value={style.bullets.indent} onChange={(v) => set('bullets.indent', v)} min={6} max={22} unit="pt" />
      </Row>
      <Row label="Bullet gap">
        <Num value={style.bullets.gap} onChange={(v) => set('bullets.gap', v)} min={0} max={6} step={0.5} unit="pt" />
      </Row>
      <Row label="Job gap">
        <Num value={style.entry.spacing} onChange={(v) => set('entry.spacing', v)} min={2} max={18} unit="pt" />
      </Row>
    </>
  )
}

function PlacementGroup({ style, setStyle, blockId }) {
  const loc = findBlock(style.grid, blockId)
  if (!loc)
    return (
      <Group label="Placement">
        <p className="sp-hint">This section is off the page (in the tray). Drag it onto the canvas, or:</p>
        <button
          className="sp-apply"
          onClick={() =>
            setStyle((p) => gridOps.moveBlockToCell(p, blockId, p.grid.rows.length - 1, 0))
          }
        >
          Place at the bottom
        </button>
      </Group>
    )
  const row = style.grid.rows[loc.row]
  const cell = row.cells[loc.cell]
  const siblings = cell.blocks.length
  return (
    <Group label="Placement">
      <Row label="Position" title="Row / cell / slot in the grid">
        <span className="sp-value">row {loc.row + 1} · cell {loc.cell + 1} · slot {loc.index + 1}</span>
      </Row>
      <Row label="Cell width" title="Column span of the cell holding this block (12 = full width)">
        <Num value={cell.span} onChange={(v) => setStyle((p) => gridOps.setCellSpan(p, loc.row, loc.cell, v))} min={2} max={12} unit="/12" />
      </Row>
      {siblings > 1 && (
        <Row label="Order">
          <div className="sp-seg">
            <button onClick={() => setStyle((p) => gridOps.shiftBlock(p, blockId, -1))} disabled={loc.index === 0}>↑ up</button>
            <button onClick={() => setStyle((p) => gridOps.shiftBlock(p, blockId, 1))} disabled={loc.index === siblings - 1}>↓ down</button>
          </div>
        </Row>
      )}
      <p className="sp-hint">Drag the block on the canvas to move it to another cell — or use the sidebar shortcuts above the page.</p>
    </Group>
  )
}

function BoxGroup({ cfg, blockId, set }) {
  return (
    <Group label="Box">
      <BoxModel
        label="margin · pt"
        inner="this section"
        margin={cfg.margin}
        onChange={(m) => set(`sections.${blockId}.margin`, m)}
      />
      <BoxModel
        label="padding · pt"
        inner="content"
        margin={cfg.padding}
        onChange={(p) => set(`sections.${blockId}.padding`, p)}
      />
      <Row label="Fill" title="Background color behind this section">
        <ColorCtrl value={cfg.background} onChange={(v) => set(`sections.${blockId}.background`, v)} allowEmpty emptyLabel="none" />
      </Row>
    </Group>
  )
}

function BlockInspector({ style, setStyle, set, blockId, data, setData, setSelection }) {
  const cfg = style.sections[blockId]
  const custom = isCustomId(blockId)
  const cs = custom ? (data.customSections || []).find((c) => c.id === blockId) : null

  const setCustom = (key, value) =>
    setData((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).map((c) => (c.id === blockId ? { ...c, [key]: value } : c)),
    }))

  const deleteBlock = () => {
    if (!confirm('Delete this section and its content?')) return
    setSelection({ type: 'page' })
    setStyle((p) => gridOps.removeBlock(p, blockId))
    setData((prev) => ({ ...prev, customSections: (prev.customSections || []).filter((c) => c.id !== blockId) }))
  }

  return (
    <>
      {custom && cs && (
        <Group label="Content">
          <Row label="Title">
            <input className="sp-text" value={cs.title} onChange={(e) => setCustom('title', e.target.value)} />
          </Row>
          <textarea
            className="sp-body"
            rows={7}
            spellCheck={false}
            value={cs.body}
            placeholder={'Plain lines are paragraphs.\n- lines starting with “- ” are bullets'}
            onChange={(e) => setCustom('body', e.target.value)}
          />
        </Group>
      )}

      <PlacementGroup style={style} setStyle={setStyle} blockId={blockId} />

      {blockId === 'header' ? (
        <>
          <Group label="Name">
            <Row label="Size"><Num value={style.name.size} onChange={(v) => set('name.size', v)} min={14} max={34} unit="pt" /></Row>
            <Row label="Tracking"><Num value={style.name.letterSpacing} onChange={(v) => set('name.letterSpacing', v)} min={-1} max={3} step={0.1} /></Row>
            <Row label="Align">
              <Seg
                value={style.name.align}
                onChange={(v) => set('name.align', v)}
                options={[{ value: 'left', label: '⟸ Left' }, { value: 'center', label: '≡ Center' }]}
              />
            </Row>
            <Row label="Color"><ColorCtrl value={style.name.color} onChange={(v) => set('name.color', v)} allowEmpty emptyLabel="ink" /></Row>
            <Row label="Space ↓" title="Extra space under the name, before the headline">
              <Num value={style.name.spacingAfter || 0} onChange={(v) => set('name.spacingAfter', v)} min={0} max={20} unit="pt" />
            </Row>
          </Group>
          <Group label="Headline">
            <Row label="Size"><Num value={style.headline.size} onChange={(v) => set('headline.size', v)} min={8} max={16} step={0.5} unit="pt" /></Row>
            <Row label="Color"><ColorCtrl value={style.headline.color} onChange={(v) => set('headline.color', v)} allowEmpty emptyLabel="accent" /></Row>
          </Group>
          <Group label="Rule">
            <Row label="Show"><Toggle value={style.rule.show} onChange={(v) => set('rule.show', v)} /></Row>
            {style.rule.show && (
              <>
                <Row label="Weight"><Num value={style.rule.thickness} onChange={(v) => set('rule.thickness', v)} min={0.4} max={4} step={0.2} unit="pt" /></Row>
                <Row label="Color"><ColorCtrl value={style.rule.color} onChange={(v) => set('rule.color', v)} allowEmpty emptyLabel="ink" /></Row>
              </>
            )}
          </Group>
          <BoxGroup cfg={cfg} blockId={blockId} set={set} />
        </>
      ) : (
        <>
          <Group label="Section title">
            {!custom && (
              <Row label="Text">
                <input className="sp-text" value={cfg.title} onChange={(e) => set(`sections.${blockId}.title`, e.target.value)} />
              </Row>
            )}
            <Row label="Show"><Toggle value={cfg.showTitle} onChange={(v) => set(`sections.${blockId}.showTitle`, v)} /></Row>
            <Row label="Color"><ColorCtrl value={cfg.titleColor} onChange={(v) => set(`sections.${blockId}.titleColor`, v)} allowEmpty emptyLabel="accent" /></Row>
          </Group>
          <Group label="Spacing & size">
            <Row label="Space ↑" title="Space above this section — inherits the document value until you change it">
              <NumInherit
                value={cfg.spacingBefore}
                inherited={style.section.spacingBefore}
                onChange={(v) => set(`sections.${blockId}.spacingBefore`, v)}
                min={0} max={30} unit="pt"
              />
            </Row>
            <Row label="Body size" title="Text size inside this section — inherits the document value until you change it">
              <NumInherit
                value={cfg.textSize}
                inherited={style.type.baseSize}
                onChange={(v) => set(`sections.${blockId}.textSize`, v)}
                min={7} max={13} step={0.5} unit="pt"
              />
            </Row>
          </Group>
          {blockId === 'skills' && (
            <Group label="Skills layout">
              <Row label="Mode" title="Auto: table when wide, stacked when in a narrow cell">
                <Seg
                  value={cfg.mode}
                  onChange={(v) => set('sections.skills.mode', v)}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'table', label: 'Table' },
                    { value: 'stacked', label: 'Stacked' },
                  ]}
                />
              </Row>
            </Group>
          )}
          {blockId === 'experience' && (
            <Group label="Bullets & rhythm">
              <BulletControls style={style} set={set} />
            </Group>
          )}
          <BoxGroup cfg={cfg} blockId={blockId} set={set} />
          {custom && (
            <button className="sp-reset sp-delete" onClick={deleteBlock}>
              ✗ Delete this section
            </button>
          )}
        </>
      )}
    </>
  )
}

function CellInspector({ style, setStyle, selection, setSelection }) {
  const row = style.grid.rows[selection.row]
  const cell = row?.cells[selection.cell]
  if (!cell) return <p className="sp-hint">This cell no longer exists.</p>
  return (
    <>
      <Group label="Cell">
        <Row label="Width">
          <Num value={cell.span} onChange={(v) => setStyle((p) => gridOps.setCellSpan(p, selection.row, selection.cell, v))} min={2} max={12} unit="/12" />
        </Row>
        <Row label="Blocks"><span className="sp-value">{cell.blocks.length ? cell.blocks.join(', ') : 'empty'}</span></Row>
        <button
          className="sp-reset sp-delete"
          onClick={() => {
            setSelection({ type: 'page' })
            setStyle((p) => gridOps.deleteCell(p, selection.row, selection.cell))
          }}
        >
          ✗ Delete cell{cell.blocks.length ? ' (blocks go to the tray)' : ''}
        </button>
      </Group>
      <Group label="Grid">
        <Row label="Gutter" title="Space between cells — the grid's column-gap">
          <Num value={style.grid.gutter} onChange={(v) => setStyle((p) => ({ ...structuredClone(p), grid: { ...structuredClone(p.grid), gutter: v } }))} min={6} max={40} unit="pt" />
        </Row>
      </Group>
    </>
  )
}

/* ── the panel ──────────────────────────────────────────────────── */

export function StylePanel({ style, setStyle, selection, setSelection, data, setData }) {
  const [tab, setTab] = useState('design') // design | advanced

  const set = (path, value) => {
    setStyle((prev) => {
      const next = structuredClone(prev)
      const keys = path.split('.')
      let obj = next
      for (const k of keys.slice(0, -1)) obj = obj[k]
      obj[keys.at(-1)] = value
      return next
    })
  }

  const activePreset = PRESETS.find((p) => JSON.stringify(p.style) === JSON.stringify(style))?.id
  const scoped = selection && selection.type !== 'page'
  const scopeName =
    selection?.type === 'block'
      ? BLOCK_META[selection.id]?.label ??
        (data.customSections || []).find((c) => c.id === selection.id)?.title ??
        'Section'
      : selection?.type === 'cell'
        ? `Cell ${selection.row + 1}.${selection.cell + 1}`
        : null

  return (
    <aside className="style-panel">
      <div className="sp-head">
        {scoped ? (
          <button className="sp-crumb" onClick={() => setSelection({ type: 'page' })} title="Back to document styles">
            <span className="sp-crumb-doc">Document</span> ▸ <span className="sp-crumb-sel">{scopeName}</span>
          </button>
        ) : (
          <span className="sp-title">Style</span>
        )}
        <div className="sp-tabs">
          <button className={tab === 'design' ? 'on' : ''} onClick={() => setTab('design')}>Design</button>
          <button className={tab === 'advanced' ? 'on' : ''} onClick={() => setTab('advanced')}>{'{ } '}Code</button>
        </div>
      </div>

      {tab === 'advanced' ? (
        <AdvancedEditor style={style} setStyle={setStyle} />
      ) : (
        <div className="sp-scroll">
          {selection?.type === 'block' ? (
            style.sections[selection.id] || selection.id === 'header' ? (
              <BlockInspector
                style={style}
                setStyle={setStyle}
                set={set}
                blockId={selection.id}
                data={data}
                setData={setData}
                setSelection={setSelection}
              />
            ) : (
              <p className="sp-hint">This section no longer exists.</p>
            )
          ) : selection?.type === 'cell' ? (
            <CellInspector style={style} setStyle={setStyle} selection={selection} setSelection={setSelection} />
          ) : (
            <>
              <div className="sp-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`sp-preset ${activePreset === p.id ? 'on' : ''}`}
                    title={p.hint}
                    onClick={() => setStyle(structuredClone(p.style))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <Group label="Page">
                <Row label="Size">
                  <Seg
                    value={style.page.size}
                    onChange={(v) => set('page.size', v)}
                    options={[{ value: 'LETTER', label: 'Letter' }, { value: 'A4', label: 'A4' }]}
                  />
                </Row>
                <BoxModel margin={style.page.margin} onChange={(m) => set('page.margin', m)} />
                <Row label="Paper">
                  <ColorCtrl value={style.page.background} onChange={(v) => set('page.background', v)} />
                </Row>
              </Group>

              <Group label="Grid">
                <Row label="Gutter" title="Space between cells — the grid's column-gap">
                  <Num value={style.grid.gutter} onChange={(v) => set('grid.gutter', v)} min={6} max={40} unit="pt" />
                </Row>
                <p className="sp-hint">Layout lives on the canvas — switch the center pane to Design to drag sections into cells, add rows, or use the sidebar shortcuts.</p>
              </Group>

              <Group label="Typography">
                <div className="sp-fonts">
                  {FONT_FAMILIES.map((f) => (
                    <button
                      key={f.id}
                      className={`sp-font ${style.type.family === f.id ? 'on' : ''} kind-${f.kind}`}
                      onClick={() => set('type.family', f.id)}
                    >
                      <span className="sp-font-sample">Ag</span>
                      <span className="sp-font-name">{f.label}</span>
                    </button>
                  ))}
                </div>
                <Row label="Body size">
                  <Num value={style.type.baseSize} onChange={(v) => set('type.baseSize', v)} min={7.5} max={12} step={0.5} unit="pt" />
                </Row>
                <Row label="Leading" title="Line height — the CSS line-height of body text">
                  <Num value={style.type.lineHeight} onChange={(v) => set('type.lineHeight', v)} min={1.15} max={1.9} step={0.05} />
                </Row>
              </Group>

              <Group label="Color">
                <Row label="Accent">
                  <div className="sp-swatches">
                    {ACCENT_SWATCHES.map((c) => (
                      <button key={c} className={`sp-swatch ${style.accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set('accent', c)} />
                    ))}
                  </div>
                </Row>
                <Row label="Custom"><ColorCtrl value={style.accent} onChange={(v) => set('accent', v)} /></Row>
                <Row label="Ink" title="Body text color"><ColorCtrl value={style.type.color} onChange={(v) => set('type.color', v)} /></Row>
                <Row label="Muted" title="Company names, dates, contact line"><ColorCtrl value={style.type.mutedColor} onChange={(v) => set('type.mutedColor', v)} /></Row>
              </Group>

              <Group label="Section titles" defaultOpen={false}>
                <Row label="Caps"><Toggle value={style.section.uppercase} onChange={(v) => set('section.uppercase', v)} /></Row>
                <Row label="Title size"><Num value={style.section.titleSize} onChange={(v) => set('section.titleSize', v)} min={7} max={13} step={0.5} unit="pt" /></Row>
                <Row label="Tracking"><Num value={style.section.letterSpacing} onChange={(v) => set('section.letterSpacing', v)} min={0} max={4} step={0.2} /></Row>
                <Row label="Space ↑"><Num value={style.section.spacingBefore} onChange={(v) => set('section.spacingBefore', v)} min={2} max={24} unit="pt" /></Row>
              </Group>

              <Group label="Bullets & Rhythm" defaultOpen={false}>
                <BulletControls style={style} set={set} />
              </Group>

              <button className="sp-reset" onClick={() => setStyle(structuredClone(defaultStyle))}>
                Reset style to default
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
