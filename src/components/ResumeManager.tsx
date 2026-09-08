import { useEffect, useState } from 'react'
import { Copy, FilePlus2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Resume, TemplateId } from '../types/resume'

type ResumeManagerProps = {
  resumes: Resume[]
  selectedId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDuplicate: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

const templateNames: Record<TemplateId, string> = { classic: '经典', modern: '现代', minimal: '极简' }

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚更新'
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date)
}

export default function ResumeManager({ resumes, selectedId, onSelect, onCreate, onDuplicate, onRename, onDelete }: ResumeManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (editingId && !resumes.some((resume) => resume.id === editingId)) setEditingId(null)
  }, [editingId, resumes])

  const beginRename = (resume: Resume) => {
    setEditingId(resume.id)
    setDraftTitle(resume.title)
    setMenuId(null)
  }

  const commitRename = () => {
    if (!editingId) return
    onRename(editingId, draftTitle)
    setEditingId(null)
  }

  return (
    <aside className="manager-panel">
      <div className="panel-heading"><div><p className="eyebrow">工作区</p><h2>我的简历</h2></div><span className="count-badge">{resumes.length}</span></div>
      <button className="new-resume-button" type="button" onClick={onCreate}><FilePlus2 size={17} />新建简历</button>
      <div className="resume-list">
        {resumes.map((resume) => (
          <div className={`resume-list-item ${resume.id === selectedId ? 'is-active' : ''}`} key={resume.id}>
            {editingId === resume.id ? (
              <input className="rename-input" value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === 'Enter') commitRename(); if (event.key === 'Escape') setEditingId(null) }} aria-label="简历名称" />
            ) : (
              <button className="resume-list-main" type="button" onClick={() => onSelect(resume.id)}>
                <span className="resume-list-title">{resume.title || '未命名简历'}</span>
                <span className="resume-list-meta">{templateNames[resume.templateId]} · {formatUpdatedAt(resume.updatedAt)}</span>
              </button>
            )}
            <button className="icon-button list-menu-button" type="button" onClick={() => setMenuId(menuId === resume.id ? null : resume.id)} aria-label={`操作：${resume.title}`} title="更多操作"><MoreHorizontal size={17} /></button>
            {menuId === resume.id && <div className="resume-item-menu">
              <button type="button" onClick={() => beginRename(resume)}><Pencil size={14} />重命名</button>
              <button type="button" onClick={() => { onDuplicate(resume.id); setMenuId(null) }}><Copy size={14} />复制</button>
              <button type="button" className="danger-text" onClick={() => { setConfirmId(resume.id); setMenuId(null) }}><Trash2 size={14} />删除</button>
            </div>}
          </div>
        ))}
      </div>
      <p className="storage-note">内容自动保存至本地浏览器</p>
      {confirmId && <div className="confirm-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h3 id="delete-title">删除这份简历？</h3><p>删除后内容无法恢复，请确认是否继续。</p><div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setConfirmId(null)}>取消</button><button className="danger-button" type="button" onClick={() => { onDelete(confirmId); setConfirmId(null) }}>确认删除</button></div></div></div>}
    </aside>
  )
}
