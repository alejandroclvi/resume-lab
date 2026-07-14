import { useState } from 'react'

function Section({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="ed-section">
      <button className="ed-section-head" onClick={() => setOpen(!open)}>
        <span className="tick">{open ? '−' : '+'}</span> {label}
      </button>
      {open && <div className="ed-section-body">{children}</div>}
    </section>
  )
}

function Field({ label, value, onChange, textarea = false, rows = 3 }) {
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

export function Editor({ data, setData }) {
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
      <Section label="Basics">
        <Field label="Name" value={data.basics.name} onChange={(v) => set('basics.name', v)} />
        <Field label="Headline" value={data.basics.title} onChange={(v) => set('basics.title', v)} />
        <div className="grid2">
          <Field label="Location" value={data.basics.location} onChange={(v) => set('basics.location', v)} />
          <Field label="Phone" value={data.basics.phone} onChange={(v) => set('basics.phone', v)} />
          <Field label="Email" value={data.basics.email} onChange={(v) => set('basics.email', v)} />
          <Field label="LinkedIn" value={data.basics.linkedin} onChange={(v) => set('basics.linkedin', v)} />
          <Field label="GitHub" value={data.basics.github} onChange={(v) => set('basics.github', v)} />
        </div>
      </Section>

      <Section label="Summary">
        <Field label="Professional summary" textarea rows={5} value={data.summary} onChange={(v) => set('summary', v)} />
      </Section>

      <Section label="Experience">
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
          </div>
        ))}
        <button className="add" onClick={() => add('experience', { role: '', company: '', dates: '', bullets: [''] })}>
          + Add position
        </button>
      </Section>

      <Section label="Technical Skills">
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
          </div>
        ))}
        <button className="add" onClick={() => add('skills', { group: '', items: '' })}>+ Add skill group</button>
      </Section>

      <Section label="Education">
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
          </div>
        ))}
        <button className="add" onClick={() => add('education', { degree: '', school: '', dates: '' })}>+ Add education</button>
      </Section>
    </div>
  )
}
