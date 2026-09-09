import { useRef, useState, type Ref } from 'react'
import { Eye, PencilLine } from 'lucide-react'
import type { Resume } from '../types/resume'
import ResumeEditor from './ResumeEditor'
import ResumePreview from './ResumePreview'

type ResumeWorkspaceProps = {
  resume: Resume
  onChange: (resume: Resume) => void
  previewRef: Ref<HTMLDivElement>
}

type MobilePane = 'editor' | 'preview'

export default function ResumeWorkspace({ resume, onChange, previewRef }: ResumeWorkspaceProps) {
  const [mobilePane, setMobilePane] = useState<MobilePane>('editor')
  const workbenchRef = useRef<HTMLElement>(null)
  const switchMobilePane = (nextPane: MobilePane) => {
    setMobilePane(nextPane)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches) {
      window.requestAnimationFrame(() => workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  return <section ref={workbenchRef} className="resume-workbench">
    <div className="workbench-heading">
      <div className="workbench-title"><p className="eyebrow">统一工作台</p><h1>{resume.title || '未命名简历'}</h1></div>
      <div className="workbench-heading-side">
        <span className="hint-text workbench-hint">编辑内容与实时预览统一同步</span>
      </div>
    </div>
    <div className="mobile-switcher" role="tablist" aria-label="切换工作区面板">
      <button id="resume-editor-tab" className={mobilePane === 'editor' ? 'is-active' : ''} type="button" role="tab" aria-selected={mobilePane === 'editor'} aria-controls="resume-editor-panel" onClick={() => switchMobilePane('editor')}><PencilLine size={15} aria-hidden="true" />编辑内容</button>
      <button id="resume-preview-tab" className={mobilePane === 'preview' ? 'is-active' : ''} type="button" role="tab" aria-selected={mobilePane === 'preview'} aria-controls="resume-preview-panel" onClick={() => switchMobilePane('preview')}><Eye size={15} aria-hidden="true" />实时预览</button>
    </div>
    <div className="workbench-body">
      <section id="resume-editor-panel" className={`editor-column ${mobilePane === 'editor' ? 'mobile-visible' : 'mobile-hidden'}`} role="tabpanel" aria-labelledby="resume-editor-tab"><ResumeEditor resume={resume} onChange={onChange} /></section>
      <section id="resume-preview-panel" className={`preview-column ${mobilePane === 'preview' ? 'mobile-visible' : 'mobile-hidden'}`} role="tabpanel" aria-labelledby="resume-preview-tab"><div className="preview-stage"><ResumePreview resume={resume} onChange={onChange} ref={previewRef} /></div></section>
    </div>
  </section>
}
