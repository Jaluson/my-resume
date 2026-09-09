import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { makeId } from '../../store/resumeStore'
import { moveAt } from './editorUtils'

type SectionProps = { title: string; description?: string; defaultOpen?: boolean; children: React.ReactNode }
export const Section = ({ title, description, defaultOpen = true, children }: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = `editor-section-${title}`
  return <section className="editor-section"><button className="section-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={bodyId}><span><strong>{title}</strong>{description && <small>{description}</small>}</span>{open ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}</button>{open && <div className="section-body" id={bodyId}>{children}</div>}</section>
}

type FieldProps = { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }
export const Field = ({ label, value, onChange, placeholder, type = 'text' }: FieldProps) => <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
export const TextareaField = ({ label, value, onChange, placeholder }: Omit<FieldProps, 'type'>) => <label className="field field-full"><span>{label}</span><textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} rows={4} /></label>

type BulletEditorProps = { bullets: string[]; onChange: (bullets: string[]) => void }
export function BulletEditor({ bullets, onChange }: BulletEditorProps) {
  const [rowIds, setRowIds] = useState(() => bullets.map(() => makeId()))
  useEffect(() => { setRowIds((ids) => bullets.length === ids.length ? ids : bullets.map((_, index) => ids[index] ?? makeId())) }, [bullets.length])
  return <div className="bullet-editor"><div className="sub-label">工作内容 / 成果</div>{bullets.map((bullet, index) => <div className="bullet-row" key={rowIds[index]}><span aria-hidden="true">•</span><input value={bullet} placeholder="描述你的成果或负责内容" aria-label={`工作内容 / 成果 ${index + 1}`} onChange={(event) => onChange(bullets.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button className="icon-button danger-icon" type="button" onClick={() => { setRowIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index)); onChange(bullets.filter((_, itemIndex) => itemIndex !== index)) }} aria-label="删除要点"><Trash2 size={14} /></button></div>)}<button className="inline-add" type="button" onClick={() => { setRowIds((ids) => [...ids, makeId()]); onChange([...bullets, '']) }}><Plus size={14} />添加要点</button></div>
}

type SimpleListProps = { values: string[]; label: string; placeholder: string; emptyText: string; onChange: (values: string[]) => void }
export function SimpleList({ values, label, placeholder, emptyText, onChange }: SimpleListProps) {
  const [rowIds, setRowIds] = useState(() => values.map(() => makeId()))
  useEffect(() => { setRowIds((ids) => values.length === ids.length ? ids : values.map((_, index) => ids[index] ?? makeId())) }, [values.length])
  const updateAt = (index: number, value: string) => onChange(values.map((item, itemIndex) => itemIndex === index ? value : item))
  const move = (index: number, direction: -1 | 1) => { setRowIds((ids) => moveAt(ids, index, direction)); onChange(moveAt(values, index, direction)) }
  const remove = (index: number) => { setRowIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index)); onChange(values.filter((_, itemIndex) => itemIndex !== index)) }
  return <div className="simple-list">{values.length === 0 && <p className="empty-list">{emptyText}</p>}{values.map((value, index) => { const inputId = `${label.toLowerCase()}-${rowIds[index]}`; return <div className="simple-list-row" key={rowIds[index]}><label className="sr-only" htmlFor={inputId}>{label} {index + 1}</label><input id={inputId} value={value} placeholder={placeholder} aria-label={`${label} ${index + 1}`} onChange={(event) => updateAt(index, event.target.value)} /><button className="icon-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`上移${label}`}><ChevronUp size={14} /></button><button className="icon-button" type="button" disabled={index === values.length - 1} onClick={() => move(index, 1)} aria-label={`下移${label}`}><ChevronDown size={14} /></button><button className="icon-button danger-icon" type="button" onClick={() => remove(index)} aria-label={`删除${label}`}><Trash2 size={14} /></button></div> })}<button className="add-button" type="button" onClick={() => { setRowIds((ids) => [...ids, makeId()]); onChange([...values, '']) }}><Plus size={16} />添加{label}</button></div>
}
