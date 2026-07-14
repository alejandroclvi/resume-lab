// Scans public/resumes and writes src/data/manifest.json so the gallery
// stays in sync when files are added or removed.
import { readdirSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dir = join(root, 'public', 'resumes')
const out = join(root, 'src', 'data', 'manifest.json')

const files = readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith('.pdf'))
  .sort()
  .map((f) => ({
    file: `/resumes/${f}`,
    name: f.replace(/\.pdf$/i, ''),
    bytes: statSync(join(dir, f)).size,
  }))

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(files, null, 2))
console.log(`manifest: ${files.length} PDFs`)
