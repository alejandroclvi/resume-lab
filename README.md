# ¶ ResumeLab

**A free, open-source resume PDF editor.** Design your resume like a document proofing desk: edit content in forms, style every element with a real CSS box model, arrange sections on a 12-column grid canvas — and download a true, ATS-friendly PDF. No accounts, no watermarks, no server: everything runs in your browser and your data never leaves your machine.

## Features

- **Live PDF proof** — the preview *is* the PDF (rendered with `@react-pdf/renderer`), not an HTML approximation. What you see is byte-for-byte what you download.
- **Click-to-select on the rendered PDF** — click any text in the proof and the inspector jumps to that element's controls.
- **Grid design canvas** — a blueprint view where sections are draggable blocks on a 12-column grid. Draw a rectangle with the mouse to create a new section. Sidebars are one click.
- **Real CSS box model per element** — 4-direction margin and padding on every section, background fills, page margins via a visual box-model widget.
- **Style presets + full token model** — one-click themes (Classic, Modern, Compact, Executive) on top of a JSON style model you can hand-edit in the `{ } Code` tab.
- **Fonts** — built-in PDF fonts (Helvetica, Times, Courier) plus embedded TTFs (Lato, PT Serif); add your own in `public/fonts/` + `src/pdf/fonts.js`.
- **Gallery & compare** — drop your old resume PDFs in `public/resumes/` and view them side-by-side with your draft to steal the best ideas.
- **Private by design** — drafts persist in `localStorage`; Import/Export moves them as JSON.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:4780
```

Drop any reference resume PDFs into `public/resumes/` — they appear in the Gallery automatically (a manifest is generated on every `dev`/`build`).

## How it works

- `src/data/defaultStyle.js` — the style-token model. Every visual property lives here and maps 1:1 onto CSS in the PDF template. `grid.rows[].cells[].blocks[]` is the page layout; `sections.*` hold per-element overrides (title, colors, margin/padding boxes…).
- `src/pdf/ResumePDF.jsx` — the PDF template: computes react-pdf styles from the tokens and renders the grid with flexbox.
- `src/components/DesignCanvas.jsx` — the blueprint canvas: drag & drop, draw-to-create, edge-resize, delete-to-tray.
- `src/components/StylePanel.jsx` — the contextual inspector (document scope + per-element scope) and the raw JSON editor.
- Content model: `data` (your text) is separate from `style` (how it looks). Exports bundle both: `{_v: 2, data, style}`.

## License

[MIT](LICENSE) — free for any use.
