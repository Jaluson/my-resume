import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type EditorSectionProps = { title: string; description?: string; defaultOpen?: boolean; children: React.ReactNode }

export default function EditorSection({ title, description, defaultOpen = true, children }: EditorSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = `editor-section-${title}`
  return <section className="editor-section"><button className="section-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={bodyId}><span><strong>{title}</strong>{description && <small>{description}</small>}</span>{open ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}</button>{open && <div className="section-body" id={bodyId}>{children}</div>}</section>
}
