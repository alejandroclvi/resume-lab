import { useEffect, useRef, useState } from 'react'

function Section({ label, children, defaultOpen = true, focusSignal = 0 }) {
  const [open, setOpen] = useState(defaultOpen)
  const [flash, setFlash] = useState(false)
  const ref = useRef(null)
  // Selecting this section's block on the canvas/proof scrolls its form into
  // view, expands it, and flashes it so the two panes stay visibly linked.
  useEffect(() => {
    if (!focusSignal) return
    setOpen(true)
    setFlash(true)
    const raf = requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
    const t = setTimeout(() => setFlash(false), 1400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [focusSignal])
  return (
    <section ref={ref} className={`ed-section ${flash ? 'focused' : ''}`}>
      <button className="ed-section-head" onClick={() => setOpen(!open)}>
        <span className="tick">{open ? '−' : '+'}</span> {label}
      </button>
      {open && <div className="ed-section-body">{children}</div>}
    </section>
  )
}

function Field({ label, value, onChange, textarea = false, rows = 3, multilineKeyCommit = false }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {textarea ? (
        <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

// User-defined fields inside a block. Each has a label + value; both are
// editable, reorderable, and render in the PDF. A user can also pick *where*
// the field renders (inline, header area, hidden for storage).
function DynamicFields({ items, onChange }) {
  const ensure = () => items || []
  const update = (idx, patch) => onChange(ensure().map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  const add = () => onChange([...ensure(), { label: '', value: '', render: 'inline' }])
  const remove = (idx) => onChange(ensure().filter((_, i) => i !== idx))
  const move = (idx, dir) => {
    const list = ensure()
    const j = idx + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  const renderOptions = [
    { value: 'inline', label: 'inline' },
    { value: 'header', label: 'header' },
    { value: 'hidden', label: 'hidden' },
  ]

  return (
    <div className="dynamic-fields">
      {ensure().map((f, i) => (
        <div className="dyn-field" key={i}>
          <input
            className="dyn-label"
            placeholder="field name"
            value={f.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className="dyn-value"
            placeholder="value"
            value={f.value}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <select
            className="dyn-render"
            value={f.render || 'inline'}
            onChange={(e) => update(i, { render: e.target.value })}
            title="Where this field renders"
          >
            {renderOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="dyn-controls">
            <button title="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button title="Move down" onClick={() => move(i, 1)} disabled={i === ensure().length - 1}>↓</button>
            <button className="dyn-remove" title="Remove field" onClick={() => remove(i)}>×</button>
          </div>
        </div>
      ))}
      <button className="dyn-add" onClick={add}>+ Add field</button>
      <p className="dyn-hint">Render: inline (with the entry), header (only for basics), or hidden (stored, not printed). Use the ↑/↓ arrows to reorder fields.</p>
    </div>
  )
}

// Block ids (as used on the canvas/proof) → which editor section holds
// that content. Custom sections are edited in the Style inspector instead.
const FOCUS_MAP = {
  header: 'basics',
  summary: 'summary',
  experience: 'experience',
  skills: 'skills',
  education: 'education',
}

export function Editor({ data, setData, focus }) {
  const sig = (key) => (focus && FOCUS_MAP[focus.id] === key ? focus.tick : 0)
  const set = (path, value) => {
    setData((prev) => {
      const next = structuredClone(prev)
      const keys = path.split('.')
      let obj = next
      for (const k of keys.slice(0, -1)) obj = obj[Array.isArray(obj) ? Number(k) : k]
      obj[keys.at(-1)] = value
      return next
    })
  }

  const move = (listKey, i, dir) => {
    setData((prev) => {
      const next = structuredClone(prev)
      const list = next[listKey]
      const j = i + dir
      if (j < 0 || j >= list.length) return prev
      ;[list[i], list[j]] = [list[j], list[i]]
      return next
    })
  }

  const remove = (listKey, i) =>
    setData((prev) => {
      const next = structuredClone(prev)
      next[listKey].splice(i, 1)
      return next
    })

  const add = (listKey, blank) =>
    setData((prev) => {
      const next = structuredClone(prev)
      next[listKey].push(blank)
      return next
    })

  const listControls = (listKey, i) => (
    <div className="row-controls">
      <button title="Move up" onClick={() => move(listKey, i, -1)}>↑</button>
      <button title="Move down" onClick={() => move(listKey, i, 1)}>↓</button>
      <button title="Remove" className="danger" onClick={() => remove(listKey, i)}>×</button>
    </div>
  )

  return (
    <div className="editor">
      <Section label="Basics" focusSignal={sig('basics')}>
        <Field label="Name" value={data.basics.name} onChange={(v) => set('basics.name', v)} />
        <Field label="Headline" value={data.basics.title} onChange={(v) => set('basics.title', v)} />
        <div className="grid2">
          <Field label="Location" value={data.basics.location} onChange={(v) => set('basics.location', v)} />
          <Field label="Phone" value={data.basics.phone} onChange={(v) => set('basics.phone', v)} />
          <Field label="Email" value={data.basics.email} onChange={(v) => set('basics.email', v)} />
          <Field label="LinkedIn" value={data.basics.linkedin} onChange={(v) => set('basics.linkedin', v)} />
          <Field label="GitHub" value={data.basics.github} onChange={(v) => set('basics.github', v)} />
        </div>
        <DynamicFields
          items={data.basics.customFields}
          onChange={(v) => set('basics.customFields', v)}
        />
      </Section>

      <Section label="Summary" focusSignal={sig('summary')}>
        <Field label="Professional summary" textarea rows={5} value={data.summary} onChange={(v) => set('summary', v)} />
      </Section>

      <Section label="Experience" focusSignal={sig('experience')}>
        {data.experience.map((job, i) => (
          <div className="entry" key={i}>
            <div className="entry-head">
              <span className="entry-n">{String(i + 1).padStart(2, '0')}</span>
              {listControls('experience', i)}
            </div>
            <Field label="Role" value={job.role} onChange={(v) => set(`experience.${i}.role`, v)} />
            <div className="grid2">
              <Field label="Company" value={job.company} onChange={(v) => set(`experience.${i}.company`, v)} />
              <Field label="Dates" value={job.dates} onChange={(v) => set(`experience.${i}.dates`, v)} />
            </div>
            <Field
              label="Bullets — one per line"
              textarea
              rows={Math.max(4, job.bullets.length + 1)}
              value={job.bullets.join('\n')}
              onChange={(v) => set(`experience.${i}.bullets`, v.split('\n'))}
            />
            <DynamicFields
              items={job.customFields}
              onChange={(v) => set(`experience.${i}.customFields`, v)}
            />
          </div>
        ))}
        <button className="add" onClick={() => add('experience', { role: '', company: '', dates: '', bullets: [''], customFields: [] })}>
          + Add position
        </button>
      </Section>

      <Section label="Technical Skills" focusSignal={sig('skills')}>
        {data.skills.map((sk, i) => (
          <div className="entry" key={i}>
            <div className="entry-head">
              <span className="entry-n">{String(i + 1).padStart(2, '0')}</span>
              {listControls('skills', i)}
            </div>
            <div className="grid2">
              <Field label="Group" value={sk.group} onChange={(v) => set(`skills.${i}.group`, v)} />
              <Field label="Items" value={sk.items} onChange={(v) => set(`skills.${i}.items`, v)} />
            </div>
            <DynamicFields
              items={sk.customFields}
              onChange={(v) => set(`skills.${i}.customFields`, v)}
            />
          </div>
        ))}
        <button className="add" onClick={() => add('skills', { group: '', items: '', customFields: [] })}>+ Add skill group</button>
      </Section>

      <Section label="Education" focusSignal={sig('education')}>
        {data.education.map((ed, i) => (
          <div className="entry" key={i}>
            <div className="entry-head">
              <span className="entry-n">{String(i + 1).padStart(2, '0')}</span>
              {listControls('education', i)}
            </div>
            <Field label="Degree" value={ed.degree} onChange={(v) => set(`education.${i}.degree`, v)} />
            <div className="grid2">
              <Field label="School" value={ed.school} onChange={(v) => set(`education.${i}.school`, v)} />
              <Field label="Dates" value={ed.dates} onChange={(v) => set(`education.${i}.dates`, v)} />
            </div>
            <DynamicFields
              items={ed.customFields}
              onChange={(v) => set(`education.${i}.customFields`, v)}
            />
          </div>
        ))}
        <button className="add" onClick={() => add('education', { degree: '', school: '', dates: '', customFields: [] })}>+ Add education</button>
      </Section>
    </div>
  )
}
