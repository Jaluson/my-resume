import type { Ref } from 'react'
import type { Resume } from '../types/resume'
import ResumeEditor from './ResumeEditor'
import ResumePreview from './ResumePreview'

type ResumeWorkspaceProps = {
  resume: Resume
  onChange: (resume: Resume) => void
  mobilePane: 'edit' | 'preview'
  previewRef: Ref<HTMLDivElement>
}

export default function ResumeWorkspace({ resume, onChange, mobilePane, previewRef }: ResumeWorkspaceProps) {
  return <div className="resume-workbench">
    <section id="resume-editor-panel" className={`editor-column ${mobilePane === 'preview' ? 'mobile-hidden' : ''}`}>
      <div className="column-heading"><div><p className="eyebrow">编辑内容</p><h1>{resume.title || '未命名简历'}</h1></div><span className="hint-text">所有修改自动保存</span></div>
      <ResumeEditor resume={resume} onChange={onChange} />
    </section>
    <section id="resume-preview-panel" className={`preview-column ${mobilePane === 'edit' ? 'mobile-hidden' : ''}`}>
      <div className="preview-heading"><div><p className="eyebrow">实时预览</p><h2>A4 版式</h2></div><span className="preview-scale">适配预览</span></div>
      <div className="preview-stage"><ResumePreview resume={resume} onChange={onChange} ref={previewRef} /></div>
    </section>
  </div>
}
