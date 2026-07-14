// Map a string clicked on the live PDF proof back to the exact data/style
// path it came from, so the user can edit that text inline without opening
// the left pane.

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[-•·◦⦁\s]+/, '')
    .trim()
}

function blockIdFromPath(type, path, data) {
  if (type === 'style') return path.split('.')[2]
  if (path.startsWith('basics.')) return 'header'
  if (path.startsWith('summary')) return 'summary'
  if (path.startsWith('experience.')) return 'experience'
  if (path.startsWith('skills.')) return 'skills'
  if (path.startsWith('education.')) return 'education'
  if (path.startsWith('customSections.')) {
    const idx = Number(path.split('.')[1])
    return data.customSections?.[idx]?.id
  }
  return null
}

export function resolveProofText(text, data, style) {
  const t = normalize(text)
  if (!t || t.length < 2) return null

  const leaves = []
  const add = (type, path, value, multiline = false) => {
    if (value == null || value === '') return
    const v = normalize(value)
    if (!v) return
    leaves.push({ type, path, value: String(value), normalized: v, multiline, blockId: blockIdFromPath(type, path, data) })
  }

  // Header / basics
  add('data', 'basics.name', data.basics?.name)
  add('data', 'basics.title', data.basics?.title)
  add('data', 'basics.location', data.basics?.location)
  add('data', 'basics.phone', data.basics?.phone)
  add('data', 'basics.email', data.basics?.email)
  add('data', 'basics.linkedin', data.basics?.linkedin)
  add('data', 'basics.github', data.basics?.github)

  // Summary
  add('data', 'summary', data.summary, true)

  // Experience
  ;(data.experience || []).forEach((job, i) => {
    add('data', `experience.${i}.role`, job.role)
    add('data', `experience.${i}.company`, job.company)
    add('data', `experience.${i}.dates`, job.dates)
    ;(job.bullets || []).forEach((b, j) => add('data', `experience.${i}.bullets.${j}`, b, true))
  })

  // Skills
  ;(data.skills || []).forEach((sk, i) => {
    add('data', `skills.${i}.group`, sk.group)
    add('data', `skills.${i}.items`, sk.items)
  })

  // Education
  ;(data.education || []).forEach((ed, i) => {
    add('data', `education.${i}.degree`, ed.degree)
    add('data', `education.${i}.school`, ed.school)
    add('data', `education.${i}.dates`, ed.dates)
  })

  // Custom sections
  ;(data.customSections || []).forEach((c, i) => {
    add('data', `customSections.${i}.title`, c.title)
    add('data', `customSections.${i}.body`, c.body, true)
  })

  // Section titles from the style model
  Object.entries(style?.sections || {}).forEach(([id, sec]) => {
    if (sec?.title) add('style', `style.sections.${id}.title`, sec.title)
  })

  // 1) exact match
  for (const leaf of leaves) {
    if (leaf.normalized === t) return leaf
  }
  // 2) leaf contains the clicked text (e.g. clicked "PostgreSQL" inside a skills line)
  for (const leaf of leaves) {
    if (leaf.normalized.includes(t)) return leaf
  }
  // 3) clicked text contains the leaf (e.g. clicked a whole header line that includes the phone)
  for (const leaf of leaves) {
    if (t.includes(leaf.normalized) && leaf.normalized.length >= 3) return leaf
  }
  return null
}
