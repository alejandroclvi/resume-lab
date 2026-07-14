import { Document, Page, Text, View } from '@react-pdf/renderer'
import { fontFor } from './fonts.js'
import { defaultStyle } from '../data/defaultStyle.js'

// Styles are computed from the style-token tree on every render, so the
// inspector's edits map directly onto CSS properties here.
function makeStyles(st) {
  const accent = st.accent
  const ruleColor = st.rule.color || st.type.color
  return {
    page: {
      ...fontFor(st.type.family),
      fontSize: st.type.baseSize,
      lineHeight: st.type.lineHeight,
      color: st.type.color,
      backgroundColor: st.page.background,
      paddingTop: st.page.margin.top,
      paddingBottom: st.page.margin.bottom,
      paddingLeft: st.page.margin.left,
      paddingRight: st.page.margin.right,
    },
    name: {
      ...fontFor(st.type.family, true),
      fontSize: st.name.size,
      // explicit: inherited line-height resolves against the BODY size and
      // makes big names overlap the headline
      lineHeight: 1.15,
      letterSpacing: st.name.letterSpacing,
      textAlign: st.name.align,
      color: st.name.color || st.type.color,
      marginBottom: st.name.spacingAfter || 0,
    },
    title: {
      ...fontFor(st.type.family, true),
      fontSize: st.headline.size,
      lineHeight: 1.25,
      color: st.headline.color || accent,
      marginTop: 2,
      textAlign: st.name.align,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 6,
      justifyContent: st.name.align === 'center' ? 'center' : 'flex-start',
    },
    contact: { fontSize: st.type.baseSize - 1, color: st.type.mutedColor },
    dot: { fontSize: st.type.baseSize - 1, color: accent },
    rule: st.rule.show
      ? { borderBottomWidth: st.rule.thickness, borderBottomColor: ruleColor, marginTop: 10 }
      : { marginTop: 4 },
    jobHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: st.entry.spacing },
    role: { ...fontFor(st.type.family, true), fontSize: st.type.baseSize + 1 },
    company: { fontSize: st.type.baseSize, color: st.type.mutedColor, marginBottom: 2 },
    dates: { fontSize: st.type.baseSize - 1, color: st.type.mutedColor },
    bulletRow: { flexDirection: 'row', marginBottom: st.bullets.gap, paddingRight: 6 },
    bulletMark: { width: st.bullets.indent, color: st.bullets.markerColor || accent },
    bulletText: { flex: 1 },
    skillGroup: { ...fontFor(st.type.family, true), fontSize: st.type.baseSize - 0.5 },
    skillRow: { flexDirection: 'row', marginBottom: 2 },
    skillGroupCol: { width: 110 },
    skillItems: { flex: 1 },
    skillBlock: { marginBottom: 5 },
    eduRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    customField: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
    customLabel: { fontSize: st.type.baseSize - 1, color: st.type.mutedColor, fontStyle: 'italic' },
    customValue: { fontSize: st.type.baseSize - 0.5, color: st.type.color },
  }
}

// Section title style with per-section overrides applied.
function titleStyle(st, s, cfg) {
  return {
    ...fontFor(st.type.family, true),
    fontSize: st.section.titleSize,
    letterSpacing: st.section.letterSpacing,
    textTransform: st.section.uppercase ? 'uppercase' : 'none',
    color: cfg?.titleColor || st.section.titleColor || st.accent,
    marginTop: cfg?.spacingBefore ?? st.section.spacingBefore,
    marginBottom: st.section.spacingAfter,
  }
}

