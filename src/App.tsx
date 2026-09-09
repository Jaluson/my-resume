import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, PanelLeft, PanelRight, Save, Sparkles, X } from 'lucide-react'
import ResumeEditor from './components/ResumeEditor'
import ResumeManager from './components/ResumeManager'
import ResumePreview from './components/ResumePreview'
import TemplatePicker from './components/TemplatePicker'
import { clearRecovery, createBlankResume, loadResumeStore, makeId, saveResumeStore } from './store/resumeStore'
import { exportResumeToDocx, exportResumeToPdf } from './utils/export'
import type { Resume, ResumeStore } from './types/resume'
import type { ResumeStoreLoad } from './store/resumeStore'

type SaveState = 'saved' | 'saving' | 'error'
const touch = (resume: Resume): Resume => ({ ...resume, updatedAt: new Date().toISOString() })

export default function App() {
  const [loaded] = useState<ResumeStoreLoad>(() => loadResumeStore())
  const [store, setStore] = useState<ResumeStore>(loaded.store)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [error, setError] = useState('')
  const [loadWarning, setLoadWarning] = useState(loaded.warning ?? '')
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const [mobileManagerOpen, setMobileManagerOpen] = useState(false)
  const [dirty, setDirty] = useState(loaded.status === 'migrated')
  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
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
    setExporting(format); setError('')
    try {
      if (format === 'pdf') {
        const element = exportRef.current
        const bounds = element?.getBoundingClientRect()
        if (!element || !bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('找不到有效的 PDF 预览')
        await exportResumeToPdf(currentResume, element)
      } else await exportResumeToDocx(currentResume)
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : '导出失败，请稍后重试') } finally { setExporting(null) }
  }

  if (!currentResume) return null
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>简历工坊</span></div><div className="topbar-center"><span className="topbar-label">当前简历</span><select value={currentResume.id} onChange={(event) => selectResume(event.target.value)} aria-label="选择当前简历">{store.resumes.map((resume) => <option value={resume.id} key={resume.id}>{resume.title || '未命名简历'}</option>)}</select></div><div className="topbar-actions"><span className={`save-status ${saveState}`} role="status" aria-live="polite"><Save size={14} />{saveState === 'saving' ? '保存中' : saveState === 'error' ? '保存失败' : '已保存'}</span><button className="manager-toggle secondary-button" type="button" onClick={() => setMobileManagerOpen(true)} aria-label="管理简历" aria-expanded={mobileManagerOpen} aria-controls="resume-manager-panel"><FileText size={16} />管理简历</button><button className="export-button secondary-button" type="button" onClick={() => runExport('docx')} disabled={Boolean(exporting)} aria-label="导出 Word" aria-busy={exporting === 'docx'}><FileText size={16} />{exporting === 'docx' ? '生成中…' : 'Word'}</button><button className="export-button primary-button" type="button" onClick={() => runExport('pdf')} disabled={Boolean(exporting)} aria-label="导出 PDF" aria-busy={exporting === 'pdf'}><Download size={16} />{exporting === 'pdf' ? '生成中…' : '导出 PDF'}</button></div></header>
    <div className="mobile-switcher" role="group" aria-label="切换简历面板"><button className={mobilePane === 'edit' ? 'is-active' : ''} type="button" onClick={() => setMobilePane('edit')} aria-pressed={mobilePane === 'edit'} aria-controls="resume-editor-panel"><PanelLeft size={16} aria-hidden="true" />编辑</button><button className={mobilePane === 'preview' ? 'is-active' : ''} type="button" onClick={() => setMobilePane('preview')} aria-pressed={mobilePane === 'preview'} aria-controls="resume-preview-panel"><PanelRight size={16} aria-hidden="true" />预览</button></div>
    <main className="workspace"><ResumeManager resumes={store.resumes} selectedId={currentResume.id} onSelect={selectResume} onCreate={createResume} onDuplicate={duplicateResume} onRename={renameResume} onDelete={deleteResume} mobileOpen={mobileManagerOpen} onCloseMobile={() => setMobileManagerOpen(false)} /><section id="resume-editor-panel" className={`editor-column ${mobilePane === 'preview' ? 'mobile-hidden' : ''}`}><div className="column-heading"><div><p className="eyebrow">编辑内容</p><h1>{currentResume.title || '未命名简历'}</h1></div><span className="hint-text">所有修改自动保存</span></div><ResumeEditor resume={currentResume} onChange={updateResume} /></section><section id="resume-preview-panel" className={`preview-column ${mobilePane === 'edit' ? 'mobile-hidden' : ''}`}><div className="preview-heading"><div><p className="eyebrow">实时预览</p><h2>A4 版式</h2></div><span className="preview-scale">适配预览</span></div><div className="template-panel"><div className="template-panel-heading"><div><p className="eyebrow">版式风格</p><h3>选择模板</h3></div><span>即时应用</span></div><TemplatePicker value={currentResume.templateId} onChange={(templateId) => updateResume({ ...currentResume, templateId })} /><p className="hint-text">Word 导出保留内容与强调色，不复制现代模板的侧栏结构；需要视觉版式时请导出 PDF。</p></div><div className="preview-stage"><ResumePreview resume={currentResume} ref={previewRef} /></div></section></main>
    <div className="export-capture" aria-hidden="true"><ResumePreview resume={currentResume} interactive={false} ref={exportRef} /></div>
    {loadWarning && <div className="notice" role="alert"><span>{loadWarning}</span><button className="icon-button" type="button" onClick={() => { clearRecovery(); setLoadWarning('') }} aria-label="关闭恢复提示"><X size={17} /></button></div>}
    {saveError && <div className="toast save-error-toast" role="alert"><span>保存失败，建议立即导出。</span><button className="secondary-button" type="button" onClick={persist}>重试保存</button><button className="primary-button" type="button" onClick={() => runExport('pdf')}>导出 PDF</button><button className="icon-button" type="button" onClick={() => setSaveError(false)} aria-label="关闭保存提示"><X size={17} /></button></div>}
    {error && <div className="toast error-toast" role="alert"><span>{error}</span><button className="icon-button" type="button" onClick={() => setError('')} aria-label="关闭错误提示"><X size={17} /></button></div>}
  </div>
}
