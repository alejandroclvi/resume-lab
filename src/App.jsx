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
import { TEMPLATES, templateDoc } from './data/templates.js'
import { listPdfs, addPdf, deletePdf } from './lib/pdfStore.js'
import { resolveProofText } from './lib/resolveProofText.js'
import manifest from './data/manifest.json'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// All state lives in the browser: documents in localStorage, uploaded PDFs
// in IndexedDB. No cookies are set or read anywhere in the app.
const DOCS_KEY = 'free-pdf-editor-docs-v1'
const LEGACY_DATA_KEY = 'resume-lab-draft-v1'
const LEGACY_STYLE_KEY = 'resume-lab-style-v1'

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return fallback
}

const uid = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const freshDoc = (name, templateId = 'resume') => ({
  id: uid(),
  name,
  ...templateDoc(name, templateId),
})

function loadStore() {
  const saved = loadJson(DOCS_KEY, null)
  if (saved?.docs?.length) {
    saved.docs = saved.docs.map((d) => ({ ...d, style: migrateStyle(d.style) }))
    return saved
  }
  // Migrate the pre-multi-document draft (single data+style pair) if present.
  const legacyData = loadJson(LEGACY_DATA_KEY, null)
  const legacyStyle = loadJson(LEGACY_STYLE_KEY, null)
  const doc = legacyData
    ? { id: uid(), name: legacyData.basics?.name || 'My resume', data: legacyData, style: migrateStyle(legacyStyle || defaultStyle) }
    : freshDoc('My resume')
  return { docs: [doc], activeId: doc.id }
}

