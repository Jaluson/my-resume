import type { Ref } from 'react'
import type { Resume } from '../types/resume'
import ResumeEditor from './ResumeEditor'
import ResumePreview from './ResumePreview'

type ResumeWorkspaceProps = {
  resume: Resume
  onChange: (resume: Resume) => void
  previewRef: Ref<HTMLDivElement>
}

export default function ResumeWorkspace({ resume, onChange, previewRef }: ResumeWorkspaceProps) {
  return <section className="resume-workbench">
    <div className="workbench-heading"><div><p className="eyebrow">统一工作台</p><h1>{resume.title || '未命名简历'}</h1></div><span className="hint-text">编辑内容与实时预览统一同步</span></div>
    <div className="workbench-body">
      <section id="resume-editor-panel" className="editor-column"><ResumeEditor resume={resume} onChange={onChange} /></section>
      <section id="resume-preview-panel" className="preview-column"><div className="preview-stage"><ResumePreview resume={resume} onChange={onChange} ref={previewRef} /></div></section>
    </div>
  </section>
}