export function ResumePDF({ data, styleTokens }) {
  const st = styleTokens || defaultStyle
  const s = makeStyles(st)
  const { basics, summary, experience, skills, education } = data
  const contacts = [basics.location, basics.phone, basics.email, basics.linkedin, basics.github].filter(Boolean)

  // Every block gets a wrapper carrying its override tokens: text size,
  // background fill, and the full box model (margin + padding, 4 sides).
  const wrapStyle = (id) => {
    const cfg = st.sections[id] || {}
    const w = {}
    if (cfg.textSize) w.fontSize = cfg.textSize
    if (cfg.background) w.backgroundColor = cfg.background
    const mg = cfg.margin || {}
    const pd = typeof cfg.padding === 'number' ? { top: cfg.padding, right: cfg.padding, bottom: cfg.padding, left: cfg.padding } : cfg.padding || {}
    if (mg.top) w.marginTop = mg.top
    if (mg.right) w.marginRight = mg.right
    if (mg.bottom) w.marginBottom = mg.bottom
    if (mg.left) w.marginLeft = mg.left
    if (pd.top) w.paddingTop = pd.top
    if (pd.right) w.paddingRight = pd.right
    if (pd.bottom) w.paddingBottom = pd.bottom
    if (pd.left) w.paddingLeft = pd.left
    return w
  }

  const CustomFields = ({ fields, area = 'inline' }) => {
    const list = (fields || []).filter((f) => {
      const render = f.render || 'inline'
      return render === area && (f.label?.trim() || f.value?.trim())
    })
    if (!list.length) return null
    return (
      <View style={{ marginTop: area === 'header' ? 4 : 0 }}>
        {list.map((f, i) => (
          <View key={i} style={s.customField}>
            {f.label?.trim() && <Text style={s.customLabel}>{f.label.trim()}: </Text>}
            <Text style={s.customValue}>{f.value}</Text>
          </View>
        ))}
      </View>
    )
  }

  const Header = () => (
    <View style={wrapStyle('header')}>
      <Text style={s.name}>{basics.name}</Text>
      {basics.title ? <Text style={s.title}>{basics.title}</Text> : null}
      <View style={s.contactRow}>
        {contacts.map((c, i) => (
          <Text key={i} style={s.contact}>
            {c}
            {i < contacts.length - 1 ? <Text style={s.dot}>  •  </Text> : null}
          </Text>
        ))}
      </View>
      <CustomFields fields={basics.customFields} area="header" />
      <View style={s.rule} />
    </View>
  )

  const SectionTitle = ({ id, text }) => {
    const cfg = st.sections[id]
    if (cfg?.showTitle === false) return null
    return <Text style={titleStyle(st, s, cfg)}>{text || cfg?.title || id}</Text>
  }

  const Summary = () =>
    summary ? (
      <View style={wrapStyle('summary')}>
        <SectionTitle id="summary" />
        <Text>{summary}</Text>
      </View>
    ) : null

  const Experience = () => (
    <View style={wrapStyle('experience')}>
      {experience.length > 0 && <SectionTitle id="experience" />}
      {experience.map((job, i) => (
        <View key={i} wrap={false}>
          <View style={s.jobHead}>
            <Text style={s.role}>{job.role}</Text>
            <Text style={s.dates}>{job.dates}</Text>
          </View>
          <Text style={s.company}>{job.company}</Text>
          {job.bullets.filter(Boolean).map((b, j) => (
            <View key={j} style={s.bulletRow}>
              <Text style={s.bulletMark}>{st.bullets.marker}</Text>
              <Text style={s.bulletText}>{b}</Text>
            </View>
          ))}
          <CustomFields fields={job.customFields} />
        </View>
      ))}
    </View>
  )

  // stacked (label above items) in narrow cells, table in wide ones —
  // unless the section's mode override says otherwise.
  const Skills = ({ span }) => {
    const mode = st.sections.skills?.mode || 'auto'
    const stacked = mode === 'stacked' || (mode === 'auto' && span <= 6)
    return (
      <View style={wrapStyle('skills')}>
        {skills.length > 0 && <SectionTitle id="skills" />}
        {skills.map((sk, i) =>
          stacked ? (
            <View key={i} style={s.skillBlock}>
              <Text style={s.skillGroup}>{sk.group}</Text>
              <Text>{sk.items}</Text>
              <CustomFields fields={sk.customFields} />
            </View>
          ) : (
            <View key={i} style={s.skillRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[s.skillGroup, s.skillGroupCol]}>{sk.group}</Text>
                  <Text style={s.skillItems}>{sk.items}</Text>
                </View>
                <CustomFields fields={sk.customFields} />
              </View>
            </View>
          ),
        )}
      </View>
    )
  }

  const Education = ({ span }) => (
    <View style={wrapStyle('education')}>
      {education.length > 0 && <SectionTitle id="education" />}
      {education.map((ed, i) => (
        <View key={i}>
          {span <= 6 ? (
            <View style={s.skillBlock}>
              <Text style={s.role}>{ed.degree}</Text>
              <Text style={s.company}>{ed.school}</Text>
              <Text style={s.dates}>{ed.dates}</Text>
            </View>
          ) : (
            <>
              <View style={s.eduRow}>
                <Text style={s.role}>{ed.degree}</Text>
                <Text style={s.dates}>{ed.dates}</Text>
              </View>
              <Text style={s.company}>{ed.school}</Text>
            </>
          )}
          <CustomFields fields={ed.customFields} />
        </View>
      ))}
    </View>
  )

  // Custom blocks (drawn on the canvas): title + body where lines starting
  // with "- " render as bullets.
  const Custom = ({ id }) => {
    const cs = (data.customSections || []).find((c) => c.id === id)
    if (!cs) return null
    const lines = (cs.body || '').split('\n').filter((l) => l.trim())
    return (
      <View style={wrapStyle(id)}>
        {cs.title ? <SectionTitle id={id} text={cs.title} /> : null}
        {lines.map((line, i) =>
          line.trimStart().startsWith('- ') ? (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletMark}>{st.bullets.marker}</Text>
              <Text style={s.bulletText}>{line.trimStart().slice(2)}</Text>
            </View>
          ) : (
            <Text key={i} style={{ marginBottom: 2 }}>{line}</Text>
          ),
        )}
      </View>
    )
  }

  const renderBlock = (id, span) => {
    switch (id) {
      case 'header': return <Header key={id} />
      case 'summary': return <Summary key={id} />
      case 'experience': return <Experience key={id} />
      case 'skills': return <Skills key={id} span={span} />
      case 'education': return <Education key={id} span={span} />
      default: return id.startsWith('custom-') ? <Custom key={id} id={id} /> : null
    }
  }

  const gutter = st.grid.gutter

  return (
    <Document title={`${basics.name} — Resume`} author={basics.name}>
      <Page size={st.page.size} style={s.page}>
        {st.grid.rows.map((row, ri) => {
          const totalSpan = row.cells.reduce((a, c) => a + c.span, 0) || 12
          return (
            <View key={row.id} style={{ flexDirection: 'row', gap: gutter }}>
              {row.cells.map((cell) => (
                <View key={cell.id} style={{ flexBasis: 0, flexGrow: cell.span / totalSpan, minWidth: 0 }}>
                  {cell.blocks.map((b) => renderBlock(b, Math.round((cell.span / totalSpan) * 12)))}
                </View>
              ))}
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
