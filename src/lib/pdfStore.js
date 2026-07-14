// Uploaded reference PDFs live in IndexedDB — in the visitor's browser only.
// No cookies, no server: the blobs never leave the device, and deleting one
// here (or clearing site data) removes it permanently.
const DB_NAME = 'free-pdf-editor'
const STORE = 'pdfs'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = run(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listPdfs() {
  const db = await openDb()
  const all = await tx(db, 'readonly', (s) => s.getAll())
  return all.sort((a, b) => a.addedAt - b.addedAt)
}

export async function addPdf(file) {
  const db = await openDb()
  const rec = {
    id: `pdf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name.replace(/\.pdf$/i, ''),
    bytes: file.size,
    blob: file,
    addedAt: Date.now(),
  }
  await tx(db, 'readwrite', (s) => s.put(rec))
  return rec
}

export async function deletePdf(id) {
  const db = await openDb()
  await tx(db, 'readwrite', (s) => s.delete(id))
}
