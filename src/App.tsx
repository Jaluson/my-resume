import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Save, X } from 'lucide-react'
import ResumeManager from './components/ResumeManager'
import ResumePreview from './components/ResumePreview'
import ResumeWorkspace from './components/ResumeWorkspace'
import ExportMenu from './components/ExportMenu'
import { clearRecovery, createBlankResume, loadResumeStore, makeId, saveResumeStore } from './store/resumeStore'
import { exportResumeToDocx, exportResumeToPdf } from './utils/export'
import LoadingIndicator from './components/LoadingIndicator'
import type { Resume, ResumeStore } from './types/resume'
import type { ResumeStoreLoad } from './store/resumeStore'

type SaveState = 'saved' | 'saving' | 'error'
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
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [error, setError] = useState('')
  const [loadWarning, setLoadWarning] = useState(loaded.warning ?? '')
  const [mobileManagerOpen, setMobileManagerOpen] = useState(false)
  const [dirty, setDirty] = useState(loaded.status === 'migrated')
  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const mobileManagerTriggerRef = useRef<HTMLButtonElement>(null)
  const storeRef = useRef(store)
  storeRef.current = store
  const currentResume = useMemo(() => store.resumes.find((resume) => resume.id === store.selectedResumeId) ?? store.resumes[0], [store])

  const persist = () => {
    setSaveState('saving')
    const saved = saveResumeStore(storeRef.current)
    setSaveState(saved ? 'saved' : 'error')
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

  const updateStore = (updater: (current: ResumeStore) => ResumeStore) => { setSaveState('saving'); setSaveError(false); setDirty(true); setStore(updater) }
  const updateResume = (nextResume: Resume) => updateStore((current) => ({ ...current, resumes: current.resumes.map((resume) => resume.id === nextResume.id ? touch(nextResume) : resume) }))
  const selectResume = (id: string) => updateStore((current) => ({ ...current, selectedResumeId: id }))
  const createResume = () => { const resume = createBlankResume(); updateStore((current) => ({ selectedResumeId: resume.id, resumes: [...current.resumes, resume] })) }
  const duplicateResume = (id: string) => {
    const source = storeRef.current.resumes.find((resume) => resume.id === id)
    if (!source) return
    const copy: Resume = { ...source, id: makeId(), title: `${source.title || '未命名简历'}（副本）`, updatedAt: new Date().toISOString(), profile: { ...source.profile }, experience: source.experience.map((item) => ({ ...item, id: makeId(), bullets: [...item.bullets] })), education: source.education.map((item) => ({ ...item, id: makeId() })), skills: [...source.skills], projects: source.projects.map((item) => ({ ...item, id: makeId(), bullets: [...item.bullets] })), languages: [...source.languages] }
    updateStore((current) => ({ selectedResumeId: copy.id, resumes: [...current.resumes, copy] }))
  }
  const renameResume = (id: string, title: string) => updateStore((current) => ({ ...current, resumes: current.resumes.map((resume) => resume.id === id ? touch({ ...resume, title: title.trim() || '未命名简历' }) : resume) }))
  const deleteResume = (id: string) => updateStore((current) => { const remaining = current.resumes.filter((resume) => resume.id !== id); if (!remaining.length) { const blank = createBlankResume(); return { selectedResumeId: blank.id, resumes: [blank] } } if (current.selectedResumeId !== id) return { ...current, resumes: remaining }; const deletedIndex = current.resumes.findIndex((resume) => resume.id === id); const nextResume = remaining[Math.min(deletedIndex, remaining.length - 1)]; return { selectedResumeId: nextResume.id, resumes: remaining } })

  const runExport = async (format: 'pdf' | 'docx') => {
    if (!currentResume) return
    const trigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    const startedAt = performance.now()
    setExporting(format); setError('')
    try {
      if (format === 'pdf') {
        const element = exportRef.current
        const bounds = element?.getBoundingClientRect()
        if (!element || !bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('找不到有效的 PDF 预览')
        await exportResumeToPdf(currentResume, element)
      } else await exportResumeToDocx(currentResume)
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : '导出失败，请稍后重试') } finally {
      const remaining = Math.max(0, 650 - (performance.now() - startedAt))
      await new Promise<void>((resolve) => window.setTimeout(resolve, remaining))
      setExporting(null)
      window.setTimeout(() => trigger?.focus(), 0)
    }
  }

  if (!currentResume) return null
  return <div className={`app-shell${exporting ? ' is-exporting' : ''}`}>
    <header className="topbar"><div className="brand"><span className="brand-mark"><BrandMark /></span><div className="brand-copy"><span>简历工坊</span><small>把经历，整理成机会</small></div></div><div className="topbar-actions"><span className={`save-status ${saveState}`} role="status" aria-live="polite">{saveState === 'saving' ? <LoadingIndicator label="保存中" /> : <><Save size={14} />{saveState === 'error' ? '保存失败' : '已保存'}</>}</span><button ref={mobileManagerTriggerRef} className="manager-toggle secondary-button" type="button" onClick={() => setMobileManagerOpen(true)} aria-label="管理简历" aria-expanded={mobileManagerOpen} aria-controls="resume-manager-panel"><FileText size={16} aria-hidden="true" /><span className="manager-button-label">管理简历</span></button><ExportMenu exporting={exporting} onExport={runExport} /></div></header>
    {exporting && <LoadingIndicator fullScreen label={exporting === 'pdf' ? '正在生成 PDF' : '正在生成 Word'} detail="正在整理版式与内容，请稍候" />}
    <main className="workspace"><div className="workspace-main"><ResumeManager resumes={store.resumes} selectedId={currentResume.id} onSelect={selectResume} onCreate={createResume} onDuplicate={duplicateResume} onRename={renameResume} onDelete={deleteResume} mobileOpen={mobileManagerOpen} onCloseMobile={() => setMobileManagerOpen(false)} mobileTriggerRef={mobileManagerTriggerRef} /><ResumeWorkspace resume={currentResume} onChange={updateResume} previewRef={previewRef} /></div></main>
    <div className="export-capture" aria-hidden="true"><ResumePreview resume={currentResume} interactive={false} ref={exportRef} /></div>
    {loadWarning && <div className="notice" role="alert"><span>{loadWarning}</span><button className="icon-button" type="button" onClick={() => { clearRecovery(); setLoadWarning('') }} aria-label="关闭恢复提示"><X size={17} /></button></div>}
    {saveError && <div className="toast save-error-toast" role="alert"><span>保存失败，建议立即导出。</span><button className="secondary-button" type="button" onClick={persist}>重试保存</button><button className="primary-button" type="button" onClick={() => runExport('pdf')}>导出 PDF</button><button className="icon-button" type="button" onClick={() => setSaveError(false)} aria-label="关闭保存提示"><X size={17} /></button></div>}
    {error && <div className="toast error-toast" role="alert"><span>{error}</span><button className="icon-button" type="button" onClick={() => setError('')} aria-label="关闭错误提示"><X size={17} /></button></div>}
  </div>
}
