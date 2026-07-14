// Start-from-scratch templates for Free PDF Editor.
// Each provides a minimal blank data object plus a friendly display name.

import { defaultStyle } from './defaultStyle.js'

export const BLANK_RESUME = {
  basics: { name: '', title: '', location: '', phone: '', email: '', linkedin: '', github: '' },
  summary: '',
  experience: [],
  skills: [],
  education: [],
  customSections: [],
}

export const BLANK_LETTER = {
  basics: { name: '', title: '', location: '', phone: '', email: '', linkedin: '', github: '' },
  summary: '',
  experience: [],
  skills: [],
  education: [],
  customSections: [
    { id: 'custom-letter', title: 'Cover Letter', body: '' },
  ],
}

export const BLANK_INVOICE = {
  basics: { name: '', title: 'Invoice', location: '', phone: '', email: '', linkedin: '', github: '' },
  summary: '',
  experience: [],
  skills: [],
  education: [],
  customSections: [
    { id: 'custom-invoice-from', title: 'From', body: '' },
    { id: 'custom-invoice-to', title: 'Bill To', body: '' },
    { id: 'custom-invoice-items', title: 'Items', body: 'Description — $0.00' },
    { id: 'custom-invoice-total', title: 'Total', body: '$0.00' },
    { id: 'custom-invoice-notes', title: 'Notes', body: '' },
  ],
}

export const TEMPLATES = [
  { id: 'resume', name: 'Resume', data: BLANK_RESUME, icon: '¶' },
  { id: 'letter', name: 'Cover Letter', data: BLANK_LETTER, icon: '✉' },
  { id: 'invoice', name: 'Invoice', data: BLANK_INVOICE, icon: '$' },
]

export function templateDoc(name, templateId) {
  const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0]
  return { data: structuredClone(t.data), style: structuredClone(defaultStyle), templateId: t.id }
}
