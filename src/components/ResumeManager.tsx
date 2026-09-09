import { useEffect, useRef, useState } from 'react'
import { Copy, FilePlus2, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { templateById } from '../data/templates'
import type { Resume } from '../types/resume'

type ResumeManagerProps = { resumes: Resume[]; selectedId: string; onSelect: (id: string) => void; onCreate: () => void; onDuplicate: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void; mobileOpen: boolean; onCloseMobile: () => void }
const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' })

const formatUpdatedAt = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '刚刚更新' : updatedAtFormatter.format(date) }

export default function ResumeManager({ resumes, selectedId, onSelect, onCreate, onDuplicate, onRename, onDelete, mobileOpen, onCloseMobile }: ResumeManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const renameSessionRef = useRef<{ id: string; cancelled: boolean; committed: boolean } | null>(null)
  const menuTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const deleteTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (editingId && !resumes.some((resume) => resume.id === editingId)) setEditingId(null) }, [editingId, resumes])
  useEffect(() => {
    if (!menuId) return
    const closeOnPointer = (event: PointerEvent) => { if (!(event.target instanceof Node) || !(event.target as Element).closest(`[data-resume-menu="${menuId}"]`)) setMenuId(null) }
    const closeOnKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuId(null); menuTriggerRefs.current[menuId]?.focus() } }
    document.addEventListener('pointerdown', closeOnPointer)
    document.addEventListener('keydown', closeOnKey)
    return () => { document.removeEventListener('pointerdown', closeOnPointer); document.removeEventListener('keydown', closeOnKey) }
  }, [menuId])
  useEffect(() => { if (confirmId) cancelRef.current?.focus() }, [confirmId])
  useEffect(() => {
    if (!mobileOpen) return
    const closeOnKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseMobile() }
    document.addEventListener('keydown', closeOnKey)
    return () => document.removeEventListener('keydown', closeOnKey)
  }, [mobileOpen, onCloseMobile])
  useEffect(() => {
    if (!confirmId) return
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeDialog(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      if (buttons.length < 2) return
      const current = document.activeElement
      const index = buttons.indexOf(current as HTMLButtonElement)
      event.preventDefault()
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [confirmId])

  const beginRename = (resume: Resume) => { renameSessionRef.current = { id: resume.id, cancelled: false, committed: false }; setEditingId(resume.id); setDraftTitle(resume.title); setMenuId(null) }
  const commitRename = () => { const session = renameSessionRef.current; if (!session || session.cancelled || session.committed) return; session.committed = true; onRename(session.id, draftTitle); setEditingId(null) }
  const closeAfter = (action: () => void) => { action(); onCloseMobile() }
  const closeDialog = () => { const trigger = deleteTriggerRefs.current[confirmId ?? '']; setConfirmId(null); window.setTimeout(() => trigger?.focus(), 0) }

  return <>{mobileOpen && <button className="mobile-manager-backdrop" type="button" onClick={onCloseMobile} aria-label="关闭简历管理" />}<aside id="resume-manager-panel" className={`manager-panel ${mobileOpen ? 'mobile-manager-open' : ''}`} aria-label="简历管理">
    <div className="panel-heading"><div><p className="eyebrow">工作区</p><h2>我的简历</h2></div><div className="panel-heading-actions"><span className="count-badge">{resumes.length}</span><button className="icon-button mobile-manager-close" type="button" onClick={onCloseMobile} aria-label="关闭简历管理"><X size={18} /></button></div></div>
    <button className="new-resume-button" type="button" onClick={() => closeAfter(onCreate)}><FilePlus2 size={17} />新建简历</button>
    <div className="resume-list">{resumes.map((resume) => <div className={`resume-list-item ${resume.id === selectedId ? 'is-active' : ''}`} key={resume.id} data-resume-menu={menuId === resume.id ? resume.id : undefined}>
      {editingId === resume.id ? <input className="rename-input" value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitRename() } if (event.key === 'Escape') { if (renameSessionRef.current) renameSessionRef.current.cancelled = true; setEditingId(null) } }} aria-label="简历名称" /> : <button className="resume-list-main" type="button" onClick={() => closeAfter(() => onSelect(resume.id))}><span className="resume-list-title">{resume.title || '未命名简历'}</span><span className="resume-list-meta">{templateById(resume.templateId).name} · {formatUpdatedAt(resume.updatedAt)}</span></button>}
      <button className="icon-button list-menu-button" type="button" ref={(element) => { menuTriggerRefs.current[resume.id] = element }} onClick={() => setMenuId(menuId === resume.id ? null : resume.id)} aria-label={`操作：${resume.title}`} aria-expanded={menuId === resume.id} aria-controls={`resume-menu-${resume.id}`}><MoreHorizontal size={17} /></button>
      {menuId === resume.id && <div className="resume-item-menu" id={`resume-menu-${resume.id}`} aria-label={`${resume.title}操作`}><button type="button" onClick={() => beginRename(resume)}><Pencil size={14} />重命名</button><button type="button" onClick={() => closeAfter(() => { onDuplicate(resume.id); setMenuId(null) })}><Copy size={14} />复制</button><button type="button" className="danger-text" ref={(element) => { deleteTriggerRefs.current[resume.id] = element }} data-delete-trigger={resume.id} onClick={() => { setConfirmId(resume.id); setMenuId(null) }}><Trash2 size={14} />删除</button></div>}
    </div>)}</div>
    <p className="storage-note">内容自动保存至本地浏览器</p>
    {confirmId && <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className="confirm-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-title"><h3 id="delete-title">删除这份简历？</h3><p>删除后内容无法恢复，请确认是否继续。</p><div className="dialog-actions"><button className="secondary-button" type="button" ref={cancelRef} onClick={closeDialog}>取消</button><button className="danger-button" type="button" onClick={() => { onDelete(confirmId); onCloseMobile(); closeDialog() }}>确认删除</button></div></div></div>}
  </aside></>
}
