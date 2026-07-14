import { useState } from 'react'
import { Document, Page } from 'react-pdf'

// Renders a PDF (url or blob) as canvas pages with optional pager.
// When onTextClick is given, clicks on the PDF's text layer report the
// clicked string — used for click-to-select on the live proof.
export function PdfCanvas({ file, width, allPages = false, className = '', onTextClick }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNum, setPageNum] = useState(1)

  const handleClick = onTextClick
    ? (e) => {
        const span = e.target.closest('.react-pdf__Page__textContent span, .textLayer span')
        const text = span?.textContent?.trim()
        if (text) onTextClick(text)
      }
    : undefined

  return (
    <div className={`pdf-canvas ${onTextClick ? 'click-proof' : ''} ${className}`} onClick={handleClick}>
      <Document
        file={file}
        onLoadSuccess={({ numPages: n }) => {
          setNumPages(n)
          setPageNum(1)
        }}
        loading={<div className="pdf-loading">rendering…</div>}
        error={<div className="pdf-loading">could not render this PDF</div>}
      >
        {allPages && numPages
          ? Array.from({ length: numPages }, (_, i) => (
              <Page key={i} pageNumber={i + 1} width={width} className="pdf-page" />
            ))
          : <Page pageNumber={pageNum} width={width} className="pdf-page" />}
      </Document>
      {!allPages && numPages > 1 && (
        <div className="pager">
          <button onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}>‹</button>
          <span>{pageNum} / {numPages}</span>
          <button onClick={() => setPageNum((p) => Math.min(numPages, p + 1))} disabled={pageNum >= numPages}>›</button>
        </div>
      )}
    </div>
  )
}
