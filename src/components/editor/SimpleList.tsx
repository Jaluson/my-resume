import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { makeId } from '../../store/resumeStore'
import { moveAt } from './editorUtils'

type SimpleListProps = { values: string[]; label: string; placeholder: string; emptyText: string; onChange: (values: string[]) => void }

export default function SimpleList({ values, label, placeholder, emptyText, onChange }: SimpleListProps) {
  const [rowIds, setRowIds] = useState(() => values.map(() => makeId()))
  const [focusRowId, setFocusRowId] = useState<string | null>(null)
  const inputRefs = useRef(new Map<string, HTMLInputElement>())
  useEffect(() => { setRowIds((ids) => values.length === ids.length ? ids : values.map((_, index) => ids[index] ?? makeId())) }, [values.length])
  useEffect(() => {
    if (!focusRowId) return
    inputRefs.current.get(focusRowId)?.focus()
    setFocusRowId(null)
  }, [focusRowId, rowIds])
  const updateAt = (index: number, value: string) => onChange(values.map((item, itemIndex) => itemIndex === index ? value : item))
  const move = (index: number, direction: -1 | 1) => { setRowIds((ids) => moveAt(ids, index, direction)); onChange(moveAt(values, index, direction)) }
  const remove = (index: number) => {
    const nextFocusId = rowIds[index + 1] ?? rowIds[index - 1] ?? null
    setRowIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index))
    setFocusRowId(nextFocusId)
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }
  const add = () => {
    const id = makeId()
    setRowIds((ids) => [...ids, id])
    setFocusRowId(id)
    onChange([...values, ''])
  }
  return <div className="simple-list">{values.length === 0 && <p className="empty-list">{emptyText}</p>}{values.map((value, index) => { const inputId = `${label.toLowerCase()}-${rowIds[index]}`; return <div className="simple-list-row" key={rowIds[index]}><label className="sr-only" htmlFor={inputId}>{label} {index + 1}</label><input ref={(element) => { if (element) inputRefs.current.set(rowIds[index], element); else inputRefs.current.delete(rowIds[index]) }} id={inputId} value={value} placeholder={placeholder} aria-label={`${label} ${index + 1}`} onChange={(event) => updateAt(index, event.target.value)} /><button className="icon-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`上移${label} ${index + 1}`}><ChevronUp size={14} aria-hidden="true" /></button><button className="icon-button" type="button" disabled={index === values.length - 1} onClick={() => move(index, 1)} aria-label={`下移${label} ${index + 1}`}><ChevronDown size={14} aria-hidden="true" /></button><button className="icon-button danger-icon" type="button" onClick={() => remove(index)} aria-label={`删除${label} ${index + 1}`}><Trash2 size={14} aria-hidden="true" /></button></div> })}<button className="add-button" type="button" onClick={add}><Plus size={16} aria-hidden="true" />添加{label}</button></div>
}
