import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { makeId } from '../../store/resumeStore'

type BulletEditorProps = { bullets: string[]; onChange: (bullets: string[]) => void }

export default function BulletEditor({ bullets, onChange }: BulletEditorProps) {
  const [rowIds, setRowIds] = useState(() => bullets.map(() => makeId()))
  const [focusRowId, setFocusRowId] = useState<string | null>(null)
  const inputRefs = useRef(new Map<string, HTMLInputElement>())
  useEffect(() => { setRowIds((ids) => bullets.length === ids.length ? ids : bullets.map((_, index) => ids[index] ?? makeId())) }, [bullets.length])
  useEffect(() => {
    if (!focusRowId) return
    inputRefs.current.get(focusRowId)?.focus()
    setFocusRowId(null)
  }, [focusRowId, rowIds])
  const add = () => {
    const id = makeId()
    setRowIds((ids) => [...ids, id])
    setFocusRowId(id)
    onChange([...bullets, ''])
  }
  const remove = (index: number) => {
    const nextFocusId = rowIds[index + 1] ?? rowIds[index - 1] ?? null
    setRowIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index))
    setFocusRowId(nextFocusId)
    onChange(bullets.filter((_, itemIndex) => itemIndex !== index))
  }
  return <div className="bullet-editor"><div className="sub-label">工作内容 / 成果</div>{bullets.map((bullet, index) => <div className="bullet-row" key={rowIds[index]}><span aria-hidden="true">•</span><input ref={(element) => { if (element) inputRefs.current.set(rowIds[index], element); else inputRefs.current.delete(rowIds[index]) }} value={bullet} placeholder="描述你的成果或负责内容" aria-label={`工作内容 / 成果 ${index + 1}`} onChange={(event) => onChange(bullets.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button className="icon-button danger-icon" type="button" onClick={() => remove(index)} aria-label={`删除工作内容 / 成果 ${index + 1}`}><Trash2 size={14} aria-hidden="true" /></button></div>)}<button className="inline-add" type="button" onClick={add}><Plus size={14} aria-hidden="true" />添加要点</button></div>
}
