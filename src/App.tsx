import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, PanelLeft, PanelRight, Save, Sparkles, X } from 'lucide-react'
import ResumeEditor from './components/ResumeEditor'
import ResumeManager from './components/ResumeManager'
import ResumePreview from './components/ResumePreview'
import TemplatePicker from './components/TemplatePicker'
import { createBlankResume, loadResumeStore, saveResumeStore } from './store/resumeStore'
import { exportResumeToDocx, exportResumeToPdf } from './utils/export'
import type { Resume, ResumeStore } from './types/resume'

type SaveState = 'saved' | 'saving' | 'error'

const touch = (resume: Resume): Resume => ({ ...resume, updatedAt: new Date().toISOString() })

export default function App() {
  const [store, setStore] = useState<ResumeStore>(() => loadResumeStore())
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [error, setError] = useState('')
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const previewRef = useRef<HTMLDivElement>(null)
  const currentResume = useMemo(() => store.resumes.find((resume) => resume.id === store.selectedResumeId) ?? store.resumes[0], [store])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaveState(saveResumeStore(store) ? 'saved' : 'error')
    }, 300)
    return () => window.clearTimeout(timer)
  }, [store])

  const updateStore = (updater: (current: ResumeStore) => ResumeStore) => {
    setSaveState('saving')
    setStore(updater)
  }

  const updateResume = (nextResume: Resume) => {
    updateStore((current) => ({ ...current, resumes: current.resumes.map((resume) => resume.id === nextResume.id ? touch(nextResume) : resume) }))
  }

  const selectResume = (id: string) => updateStore((current) => ({ ...current, selectedResumeId: id }))

  const createResume = () => {
    const resume = createBlankResume()
    updateStore((current) => ({ selectedResumeId: resume.id, resumes: [...current.resumes, resume] }))
  }

  const duplicateResume = (id: string) => {
    const source = store.resumes.find((resume) => resume.id === id)
    if (!source) return
    const copy: Resume = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title || '未命名简历'}（副本）`,
      updatedAt: new Date().toISOString(),
      profile: { ...source.profile },
      experience: source.experience.map((item) => ({ ...item, id: crypto.randomUUID(), bullets: [...item.bullets] })),
      education: source.education.map((item) => ({ ...item, id: crypto.randomUUID() })),
      skills: [...source.skills],
      projects: source.projects.map((item) => ({ ...item, id: crypto.randomUUID(), bullets: [...item.bullets] })),
      languages: [...source.languages],
    }
    updateStore((current) => ({ selectedResumeId: copy.id, resumes: [...current.resumes, copy] }))
  }

  const renameResume = (id: string, title: string) => updateStore((current) => ({ ...current, resumes: current.resumes.map((resume) => resume.id === id ? touch({ ...resume, title: title.trim() || '未命名简历' }) : resume) }))

  const deleteResume = (id: string) => {
    updateStore((current) => {
      const remaining = current.resumes.filter((resume) => resume.id !== id)
      if (remaining.length === 0) {
        const blank = createBlankResume()
        return { selectedResumeId: blank.id, resumes: [blank] }
      }
      if (current.selectedResumeId !== id) return { ...current, resumes: remaining }
      const deletedIndex = current.resumes.findIndex((resume) => resume.id === id)
      const nextResume = remaining[Math.min(deletedIndex, remaining.length - 1)]
      return { selectedResumeId: nextResume.id, resumes: remaining }
    })
  }

  const runExport = async (format: 'pdf' | 'docx') => {
    if (!currentResume) return
    setExporting(format)
    setError('')
    try {
      if (format === 'pdf') {
        if (!previewRef.current) throw new Error('找不到简历预览')
        await exportResumeToPdf(currentResume, previewRef.current)
      } else {
        await exportResumeToDocx(currentResume)
      }
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : '导出失败，请稍后重试')
    } finally {
      setExporting(null)
    }
  }

  if (!currentResume) return null

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>简历工坊</span></div>
      <div className="topbar-center"><span className="topbar-label">当前简历</span><select value={currentResume.id} onChange={(event) => selectResume(event.target.value)} aria-label="选择当前简历">{store.resumes.map((resume) => <option value={resume.id} key={resume.id}>{resume.title || '未命名简历'}</option>)}</select></div>
      <div className="topbar-actions"><span className={`save-status ${saveState}`}><Save size={14} />{saveState === 'saving' ? '保存中' : saveState === 'error' ? '保存失败' : '已保存'}</span><button className="export-button secondary-button" type="button" onClick={() => runExport('docx')} disabled={Boolean(exporting)}><FileText size={16} />{exporting === 'docx' ? '生成中…' : 'Word'}</button><button className="export-button primary-button" type="button" onClick={() => runExport('pdf')} disabled={Boolean(exporting)}><Download size={16} />{exporting === 'pdf' ? '生成中…' : '导出 PDF'}</button></div>
    </header>
    <div className="mobile-switcher"><button className={mobilePane === 'edit' ? 'is-active' : ''} type="button" onClick={() => setMobilePane('edit')}><PanelLeft size={16} />编辑</button><button className={mobilePane === 'preview' ? 'is-active' : ''} type="button" onClick={() => setMobilePane('preview')}><PanelRight size={16} />预览</button></div>
    <main className="workspace">
      <ResumeManager resumes={store.resumes} selectedId={currentResume.id} onSelect={selectResume} onCreate={createResume} onDuplicate={duplicateResume} onRename={renameResume} onDelete={deleteResume} />
      <section className={`editor-column ${mobilePane === 'preview' ? 'mobile-hidden' : ''}`}><div className="column-heading"><div><p className="eyebrow">编辑内容</p><h1>{currentResume.title || '未命名简历'}</h1></div><span className="hint-text">所有修改自动保存</span></div><ResumeEditor resume={currentResume} onChange={updateResume} /></section>
      <section className={`preview-column ${mobilePane === 'edit' ? 'mobile-hidden' : ''}`}><div className="preview-heading"><div><p className="eyebrow">实时预览</p><h2>A4 版式</h2></div><span className="preview-scale">100%</span></div><div className="preview-stage"><ResumePreview resume={currentResume} ref={previewRef} /></div><div className="template-panel"><div className="template-panel-heading"><div><p className="eyebrow">版式风格</p><h3>选择模板</h3></div><span>即时应用</span></div><TemplatePicker value={currentResume.templateId} onChange={(templateId) => updateResume({ ...currentResume, templateId })} /></div></section>
    </main>
    {error && <div className="toast error-toast" role="alert"><span>{error}</span><button className="icon-button" type="button" onClick={() => setError('')} aria-label="关闭错误提示"><X size={17} /></button></div>}
  </div>
}
