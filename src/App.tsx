import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, CheckCircle2, FileText, X } from 'lucide-react'
import ResumeManager from './components/ResumeManager'
import ResumePreview from './components/ResumePreview'
import ResumeWorkspace from './components/ResumeWorkspace'
import ExportMenu, { type ExportFormat } from './components/ExportMenu'
import { clearRecovery, createBlankResume, loadResumeStore, makeId, saveResumeStore } from './store/resumeStore'
import { exportResumeToDocx, exportResumeToPdf } from './utils/export'
import LoadingIndicator from './components/LoadingIndicator'
import type { Resume, ResumeStore } from './types/resume'
import type { ResumeStoreLoad } from './store/resumeStore'

const touch = (resume: Resume): Resume => ({ ...resume, updatedAt: new Date().toISOString() })

function BrandMark() {
  return (
    <svg className="brand-mark-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brand-mark-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f6ff5" />
          <stop offset="1" stopColor="#1746b8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#brand-mark-gradient)" />
      <path d="M9.25 6.75h9.1l4.4 4.4v13.1H9.25z" fill="none" stroke="#fff" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M18.35 6.75v4.4h4.4" fill="none" stroke="#bfdbfe" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M12.3 15h6.2M12.3 18.35h4.35" fill="none" stroke="#dbeafe" strokeWidth="1.45" strokeLinecap="round" />
      <path d="m12.1 23.55 1.05-3.2 7.85-7.85 2.55 2.55-7.85 7.85z" fill="#fff" stroke="#fff" strokeWidth=".7" strokeLinejoin="round" />
      <path d="m19.55 13.75 2.55 2.55" fill="none" stroke="#78a9ff" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  )
}


