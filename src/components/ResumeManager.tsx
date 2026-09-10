import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Copy, FilePlus2, FileText, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { templateById } from '../data/templates'
import type { RefObject } from 'react'
import type { Resume, TemplateId } from '../types/resume'
import TemplatePicker from './TemplatePicker'

type ResumeManagerProps = { resumes: Resume[]; selectedId: string; templateId: TemplateId; onSelect: (id: string) => void; onTemplateChange: (templateId: TemplateId) => void; onCreate: () => void; onDuplicate: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void; mobileOpen: boolean; onCloseMobile: () => void; mobileTriggerRef: RefObject<HTMLButtonElement> }
const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' })
const mobileMediaQuery = '(max-width: 1100px)'

const formatUpdatedAt = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '刚刚更新' : updatedAtFormatter.format(date) }

export default function ResumeManager({ resumes, selectedId, templateId, onSelect, onTemplateChange, onCreate, onDuplicate, onRename, onDelete, mobileOpen, onCloseMobile, mobileTriggerRef }: ResumeManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [managerPane, setManagerPane] = useState<'resumes' | 'template'>('resumes')
  const [isMobileViewport, setIsMobileViewport] = useState(typeof window !== 'undefined' && window.matchMedia(mobileMediaQuery).matches)
  const renameSessionRef = useRef<{ id: string; cancelled: boolean; committed: boolean } | null>(null)
  const menuTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const deleteTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)
  const mobilePreviousFocusRef = useRef<HTMLElement | null>(null)
  const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  useEffect(() => { if (editingId && !resumes.some((resume) => resume.id === editingId)) setEditingId(null) }, [editingId, resumes])
  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery)
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches)
      if (!mediaQuery.matches) {
        setManagerPane('resumes')
        if (mobileOpen) onCloseMobile()
      }
    }
    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)
    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [mobileOpen, onCloseMobile])
  useEffect(() => {
    if (!menuId) return
    const closeOnPointer = (event: PointerEvent) => { if (!(event.target instanceof Node) || !(event.target as Element).closest(`[data-resume-menu="${menuId}"]`)) setMenuId(null) }
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuId(null)
        menuTriggerRefs.current[menuId]?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const menu = document.getElementById(`resume-menu-${menuId}`)
      const controls = Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
      const index = controls.indexOf(document.activeElement as HTMLButtonElement)
      if (index < 0) return
      event.preventDefault()
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + controls.length) % controls.length
      controls[nextIndex]?.focus()
    }
    document.addEventListener('pointerdown', closeOnPointer)
    document.addEventListener('keydown', closeOnKey)
    window.setTimeout(() => document.getElementById(`resume-menu-${menuId}`)?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus(), 0)
    return () => { document.removeEventListener('pointerdown', closeOnPointer); document.removeEventListener('keydown', closeOnKey) }
  }, [menuId])
  useEffect(() => { if (confirmId) cancelRef.current?.focus() }, [confirmId])
  useEffect(() => {
    if (!isMobileViewport || !mobileOpen) {
      const previous = mobilePreviousFocusRef.current
      mobilePreviousFocusRef.current = null
      if (!previous?.isConnected) return
      const panel = mobilePanelRef.current
      let restored = false
      const restoreFocus = () => {
        if (restored) return
        restored = true
        previous.focus()
      }
      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.target === panel && event.propertyName === 'transform') restoreFocus()
      }
      panel?.addEventListener('transitionend', handleTransitionEnd)
      const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500
      const fallbackTimer = window.setTimeout(restoreFocus, delay)
      return () => {
        panel?.removeEventListener('transitionend', handleTransitionEnd)
        window.clearTimeout(fallbackTimer)
      }
    }
    if (!mobilePreviousFocusRef.current) {
      const active = document.activeElement
      mobilePreviousFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : mobileTriggerRef.current
    }
    mobileCloseRef.current?.focus()
  }, [isMobileViewport, mobileOpen, mobileTriggerRef])
  useEffect(() => {
    if (!isMobileViewport || !mobileOpen || confirmId) return
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (menuId) return
        event.preventDefault()
        onCloseMobile()
        return
      }
      if (event.key !== 'Tab' || !mobilePanelRef.current) return
      const controls = Array.from(mobilePanelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (!controls.length) return
      const index = controls.indexOf(document.activeElement as HTMLElement)
      if (index === -1) {
        event.preventDefault()
        controls[event.shiftKey ? controls.length - 1 : 0].focus()
        return
      }
      const nextIndex = index + (event.shiftKey ? -1 : 1)
      if (nextIndex >= 0 && nextIndex < controls.length) return
      event.preventDefault()
      controls[nextIndex < 0 ? controls.length - 1 : 0].focus()
    }
    document.addEventListener('keydown', closeOnKey)
    return () => document.removeEventListener('keydown', closeOnKey)
  }, [isMobileViewport, mobileOpen, confirmId, menuId, onCloseMobile])
  useEffect(() => {
    if (!isMobileViewport || !mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isMobileViewport, mobileOpen])
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
  const selectManagerPane = (nextPane: 'resumes' | 'template') => setManagerPane(nextPane)
  const handleManagerPaneKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextPane = event.key === 'Home' ? 'resumes' : event.key === 'End' ? 'template' : event.key === 'ArrowLeft' ? 'resumes' : 'template'
    selectManagerPane(nextPane)
    window.requestAnimationFrame(() => document.getElementById(`manager-${nextPane}-tab`)?.focus())
  }
  const commitRename = () => { const session = renameSessionRef.current; if (!session || session.cancelled || session.committed) return; session.committed = true; onRename(session.id, draftTitle); setEditingId(null) }
  const closeAfter = (action: () => void) => { action(); onCloseMobile() }
  const closeDialog = () => { const trigger = deleteTriggerRefs.current[confirmId ?? '']; setConfirmId(null); window.setTimeout(() => trigger?.focus(), 0) }

  return <>{isMobileViewport && <button className={`mobile-manager-backdrop${mobileOpen ? ' is-visible' : ''}`} type="button" onPointerDown={onCloseMobile} aria-label="关闭简历管理" aria-hidden={!mobileOpen} tabIndex={mobileOpen ? 0 : -1} />}<aside ref={mobilePanelRef} id="resume-manager-panel" className={`manager-panel ${mobileOpen ? 'mobile-manager-open' : ''}`} aria-label="简历管理" aria-hidden={isMobileViewport && !mobileOpen}>
    <div className="panel-heading"><div><p className="eyebrow">文件管理</p><h2>简历选择</h2><p className="panel-heading-subtitle">切换并整理你的版本</p></div><div className="panel-heading-actions"><span className="panel-heading-count">{resumes.length} 份</span><button ref={mobileCloseRef} className="icon-button mobile-manager-close" type="button" onClick={onCloseMobile} aria-label="关闭简历管理"><X size={18} aria-hidden="true" /></button></div></div>
    <div className="manager-pane-tabs" role="tablist" aria-label="简历管理模块"><button id="manager-resumes-tab" className={managerPane === 'resumes' ? 'is-active' : ''} type="button" role="tab" aria-selected={managerPane === 'resumes'} aria-controls="manager-resumes-panel" tabIndex={managerPane === 'resumes' ? 0 : -1} onClick={() => selectManagerPane('resumes')} onKeyDown={handleManagerPaneKeyDown}>简历选择</button><button id="manager-template-tab" className={managerPane === 'template' ? 'is-active' : ''} type="button" role="tab" aria-selected={managerPane === 'template'} aria-controls="manager-template-panel" tabIndex={managerPane === 'template' ? 0 : -1} onClick={() => selectManagerPane('template')} onKeyDown={handleManagerPaneKeyDown}>模板选择</button></div>
    <div className="manager-resume-pane" id="manager-resumes-panel" role="tabpanel" aria-labelledby="manager-resumes-tab" hidden={managerPane !== 'resumes'}><div className="manager-library"><div className="manager-section-heading"><span className="manager-section-label"><small>最近编辑</small><strong>我的简历</strong><em>共 {resumes.length} 份</em></span><button className="new-resume-action" type="button" onClick={() => closeAfter(onCreate)} aria-label="新建简历"><FilePlus2 size={15} aria-hidden="true" />新建</button></div><div className="resume-list">{resumes.map((resume) => {
      const displayTitle = resume.title.trim() || '未命名简历'
      return <div className={`resume-list-item ${resume.id === selectedId ? 'is-active' : ''}`} key={resume.id} data-resume-menu={menuId === resume.id ? resume.id : undefined}>
        <span className="resume-list-marker" aria-hidden="true"><FileText size={16} strokeWidth={1.8} /></span>
        {editingId === resume.id ? <input className="rename-input" value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitRename() } if (event.key === 'Escape') { if (renameSessionRef.current) renameSessionRef.current.cancelled = true; setEditingId(null) } }} aria-label={`重命名 ${displayTitle}`} /> : <button className="resume-list-main" type="button" onClick={() => closeAfter(() => onSelect(resume.id))}><span className="resume-list-copy"><span className="resume-list-title">{displayTitle}</span><span className="resume-list-meta">{templateById(resume.templateId).name} · {formatUpdatedAt(resume.updatedAt)}</span></span>{resume.id === selectedId && <span className="resume-list-current">当前</span>}</button>}
        <button className="icon-button list-menu-button" type="button" ref={(element) => { menuTriggerRefs.current[resume.id] = element }} onClick={() => setMenuId(menuId === resume.id ? null : resume.id)} aria-label={`打开${displayTitle}操作菜单`} aria-haspopup="menu" aria-expanded={menuId === resume.id} aria-controls={`resume-menu-${resume.id}`}><MoreHorizontal size={17} aria-hidden="true" /></button>
        {menuId === resume.id && <div className="resume-item-menu" id={`resume-menu-${resume.id}`} role="menu" aria-label={`${displayTitle}操作`} data-resume-menu={resume.id}><button type="button" role="menuitem" onClick={() => beginRename(resume)}><Pencil size={14} aria-hidden="true" />重命名</button><button type="button" role="menuitem" onClick={() => closeAfter(() => { onDuplicate(resume.id); setMenuId(null) })}><Copy size={14} aria-hidden="true" />复制</button><button type="button" role="menuitem" className="danger-text" ref={(element) => { deleteTriggerRefs.current[resume.id] = element }} onClick={() => { setConfirmId(resume.id); setMenuId(null) }}><Trash2 size={14} aria-hidden="true" />删除</button></div>}
      </div>
    })}</div></div>
    </div>
    <div className="mobile-template-panel" id="manager-template-panel" role="tabpanel" aria-labelledby="manager-template-tab" hidden={managerPane !== 'template'}><div className="mobile-template-heading"><span><p className="eyebrow">模板选择</p><strong>挑选你的版式</strong></span><small>即时应用</small></div><TemplatePicker pickerId="manager-template-picker" value={templateId} onChange={onTemplateChange} /></div>
    <p className="storage-note">内容自动保存至本地浏览器</p>
  </aside>{confirmId && <div className="confirm-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className="confirm-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><div className="confirm-dialog-mark" aria-hidden="true"><Trash2 size={20} strokeWidth={2.2} /></div><p className="eyebrow">不可逆操作 · 请确认</p><h3 id="delete-title">删除这份简历？</h3><p id="delete-description">删除“{resumes.find((resume) => resume.id === confirmId)?.title.trim() || '未命名简历'}”后内容无法恢复，请确认是否继续。</p><div className="dialog-actions"><button className="secondary-button" type="button" ref={cancelRef} onClick={closeDialog}>取消</button><button className="danger-button" type="button" onClick={() => { onDelete(confirmId); onCloseMobile(); closeDialog() }}>确认删除</button></div></div></div>}</>
}
