import { Font } from '@react-pdf/renderer'

// Local TTFs in public/fonts — registered once at module load.
// Built-in families (Helvetica, Times-Roman, Courier) need no registration.
Font.register({
  family: 'Lato',
  fonts: [
    { src: '/fonts/Lato-Regular.ttf' },
    { src: '/fonts/Lato-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Lato-Italic.ttf', fontStyle: 'italic' },
  ],
})

Font.register({
  family: 'PT Serif',
  fonts: [
    { src: '/fonts/PTSerif-Regular.ttf' },
    { src: '/fonts/PTSerif-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/PTSerif-Italic.ttf', fontStyle: 'italic' },
  ],
})

// Word-level wrapping only (no mid-word breaks) — resumes read better.
Font.registerHyphenationCallback((word) => [word])

const BOLD_MAP = {
  Helvetica: 'Helvetica-Bold',
  'Times-Roman': 'Times-Bold',
  Courier: 'Courier-Bold',
}

// Built-in PDF fonts use separate family names per weight; registered TTFs
// use fontWeight. This resolves the right {fontFamily, fontWeight} pair.
export function fontFor(family, bold = false) {
  if (BOLD_MAP[family]) {
    return bold ? { fontFamily: BOLD_MAP[family] } : { fontFamily: family }
  }
  return bold ? { fontFamily: family, fontWeight: 'bold' } : { fontFamily: family }
}
