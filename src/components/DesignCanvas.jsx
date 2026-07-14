import { useEffect, useRef, useState } from 'react'
import { BLOCK_META, gridOps, isCustomId } from '../data/defaultStyle.js'

// The blueprint surface: a page-shaped canvas covered in small grid squares.
// Blocks are clickable (→ contextual inspector), draggable between cells,
// cells resize by their right edge, and dragging a rectangle on empty canvas
// DRAWS a new block snapped to the 12-column grid.
export function DesignCanvas({ style, setStyle, data, setData, selection, setSelection, showBorders = true }) {
  const [dragging, setDragging] = useState(null) // block id being dragged
  const [dropTarget, setDropTarget] = useState(null) // `${ri}:${ci}`
  const [ghost, setGhost] = useState(null) // {left,top,width,height} px — draw preview
  const marginsRef = useRef(null)
  const drawState = useRef(null)
  const justDrew = useRef(false) // swallow the synthetic click that follows a draw

  const a4 = style.page.size === 'A4'
  const pageRatio = a4 ? 842 / 595 : 792 / 612
  const [PAGE_W] = a4 ? [595, 842] : [612, 792] // pt
  const m = style.page.margin
  // CSS % padding is always width-relative, which matches the pt→px scale
  // on every side — so one converter serves all four margins.
  const pctW = (v) => `${(v / PAGE_W) * 100}%`

  // The blueprint is schematic (not to scale): the page grows with content
  // instead of pretending everything fits one sheet. One page is the minimum.
  const pageRef = useRef(null)
  const [minH, setMinH] = useState(0)
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setMinH(el.clientWidth * pageRatio))
    ro.observe(el)
    return () => ro.disconnect()
  }, [pageRatio])

  const blockLabel = (id) =>
    isCustomId(id)
      ? (data.customSections || []).find((c) => c.id === id)?.title || 'Section'
      : BLOCK_META[id].label

  const blockIcon = (id) => (isCustomId(id) ? '✚' : BLOCK_META[id].icon)

  // real content, so the canvas reads like the document
  const blockPreview = (id) => {
    switch (id) {
      case 'header': return `${data.basics.name} — ${data.basics.title}`
      case 'summary': return data.summary
      case 'experience': return data.experience.map((j) => `${j.role} · ${j.company}`).join('  /  ')
      case 'skills': return data.skills.map((sk) => sk.group).join(' · ')
      case 'education': return data.education.map((e) => `${e.degree}, ${e.school}`).join('  /  ')
      default: return (data.customSections || []).find((c) => c.id === id)?.body || ''
    }
  }

  /* ── drag blocks between cells ── */

  const onDrop = (ri, ci) => (e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/block-id')
    if (id) setStyle((prev) => gridOps.moveBlockToCell(prev, id, ri, ci))
    setDragging(null)
    setDropTarget(null)
  }

  /* ── draw-to-create ── */

  const relPoint = (e) => {
    const r = marginsRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, rect: r }
  }

  const startDraw = (e) => {
    // only bare canvas — not blocks, cells, buttons
    if (e.target !== marginsRef.current) return
    if (e.button !== 0) return
    e.preventDefault()
    const p = relPoint(e)
    drawState.current = { x0: p.x, y0: p.y }
    const onMove = (ev) => {
      const q = relPoint(ev)
      const colW = q.w / 12
      const x0 = Math.min(drawState.current.x0, q.x)
      const x1 = Math.max(drawState.current.x0, q.x)
      const startCol = Math.max(0, Math.min(11, Math.floor(x0 / colW)))
      const endCol = Math.max(0, Math.min(11, Math.floor(x1 / colW)))
      setGhost({
        left: startCol * colW,
        width: (endCol - startCol + 1) * colW,
        top: Math.min(drawState.current.y0, q.y),
        height: Math.abs(q.y - drawState.current.y0),
        startCol,
        span: endCol - startCol + 1,
      })
    }
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const q = relPoint(ev)
      const colW = q.w / 12
      const x0 = Math.min(drawState.current.x0, q.x)
      const x1 = Math.max(drawState.current.x0, q.x)
      const startCol = Math.max(0, Math.min(11, Math.floor(x0 / colW)))
      const endCol = Math.max(0, Math.min(11, Math.floor(x1 / colW)))
      const span = Math.max(2, endCol - startCol + 1)
      const y0 = drawState.current.y0
      const moved = Math.abs(x1 - x0) > 12 || Math.abs(q.y - y0) > 12
      setGhost(null)
      drawState.current = null
      if (!moved) return // it was just a click on empty canvas
      // insertion row = how many rows end above the drawn top
      const yTop = Math.min(y0, q.y)
      const rowEls = marginsRef.current.querySelectorAll(':scope > .design-row')
      let insertIdx = rowEls.length
      for (let i = 0; i < rowEls.length; i++) {
        const rr = rowEls[i].getBoundingClientRect()
        if (yTop < rr.top - q.rect.top + rr.height / 2) { insertIdx = i; break }
      }
      const id = `custom-${Date.now().toString(36)}`
      setData((prev) => ({
        ...prev,
        customSections: [
          ...(prev.customSections || []),
          { id, title: 'New Section', body: 'Write anything here.\n- lines starting with “- ” become bullets' },
        ],
      }))
      setStyle((prev) => gridOps.insertDrawnBlock(prev, insertIdx, Math.min(startCol, 12 - span), span, id))
      setSelection({ type: 'block', id })
      justDrew.current = true
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /* ── cell edge-resize ── */

  const startResize = (ri, ci) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startSpan = style.grid.rows[ri].cells[ci].span
    const colW = marginsRef.current.getBoundingClientRect().width / 12
    const onMove = (ev) => {
      const dSpan = Math.round((ev.clientX - startX) / colW)
      const target = Math.max(2, Math.min(12, startSpan + dSpan))
      setStyle((prev) =>
        prev.grid.rows[ri]?.cells[ci]?.span === target ? prev : gridOps.setCellSpan(prev, ri, ci, target),
      )
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isSel = (kind, a, b) =>
    selection?.type === kind &&
    (kind === 'block' ? selection.id === a : selection.row === a && selection.cell === b)

  return (
    <div className={`design-wrap ${showBorders ? '' : 'no-borders'}`}>
      <div className="design-toolbar">
        <span className="dt-hint">blueprint — not to scale · click to select · drag between cells · draw to create</span>
        <div className="dt-actions">
          <button onClick={() => setStyle((p) => gridOps.makeSidebar(p, 'left'))} title="Skills + education sidebar on the left">⫷ sidebar</button>
          <button onClick={() => setStyle((p) => gridOps.makeSidebar(p, 'right'))} title="Skills + education sidebar on the right">sidebar ⫸</button>
          <button onClick={() => setStyle((p) => gridOps.resetGrid(p))} title="Back to one column">▤ single</button>
        </div>
      </div>

      <div
        ref={pageRef}
        className="design-page"
        style={{
          minHeight: minH || undefined,
          paddingTop: pctW(m.top),
          paddingRight: pctW(m.right),
          paddingBottom: pctW(m.bottom),
          paddingLeft: pctW(m.left),
        }}
        onClick={() => {
          if (justDrew.current) {
            justDrew.current = false
            return
          }
          setSelection({ type: 'page' })
        }}
      >
        <div
          ref={marginsRef}
          className={`design-margins ${ghost ? 'drawing' : ''}`}
          onMouseDown={startDraw}
        >
          {style.grid.rows.map((row, ri) => {
            const totalSpan = row.cells.reduce((a, c) => a + c.span, 0) || 12
            return (
              <div className="design-row" key={row.id}>
                <div className="design-row-cells" style={{ gap: `${style.grid.gutter / 6}%` }}>
                  {row.cells.map((cell, ci) => {
                    const key = `${ri}:${ci}`
                    return (
                      <div
                        key={cell.id}
                        className={[
                          'design-cell',
                          dropTarget === key ? 'droppable' : '',
                          dragging ? 'drag-live' : '',
                          isSel('cell', ri, ci) ? 'selected' : '',
                        ].join(' ')}
                        style={{ flexGrow: cell.span / totalSpan, flexBasis: 0 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelection({ type: 'cell', row: ri, cell: ci })
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDropTarget(key)
                        }}
                        onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
                        onDrop={onDrop(ri, ci)}
                      >
                        <span className="cell-span">{cell.span}</span>
                        {cell.blocks.map((b) => (
                          <div
                            key={b}
                            draggable
                            className={`design-block ${isSel('block', b) ? 'selected' : ''} ${dragging === b ? 'ghost' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelection({ type: 'block', id: b })
                            }}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/block-id', b)
                              e.dataTransfer.effectAllowed = 'move'
                              setDragging(b)
                              setSelection({ type: 'block', id: b })
                            }}
                            onDragEnd={() => {
                              setDragging(null)
                              setDropTarget(null)
                            }}
                          >
                            <div className="block-head">
                              <span className="block-icon">{blockIcon(b)}</span>
                              <span className="block-name">{blockLabel(b)}</span>
                              <button
                                className="block-x"
                                title="Remove from the page (kept in the tray below)"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStyle((p) => gridOps.unplaceBlock(p, b))
                                }}
                              >
                                ×
                              </button>
                              <span className="block-grip">⠿</span>
                            </div>
                            <div className="block-preview">{blockPreview(b)}</div>
                          </div>
                        ))}
                        {cell.blocks.length === 0 && <div className="cell-empty">empty — drop here</div>}
                        <button
                          className="cell-x"
                          title="Delete this cell (its blocks go to the tray)"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelection({ type: 'page' })
                            setStyle((p) => gridOps.deleteCell(p, ri, ci))
                          }}
                        >
                          ×
                        </button>
                        <div className="cell-resize" title="Drag to resize (columns)" onMouseDown={startResize(ri, ci)} />
                      </div>
                    )
                  })}
                  {row.cells.length < 4 && (
                    <button
                      className="add-cell"
                      title="Add a cell to this row (e.g. a sidebar)"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStyle((p) => gridOps.addCell(p, ri))
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="row-tools">
                  <button
                    title="Add a row below"
                    onClick={(e) => {
                      e.stopPropagation()
                      setStyle((p) => gridOps.addRow(p, ri))
                    }}
                  >
                    + row
                  </button>
                  <button
                    className="danger"
                    title="Delete this row (its blocks go to the tray)"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelection({ type: 'page' })
                      setStyle((p) => gridOps.deleteRow(p, ri))
                    }}
                  >
                    × row
                  </button>
                </div>
              </div>
            )
          })}
          {ghost && (
            <div
              className="draw-ghost"
              style={{ left: ghost.left, top: ghost.top, width: ghost.width, height: Math.max(ghost.height, 8) }}
            >
              <span>{ghost.span} col{ghost.span > 1 ? 's' : ''} — new section</span>
            </div>
          )}
        </div>
      </div>

      {(style.grid.unplaced || []).length > 0 && (
        <div className="tray">
          <span className="tray-label">off the page — drag back on</span>
          <div className="tray-items">
            {style.grid.unplaced.map((b) => (
              <div
                key={b}
                draggable
                className={`tray-chip ${isSel('block', b) ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelection({ type: 'block', id: b })
                }}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/block-id', b)
                  e.dataTransfer.effectAllowed = 'move'
                  setDragging(b)
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setDropTarget(null)
                }}
              >
                <span className="block-icon">{blockIcon(b)}</span> {blockLabel(b)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
