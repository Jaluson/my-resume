import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { makeId } from '../../store/resumeStore'

type BulletEditorProps = { bullets: string[]; onChange: (bullets: string[]) => void }

export default function BulletEditor({ bullets, onChange }: BulletEditorProps) {
  const [rowIds, setRowIds] = useState(() => bullets.map(() => makeId()))
  useEffect(() => { setRowIds((ids) => bullets.length === ids.length ? ids : bullets.map((_, index) => ids[index] ?? makeId())) }, [bullets.length])
  return <div className="bullet-editor"><div className="sub-label">工作内容 / 成果</div>{bullets.map((bullet, index) => <div className="bullet-row" key={rowIds[index]}><span aria-hidden="true">•</span><input value={bullet} placeholder="描述你的成果或负责内容" aria-label={`工作内容 / 成果 ${index + 1}`} onChange={(event) => onChange(bullets.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button className="icon-button danger-icon" type="button" onClick={() => { setRowIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index)); onChange(bullets.filter((_, itemIndex) => itemIndex !== index)) }} aria-label="删除要点"><Trash2 size={14} /></button></div>)}<button className="inline-add" type="button" onClick={() => { setRowIds((ids) => [...ids, makeId()]); onChange([...bullets, '']) }}><Plus size={14} />添加要点</button></div>
}