export default function App() {
  const [loaded] = useState<ResumeStoreLoad>(() => loadResumeStore())
  const [store, setStore] = useState<ResumeStore>(loaded.store)
  const [saveError, setSaveError] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [exportSuccess, setExportSuccess] = useState<ExportFormat | null>(null)
  const [error, setError] = useState('')
  const [loadWarning, setLoadWarning] = useState(loaded.warning ?? '')
  const [mobileManagerOpen, setMobileManagerOpen] = useState(false)
  const [backToTopPhase, setBackToTopPhase] = useState<'hidden' | 'visible' | 'exiting'>('hidden')
  const [dirty, setDirty] = useState(loaded.status === 'migrated')
  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const mobileManagerTriggerRef = useRef<HTMLButtonElement>(null)
  const exportReturnFocusRef = useRef<(() => void) | undefined>(undefined)
  const storeRef = useRef(store)
  storeRef.current = store
  const currentResume = useMemo(() => store.resumes.find((resume) => resume.id === store.selectedResumeId) ?? store.resumes[0], [store])

  const persist = () => {
    const saved = saveResumeStore(storeRef.current)
    setSaveError(!saved)
    if (saved) setDirty(false)
  }

  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(persist, 300)
    return () => window.clearTimeout(timer)
  }, [store, dirty])

  useEffect(() => {
    const flush = () => { if (dirty || loaded.status === 'migrated') saveResumeStore(storeRef.current) }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [dirty, loaded.status])
  useEffect(() => {
    if (!exportSuccess) return
    const dialog = document.querySelector<HTMLElement>('.export-success-modal')
    const controls = () => Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
    const focusFirst = () => controls()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeExportSuccess()
        return
      }
      if (event.key !== 'Tab') return
      const items = controls()
      if (!items.length) return
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      event.preventDefault()
      items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus()
    }
    document.addEventListener('keydown', onKeyDown)
    window.requestAnimationFrame(focusFirst)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [exportSuccess])

  const updateStore = (updater: (current: ResumeStore) => ResumeStore) => { setSaveError(false); setDirty(true); setStore(updater) }
  const updateResume = (nextResume: Resume) => updateStore((current) => ({ ...current, resumes: current.resumes.map((resume) => resume.id === nextResume.id ? touch(nextResume) : resume) }))
  const selectResume = (id: string) => updateStore((current) => ({ ...current, selectedResumeId: id }))
  useEffect(() => {
    const onScroll = () => setBackToTopPhase((phase) => {
      if (window.scrollY > 240) return 'visible'
      return phase === 'visible' ? 'exiting' : phase
    })
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (backToTopPhase !== 'exiting') return undefined
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 220
    const timer = window.setTimeout(() => setBackToTopPhase('hidden'), duration)
    return () => window.clearTimeout(timer)
  }, [backToTopPhase])
  const createResume = () => { const resume = createBlankResume(); updateStore((current) => ({ selectedResumeId: resume.id, resumes: [...current.resumes, resume] })) }
  const duplicateResume = (id: string) => {
    const source = storeRef.current.resumes.find((resume) => resume.id === id)
    if (!source) return
    const copy: Resume = { ...source, id: makeId(), title: `${source.title || '未命名简历'}（副本）`, updatedAt: new Date().toISOString(), profile: { ...source.profile }, experience: source.experience.map((item) => ({ ...item, id: makeId(), bullets: [...item.bullets] })), education: source.education.map((item) => ({ ...item, id: makeId() })), skills: [...source.skills], projects: source.projects.map((item) => ({ ...item, id: makeId(), bullets: [...item.bullets] })), languages: [...source.languages] }
    updateStore((current) => ({ selectedResumeId: copy.id, resumes: [...current.resumes, copy] }))
  }
  const renameResume = (id: string, title: string) => updateStore((current) => ({ ...current, resumes: current.resumes.map((resume) => resume.id === id ? touch({ ...resume, title: title.trim() || '未命名简历' }) : resume) }))
  const deleteResume = (id: string) => updateStore((current) => { const remaining = current.resumes.filter((resume) => resume.id !== id); if (!remaining.length) { const blank = createBlankResume(); return { selectedResumeId: blank.id, resumes: [blank] } } if (current.selectedResumeId !== id) return { ...current, resumes: remaining }; const deletedIndex = current.resumes.findIndex((resume) => resume.id === id); const nextResume = remaining[Math.min(deletedIndex, remaining.length - 1)]; return { selectedResumeId: nextResume.id, resumes: remaining } })

  const closeExportSuccess = () => {
    setExportSuccess(null)
    window.requestAnimationFrame(() => {
      exportReturnFocusRef.current?.()
      exportReturnFocusRef.current = undefined
    })
  }

  const runExport = async (format: ExportFormat, returnFocus?: () => void) => {
    if (!currentResume) return
    exportReturnFocusRef.current = returnFocus
    setExporting(format)
    setExportSuccess(null)
    setError('')
    try {
      if (format === 'pdf') {
        const element = exportRef.current
        const bounds = element?.getBoundingClientRect()
        if (!element || !bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('找不到有效的 PDF 预览')
        await exportResumeToPdf(currentResume, element)
      } else await exportResumeToDocx(currentResume)
      setExportSuccess(format)
    } catch (exportError) {
      setExportSuccess(null)
      exportReturnFocusRef.current = undefined
      setError(exportError instanceof Error ? exportError.message : '导出失败，请稍后重试')
    } finally {
      setExporting(null)
    }
  }

  if (!currentResume) return null
  return <div className={`app-shell${exporting ? ' is-exporting' : ''}`}>
    <header className="topbar"><div className="brand"><span className="brand-mark"><BrandMark /></span><div className="brand-copy"><span>简历工坊</span><small>把经历，整理成机会</small></div></div><div className="topbar-actions"><button ref={mobileManagerTriggerRef} className="manager-toggle secondary-button" type="button" onClick={() => setMobileManagerOpen(true)} aria-label="管理简历" aria-expanded={mobileManagerOpen} aria-controls="resume-manager-panel"><FileText size={16} aria-hidden="true" /><span className="manager-button-label">管理简历</span></button><ExportMenu exporting={exporting} onExport={runExport} /></div></header>
    {exporting && <LoadingIndicator fullScreen label={exporting === 'pdf' ? '正在生成 PDF' : '正在生成 Word'} detail="正在整理版式与内容，请稍候" />}
    <main className="workspace">
      <div className="workspace-main">
        <ResumeManager resumes={store.resumes} selectedId={currentResume.id} templateId={currentResume.templateId} onSelect={selectResume} onTemplateChange={(templateId) => updateResume({ ...currentResume, templateId })} onCreate={createResume} onDuplicate={duplicateResume} onRename={renameResume} onDelete={deleteResume} mobileOpen={mobileManagerOpen} onCloseMobile={() => setMobileManagerOpen(false)} mobileTriggerRef={mobileManagerTriggerRef} />
        <ResumeWorkspace resume={currentResume} onChange={updateResume} previewRef={previewRef} />
      </div>
    </main>
    <button className={`back-to-top-pin${backToTopPhase === 'visible' ? ' is-visible' : ''}${backToTopPhase === 'exiting' ? ' is-exiting' : ''}`} type="button" onClick={() => { const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; window.scrollTo({ top: 0, behavior }) }} aria-label="返回顶层" aria-hidden={backToTopPhase !== 'visible'} tabIndex={backToTopPhase === 'visible' ? 0 : -1}><ArrowUp size={16} aria-hidden="true" /><span>顶层</span></button>
    <div className="export-capture" aria-hidden="true"><ResumePreview resume={currentResume} interactive={false} ref={exportRef} /></div>
    {exportSuccess && <div className="export-success-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeExportSuccess() }}>
      <div className="export-success-modal" role="dialog" aria-modal="true" aria-labelledby="export-success-title" aria-describedby="export-success-hint">
        <div className="modal-orbit" aria-hidden="true"><span className="modal-orbit-ring modal-orbit-ring-one" /><span className="modal-orbit-ring modal-orbit-ring-two" /><span className="modal-orbit-core"><CheckCircle2 size={25} strokeWidth={2.1} /></span></div>
        <div className="export-modal-heading"><div><p className="eyebrow">文件已生成 · 已就绪</p><h2 id="export-success-title">{exportSuccess === 'pdf' ? 'PDF 已导出' : 'Word 已导出'}</h2></div><button className="icon-button" type="button" onClick={closeExportSuccess} aria-label="关闭导出提示"><X size={18} aria-hidden="true" /></button></div>
        <p className="export-modal-hint" id="export-success-hint">文件已下载到浏览器默认下载位置，可以继续编辑当前简历。</p>
        <button className="primary-button export-success-confirm" type="button" onClick={closeExportSuccess}>知道了</button>
      </div>
    </div>}
    {loadWarning && <div className="notice" role="alert"><span>{loadWarning}</span><button className="icon-button" type="button" onClick={() => { clearRecovery(); setLoadWarning('') }} aria-label="关闭并删除恢复备份"><X size={17} aria-hidden="true" /></button></div>}
    {saveError && <div className="toast save-error-toast" role="alert"><span>保存失败，建议立即导出。</span><button className="secondary-button" type="button" onClick={persist}>重试保存</button><button className="primary-button" type="button" onClick={() => runExport('pdf')}>导出 PDF</button><button className="icon-button" type="button" onClick={() => setSaveError(false)} aria-label="关闭保存提示"><X size={17} /></button></div>}
    {error && <div className="toast error-toast" role="alert"><span>{error}</span><button className="icon-button" type="button" onClick={() => setError('')} aria-label="关闭错误提示"><X size={17} /></button></div>}
  </div>
}
