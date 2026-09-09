import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { makeId } from '../../store/resumeStore'
import { moveAt } from './editorUtils'

type SimpleListProps = { values: string[]; label: string; placeholder: string; emptyText: string; onChange: (values: string[]) => void }

export default function SimpleList({ values, label, placeholder, emptyText, onChange }: SimpleListProps) {
  const [rowIds, setRowIds] = useState(() => values.map(() => makeId()))
  useEffect(() => { setRowIds((ids) => values.length === ids.length ? ids : values.map((_, index) => ids[index] ?? makeId())) }, [values.length])
  const updateAt = (index: number, value: string) => onChange(values.map((item, itemIndex) => itemIndex === index ? value : item))
  const move = (index: number, direction: -1 | 1) => { setRowIds((ids) => moveAt(ids, index, direction)); onChange(moveAt(values, index, direction)) }
  const remove = (index: number) => { setRowIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index)); onChange(values.filter((_, itemIndex) => itemIndex !== index)) }
  return <div className="simple-list">{values.length === 0 && <p className="empty-list">{emptyText}</p>}{values.map((value, index) => { const inputId = `${label.toLowerCase()}-${rowIds[index]}`; return <div className="simple-list-row" key={rowIds[index]}><label className="sr-only" htmlFor={inputId}>{label} {index + 1}</label><input id={inputId} value={value} placeholder={placeholder} aria-label={`${label} ${index + 1}`} onChange={(event) => updateAt(index, event.target.value)} /><button className="icon-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`上移${label}`}><ChevronUp size={14} /></button><button className="icon-button" type="button" disabled={index === values.length - 1} onClick={() => move(index, 1)} aria-label={`下移${label}`}><ChevronDown size={14} /></button><button className="icon-button danger-icon" type="button" onClick={() => remove(index)} aria-label={`删除${label}`}><Trash2 size={14} /></button></div> })}<button className="add-button" type="button" onClick={() => { setRowIds((ids) => [...ids, makeId()]); onChange([...values, '']) }}><Plus size={16} />添加{label}</button></div>
}