export default function App() {
  const [mode, setMode] = useState('compose') // compose | gallery | compare
  const [store, setStore] = useState(loadStore)
  const [showStyle, setShowStyle] = useState(true)
  const [view, setView] = useState('proof') // proof | design (center pane)
  const [selection, setSelection] = useState({ type: 'page' })
  const [editorFocus, setEditorFocus] = useState(null) // {id, tick} → left pane scroll+flash
  const [inlineEdit, setInlineEdit] = useState(null) // { type, path, value, multiline, blockId, left, top, width }
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showBorders, setShowBorders] = useState(true) // toggle block/cell outlines in Design + Proof
  const previewRef = useRef(null)

  const activeDoc = store.docs.find((d) => d.id === store.activeId) ?? store.docs[0]
  const { data, style } = activeDoc

  const patchActive = (field, updater) =>
    setStore((s) => ({
      ...s,
      docs: s.docs.map((d) =>
        d.id === s.activeId
          ? { ...d, [field]: typeof updater === 'function' ? updater(d[field]) : updater }
          : d,
      ),
    }))

  const setData = (updater) => patchActive('data', updater)
  // Every style write goes through migration so the Code tab / imports can't
  // leave the grid in an invalid state (missing blocks, unknown ids).
  const setStyle = (updater) =>
    patchActive('style', (prev) => migrateStyle(typeof updater === 'function' ? updater(prev) : updater))

  // Apply an inline edit to either data or style by dotted path.
  const applyEdit = (type, path, value) => {
    const keys = path.split('.')
    const setter = type === 'data' ? setData : setStyle
    setter((prev) => {
      const next = structuredClone(prev)
      let obj = next
      for (const k of keys.slice(0, -1)) obj = obj[Array.isArray(obj) ? Number(k) : k]
      obj[keys.at(-1)] = value
      return next
    })
  }

  const commitInlineEdit = () => {
    if (!inlineEdit) return
    applyEdit(inlineEdit.type, inlineEdit.path, inlineEdit.value)
    setInlineEdit(null)
  }

  const startInlineEdit = (text, rect) => {
    const resolved = resolveProofText(text, data, style)
    if (!resolved) return
    const paneRect = previewRef.current?.getBoundingClientRect()
    if (!paneRect) return
    setInlineEdit({
      ...resolved,
      left: rect.left - paneRect.left,
      top: rect.top - paneRect.top,
      width: rect.width,
    })
    if (resolved.blockId) {
      setSelection({ type: 'block', id: resolved.blockId })
      setShowStyle(true)
    }
  }

  useEffect(() => {
    localStorage.setItem(DOCS_KEY, JSON.stringify(store))
  }, [store])

  const newDoc = (templateId) => {
    const d = freshDoc(`Untitled ${store.docs.length + 1}`, templateId)
    setStore((s) => ({ docs: [...s.docs, d], activeId: d.id }))
    setSelection({ type: 'page' })
    setMode('compose')
    setShowTemplatePicker(false)
  }

  const renameDoc = () => {
    const name = prompt('Document name', activeDoc.name)
    if (name?.trim()) patchActive('name', name.trim())
  }

  const deleteDoc = () => {
    if (!confirm(`Delete "${activeDoc.name}"? This removes it from this browser's storage permanently.`)) return
    setStore((s) => {
      const docs = s.docs.filter((d) => d.id !== s.activeId)
      if (!docs.length) {
        const d = freshDoc('My resume')
        return { docs: [d], activeId: d.id }
      }
      return { docs, activeId: docs[0].id }
    })
    setSelection({ type: 'page' })
  }

  // Uploaded reference PDFs (IndexedDB) — shown in Gallery/Compare alongside
  // any files shipped in public/resumes/ on a local install.
  const [stored, setStored] = useState([])
  useEffect(() => {
    listPdfs().then(setStored).catch(() => setStored([]))
  }, [])

  const onAddPdfs = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    for (const f of files) await addPdf(f)
    setStored(await listPdfs())
  }

  const onDeletePdf = async (rec) => {
    if (!confirm(`Delete "${rec.name}" from this browser's storage?`)) return
    await deletePdf(rec.id)
    setStored(await listPdfs())
    setCompareWith((c) => (c === rec.id ? null : c))
    setLightbox((l) => (l?.key === rec.id ? null : l))
  }

  const galleryItems = [
    ...manifest.map((r) => ({ key: r.file, file: r.file, name: r.name, bytes: r.bytes, deletable: false })),
    ...stored.map((s) => ({ key: s.id, file: s.blob, name: s.name, bytes: s.bytes, deletable: true, rec: s })),
  ]

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
  }, [store.activeId])

  // Selecting a block or cell also focuses that section's form in the left
  // pane — the same content, editable from either side.
  useEffect(() => {
    let id = null
    if (selection?.type === 'block') id = selection.id
    if (selection?.type === 'cell')
      id = style.grid.rows[selection.row]?.cells[selection.cell]?.blocks[0] ?? null
    if (!id) return
    setEditorFocus((prev) => ({ id, tick: (prev?.tick || 0) + 1 }))
  }, [selection])

  // Touching a block or cell pops the Style inspector open so its
  // configuration is right there — the same gesture that focuses the left
  // pane. (Closing the panel with ◧ Style is still respected until the next
  // canvas touch.)
  useEffect(() => {
    if (selection?.type === 'block' || selection?.type === 'cell') setShowStyle(true)
  }, [selection])

  // All placed blocks in reading order — powers the layers strip.
  const layerIds = style.grid.rows.flatMap((r) => r.cells.flatMap((c) => c.blocks))
  const unplacedIds = style.grid.unplaced || []
  const layerLabel = (id) =>
    isCustomId(id)
      ? (data.customSections || []).find((c) => c.id === id)?.title || 'Section'
      : BLOCK_META[id].label

  // Click-to-edit on the rendered proof: clicking any text opens a floating
  // editor at that exact spot, and also selects the block in the left pane.
  const onProofTextClick = (text, rect) => {
    startInlineEdit(text, rect)
  }
  const [draftBlob, setDraftBlob] = useState(null)
  const [pageCount, setPageCount] = useState(null)
  const [compareWith, setCompareWith] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const genSeq = useRef(0)

  const compareItem = galleryItems.find((r) => r.key === compareWith) ?? galleryItems[0] ?? null

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
        const blob = await pdf(<ResumePDF data={data} styleTokens={style} showBorders={showBorders} />).toBlob()
        if (genSeq.current === seq) setDraftBlob(blob)
      } catch (e) {
        console.error('pdf gen failed', e)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [data, style])

  const download = async () => {
    const blob = await pdf(<ResumePDF data={data} styleTokens={style} showBorders={showBorders} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = (data.basics.name || activeDoc.name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.download = `${slug}-resume.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    const payload = { _v: 2, data, style }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDoc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'document'}.json`
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
    if (confirm('Reset this document to the sample content? Your edits will be lost.')) setData(structuredClone(initialResume))
  }

  const clearDoc = () => {
    if (confirm('Clear this document to a blank resume? Your edits will be lost.')) {
      const t = templateDoc(activeDoc.name, 'resume')
      setData(t.data)
      setStyle(t.style)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">¶</span>
          <h1>Free <em>PDF</em> Editor</h1>
          <span className="brand-sub">open source · runs entirely in your browser</span>
        </div>
        <div className="docbar" title="Your documents — stored only in this browser">
          <select value={activeDoc.id} onChange={(e) => { setStore((s) => ({ ...s, activeId: e.target.value })); setSelection({ type: 'page' }) }}>
            {store.docs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button title="Rename this document" onClick={renameDoc}>✎</button>
          <button title="New document" onClick={() => setShowTemplatePicker(true)}>＋</button>
          <button title="Delete this document" className="danger" onClick={deleteDoc}>🗑</button>
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
          {mode === 'compose' && (
            <button
              className={`ghost border-toggle ${showBorders ? 'lit' : ''}`}
              title="Toggle block/cell borders on the canvas and proof"
              onClick={() => setShowBorders(!showBorders)}
            >
              {showBorders ? '⊡ borders on' : '⊟ borders off'}
            </button>
          )}
          <label className="ghost" title="Import a saved draft JSON">
            Import
            <input type="file" accept=".json" onChange={importJson} hidden />
          </label>
          <button className="ghost" onClick={exportJson}>Export</button>
          <button className="ghost" onClick={reset}>Reset</button>
          <button className="ghost" onClick={clearDoc}>Clear</button>
          <button className="primary" onClick={download}>↓ Download PDF</button>
        </div>
      </header>

      {mode === 'compose' && (
        <main className={`compose ${showStyle ? 'with-style' : ''}`}>
          <div className="pane pane-editor">
            <Editor data={data} setData={setData} focus={editorFocus} />
          </div>
          <div className="pane pane-preview" ref={previewRef}>
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
                showBorders={showBorders}
              />
            ) : draftBlob ? (
              <PdfCanvas file={draftBlob} width={620} allPages onTextClick={onProofTextClick} showBorders={showBorders} />
            ) : (
              <div className="pdf-loading">generating…</div>
            )}

            {inlineEdit && (
              <div
                className="inline-edit"
                style={{ left: inlineEdit.left, top: inlineEdit.top, minWidth: Math.max(inlineEdit.width, 140) }}
                onClick={(e) => e.stopPropagation()}
              >
                {inlineEdit.multiline ? (
                  <textarea
                    autoFocus
                    value={inlineEdit.value}
                    rows={Math.max(2, inlineEdit.value.split('\n').length)}
                    onChange={(e) => setInlineEdit((p) => ({ ...p, value: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        commitInlineEdit()
                      }
                      if (e.key === 'Escape') setInlineEdit(null)
                    }}
                    onBlur={commitInlineEdit}
                  />
                ) : (
                  <input
                    autoFocus
                    type="text"
                    value={inlineEdit.value}
                    onChange={(e) => setInlineEdit((p) => ({ ...p, value: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitInlineEdit()
                      }
                      if (e.key === 'Escape') setInlineEdit(null)
                    }}
                    onBlur={commitInlineEdit}
                  />
                )}
              </div>
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
          <label className="card add-card" title="PDFs you add are stored in this browser's IndexedDB — never uploaded">
            <span className="add-mark">＋</span>
            <span>Add reference PDFs</span>
            <em>stored in your browser only</em>
            <input type="file" accept="application/pdf" multiple hidden onChange={onAddPdfs} />
          </label>
          {galleryItems.map((r) => (
            <figure key={r.key} className="card" onClick={() => setLightbox(r)}>
              {r.deletable && (
                <button
                  className="card-delete"
                  title="Delete this PDF from your browser's storage"
                  onClick={(e) => { e.stopPropagation(); onDeletePdf(r.rec) }}
                >
                  ×
                </button>
              )}
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
              {galleryItems.length ? (
                <select value={compareItem?.key ?? ''} onChange={(e) => setCompareWith(e.target.value)}>
                  {galleryItems.map((r) => (
                    <option key={r.key} value={r.key}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <span>add a PDF in the Gallery to compare against</span>
              )}
            </div>
            {compareItem && <PdfCanvas file={compareItem.file} width={560} allPages />}
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

      {showTemplatePicker && (
        <div className="lightbox" onClick={() => setShowTemplatePicker(false)}>
          <div className="template-picker" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-head">
              <strong>Start from scratch</strong>
              <button onClick={() => setShowTemplatePicker(false)}>× close</button>
            </div>
            <p className="tp-hint">Pick a blank template. You can still edit everything — sections, layout, fonts, colors — afterwards.</p>
            <div className="tp-grid">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className="tp-card"
                  onClick={() => newDoc(t.id)}
                >
                  <span className="tp-icon">{t.icon}</span>
                  <span className="tp-name">{t.name}</span>
                  <span className="tp-desc">Blank {t.name.toLowerCase()} template</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="privacy-note">
        🔒 Private by design — your documents live only in this browser: drafts in <code>localStorage</code>, added PDFs in <code>IndexedDB</code>, both on your device. No cookies, no accounts, no analytics, no server. We collect nothing; your data never leaves your machine.
      </footer>
    </div>
  )
}
