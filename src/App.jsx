import { useEffect, useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { pdfjs } from 'react-pdf'
import { ResumePDF } from './pdf/ResumePDF.jsx'
import { Editor } from './components/Editor.jsx'
import { StylePanel } from './components/StylePanel.jsx'
import { DesignCanvas } from './components/DesignCanvas.jsx'
import { PdfCanvas } from './components/PdfCanvas.jsx'
import { initialResume } from './data/initialResume.js'
import { defaultStyle, migrateStyle, BLOCK_META, isCustomId, gridOps } from './data/defaultStyle.js'
import manifest from './data/manifest.json'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const STORAGE_KEY = 'resume-lab-draft-v1'
const STYLE_KEY = 'resume-lab-style-v1'

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return fallback
}

export default function App() {
  const [mode, setMode] = useState('compose') // compose | gallery | compare
  const [data, setData] = useState(() => loadJson(STORAGE_KEY, initialResume))
  const [style, setStyleRaw] = useState(() => migrateStyle(loadJson(STYLE_KEY, defaultStyle)))
  const [showStyle, setShowStyle] = useState(true)
  const [view, setView] = useState('proof') // proof | design (center pane)
  const [selection, setSelection] = useState({ type: 'page' })

  // Every style write goes through migration so the Code tab / imports can't
  // leave the grid in an invalid state (missing blocks, unknown ids).
  const setStyle = (updater) =>
    setStyleRaw((prev) => migrateStyle(typeof updater === 'function' ? updater(prev) : updater))

  // Esc clears the selection; Delete/Backspace removes the selected
  // block (to the tray), cell, or row — unless typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelection({ type: 'page' })
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      setSelection((sel) => {
        if (sel?.type === 'block') {
          setStyle((p) => gridOps.unplaceBlock(p, sel.id))
          return sel // keep it selected in the tray
        }
        if (sel?.type === 'cell') {
          setStyle((p) => gridOps.deleteCell(p, sel.row, sel.cell))
          return { type: 'page' }
        }
        return sel
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // All placed blocks in reading order — powers the layers strip.
  const layerIds = style.grid.rows.flatMap((r) => r.cells.flatMap((c) => c.blocks))
  const unplacedIds = style.grid.unplaced || []
  const layerLabel = (id) =>
    isCustomId(id)
      ? (data.customSections || []).find((c) => c.id === id)?.title || 'Section'
      : BLOCK_META[id].label

  // Click-to-select on the rendered proof: map the clicked text-layer string
  // back to the section whose content contains it.
  const classifyProofText = (text) => {
    const t = text.toLowerCase().replace(/\s+/g, ' ').trim()
    if (t.length < 2) return null
    const corpora = [
      ...(data.customSections || []).map((c) => [c.id, `${c.title} ${c.body}`]),
      ['education', [style.sections.education?.title, ...data.education.flatMap((e) => [e.degree, e.school, e.dates])].join(' ')],
      ['skills', [style.sections.skills?.title, ...data.skills.flatMap((s) => [s.group, s.items])].join(' ')],
      ['experience', [style.sections.experience?.title, ...data.experience.flatMap((j) => [j.role, j.company, j.dates, ...j.bullets])].join(' ')],
      ['summary', `${style.sections.summary?.title} ${data.summary}`],
      ['header', Object.values(data.basics).join(' ')],
    ]
    for (const [id, corpus] of corpora) {
      if (corpus.toLowerCase().replace(/\s+/g, ' ').includes(t)) return id
    }
    return null
  }

  const onProofTextClick = (text) => {
    const id = classifyProofText(text)
    if (id) {
      setSelection({ type: 'block', id })
      setShowStyle(true)
    }
  }
  const [draftBlob, setDraftBlob] = useState(null)
  const [pageCount, setPageCount] = useState(null)
  const [compareWith, setCompareWith] = useState(manifest[0]?.file ?? null)
  const [lightbox, setLightbox] = useState(null)
  const genSeq = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    localStorage.setItem(STYLE_KEY, JSON.stringify(style))
  }, [style])

  // Real page count of the rendered PDF — shown next to the view switch so
  // Design (schematic) and Proof (true pages) can't drift silently.
  useEffect(() => {
    if (!draftBlob) return
    let stale = false
    draftBlob
      .arrayBuffer()
      .then((buf) => pdfjs.getDocument({ data: buf }).promise)
      .then((doc) => {
        if (!stale) setPageCount(doc.numPages)
        doc.destroy()
      })
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [draftBlob])

  // Debounced live PDF generation — re-runs on content OR style change.
  useEffect(() => {
    const seq = ++genSeq.current
    const t = setTimeout(async () => {
      try {
        const blob = await pdf(<ResumePDF data={data} styleTokens={style} />).toBlob()
        if (genSeq.current === seq) setDraftBlob(blob)
      } catch (e) {
        console.error('pdf gen failed', e)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [data, style])

  const download = async () => {
    const blob = await pdf(<ResumePDF data={data} styleTokens={style} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = (data.basics.name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.download = `${slug}-resume.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    const payload = { _v: 2, data, style }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume-draft.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((t) => {
      const parsed = JSON.parse(t)
      if (parsed._v === 2) {
        setData(parsed.data)
        setStyle(parsed.style)
      } else {
        setData(parsed) // v1 exports were content-only
      }
    })
    e.target.value = ''
  }

  const reset = () => {
    if (confirm('Reset draft content to the seeded resume? Your edits will be lost.')) setData(initialResume)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">¶</span>
          <h1>Resume<em>Lab</em></h1>
          <span className="brand-sub">free open-source pdf editor{manifest.length ? ` · ${manifest.length} collected` : ''}</span>
        </div>
        <nav className="modes">
          {[
            ['compose', 'Compose'],
            ['gallery', 'Gallery'],
            ['compare', 'Compare'],
          ].map(([key, label]) => (
            <button key={key} className={mode === key ? 'on' : ''} onClick={() => setMode(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="actions">
          {mode === 'compose' && (
            <button
              className={`ghost style-toggle ${showStyle ? 'lit' : ''}`}
              title="Toggle the Style inspector"
              onClick={() => setShowStyle(!showStyle)}
            >
              ◧ Style
            </button>
          )}
          <label className="ghost" title="Import a saved draft JSON">
            Import
            <input type="file" accept=".json" onChange={importJson} hidden />
          </label>
          <button className="ghost" onClick={exportJson}>Export</button>
          <button className="ghost" onClick={reset}>Reset</button>
          <button className="primary" onClick={download}>↓ Download PDF</button>
        </div>
      </header>

      {mode === 'compose' && (
        <main className={`compose ${showStyle ? 'with-style' : ''}`}>
          <div className="pane pane-editor">
            <Editor data={data} setData={setData} />
          </div>
          <div className="pane pane-preview">
            <div className="preview-chrome">
              <div className="view-switch">
                <button className={view === 'design' ? 'on' : ''} onClick={() => setView('design')} title="Blueprint grid — arrange sections">
                  ▦ Design
                </button>
                <button className={view === 'proof' ? 'on' : ''} onClick={() => setView('proof')} title="The real rendered PDF">
                  ¶ Proof
                </button>
              </div>
              {pageCount != null && (
                <button
                  className={`page-badge ${pageCount > 1 ? 'multi' : ''}`}
                  title="Pages in the real PDF — click to see the proof"
                  onClick={() => setView('proof')}
                >
                  {pageCount} page{pageCount > 1 ? 's' : ''}
                </button>
              )}
              <div className="layers" title="Select an element to edit only its styles">
                {[...layerIds, ...unplacedIds].map((id) => (
                  <button
                    key={id}
                    className={[
                      selection?.type === 'block' && selection.id === id ? 'on' : '',
                      unplacedIds.includes(id) ? 'off-page' : '',
                    ].join(' ')}
                    title={unplacedIds.includes(id) ? 'Off the page — in the tray' : undefined}
                    onClick={() => {
                      setSelection({ type: 'block', id })
                      setShowStyle(true)
                    }}
                  >
                    {layerLabel(id)}
                  </button>
                ))}
              </div>
            </div>
            {view === 'design' ? (
              <DesignCanvas
                style={style}
                setStyle={setStyle}
                data={data}
                setData={setData}
                selection={selection}
                setSelection={setSelection}
              />
            ) : draftBlob ? (
              <PdfCanvas file={draftBlob} width={620} allPages onTextClick={onProofTextClick} />
            ) : (
              <div className="pdf-loading">generating…</div>
            )}
          </div>
          {showStyle && (
            <StylePanel
              style={style}
              setStyle={setStyle}
              selection={selection}
              setSelection={setSelection}
              data={data}
              setData={setData}
            />
          )}
        </main>
      )}

      {mode === 'gallery' && (
        <main className="gallery">
          {manifest.map((r) => (
            <figure key={r.file} className="card" onClick={() => setLightbox(r)}>
              <div className="thumb">
                <PdfCanvas file={r.file} width={264} />
              </div>
              <figcaption>
                <strong>{r.name}</strong>
                <span>{(r.bytes / 1024).toFixed(0)} KB</span>
              </figcaption>
            </figure>
          ))}
        </main>
      )}

      {mode === 'compare' && (
        <main className="compare">
          <div className="pane">
            <div className="pane-label accent">your draft</div>
            {draftBlob ? <PdfCanvas file={draftBlob} width={560} allPages /> : <div className="pdf-loading">generating…</div>}
          </div>
          <div className="pane">
            <div className="pane-label">
              <select value={compareWith ?? ''} onChange={(e) => setCompareWith(e.target.value)}>
                {manifest.map((r) => (
                  <option key={r.file} value={r.file}>{r.name}</option>
                ))}
              </select>
            </div>
            {compareWith && <PdfCanvas file={compareWith} width={560} allPages />}
          </div>
        </main>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-head">
              <strong>{lightbox.name}</strong>
              <button onClick={() => setLightbox(null)}>× close</button>
            </div>
            <PdfCanvas file={lightbox.file} width={760} allPages />
          </div>
        </div>
      )}
    </div>
  )
}
