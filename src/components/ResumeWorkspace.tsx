import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
import { ArrowUp, Eye, PencilLine } from 'lucide-react'
import type { Resume } from '../types/resume'
import ResumeEditor from './ResumeEditor'
import TemplatePicker from './TemplatePicker'
import ResumePreview from './ResumePreview'

type ResumeWorkspaceProps = {
  resume: Resume
  onChange: (resume: Resume) => void
  previewRef: Ref<HTMLDivElement>
}

type MobilePane = 'editor' | 'preview'
type DragPosition = { left: number; top: number }
type DragSession = { pointerId: number; startX: number; startY: number; originLeft: number; originTop: number; moved: boolean }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export default function ResumeWorkspace({ resume, onChange, previewRef }: ResumeWorkspaceProps) {
  const [mobilePane, setMobilePane] = useState<MobilePane>('editor')
  const [switcherExpanded, setSwitcherExpanded] = useState(false)
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const workbenchRef = useRef<HTMLElement>(null)
  const switcherRef = useRef<HTMLDivElement>(null)
  const dragSessionRef = useRef<DragSession | null>(null)
  const suppressClickRef = useRef(false)
  const switchMobilePane = (nextPane: MobilePane) => {
    setMobilePane(nextPane)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches) {
      window.requestAnimationFrame(() => workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }
  const handlePaneSelect = (nextPane: MobilePane) => {
    setSwitcherExpanded(true)
    switchMobilePane(nextPane)
  }
  const selectPane = (nextPane: MobilePane) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    handlePaneSelect(nextPane)
  }
  const onSwitcherPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    dragSessionRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originLeft: rect.left, originTop: rect.top, moved: false }
    setDragging(true)
  }
  const onSwitcherPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    const deltaX = event.clientX - session.startX
    const deltaY = event.clientY - session.startY
    if (!session.moved && Math.hypot(deltaX, deltaY) < 4) return
    session.moved = true
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    setDragPosition({
      left: clamp(session.originLeft + deltaX, 8, Math.max(8, window.innerWidth - rect.width - 8)),
      top: clamp(session.originTop + deltaY, 8, Math.max(8, window.innerHeight - rect.height - 8)),
    })
  }
  const onSwitcherPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragSessionRef.current = null
    setDragging(false)
    if (session.moved) {
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
  }
  useEffect(() => {
    if (!switcherExpanded) return
    const collapseOnPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !switcherRef.current?.contains(event.target)) setSwitcherExpanded(false)
    }
    const collapseOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSwitcherExpanded(false)
    }
    document.addEventListener('pointerdown', collapseOnPointer)
    document.addEventListener('keydown', collapseOnKey)
    return () => {
      document.removeEventListener('pointerdown', collapseOnPointer)
      document.removeEventListener('keydown', collapseOnKey)
    }
  }, [switcherExpanded])
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return <section ref={workbenchRef} className="resume-workbench">
    <div
      ref={switcherRef}
      className={`mobile-switcher${switcherExpanded ? ' is-expanded' : ''}${dragging ? ' is-dragging' : ''}`}
      style={dragPosition ? { left: dragPosition.left, top: dragPosition.top, right: 'auto' } : undefined}
      role="tablist"
      aria-label="切换工作区面板"
      aria-expanded={switcherExpanded}
      onPointerDown={onSwitcherPointerDown}
      onPointerMove={onSwitcherPointerMove}
      onPointerUp={onSwitcherPointerEnd}
      onPointerCancel={onSwitcherPointerEnd}
    >
      <button id="resume-editor-tab" className={mobilePane === 'editor' ? 'is-active' : ''} type="button" role="tab" aria-label="编辑" title="编辑" aria-selected={mobilePane === 'editor'} aria-controls="resume-editor-panel" onClick={() => selectPane('editor')}><PencilLine size={15} aria-hidden="true" /><span className="mobile-switcher-label">编辑</span></button>
      <button id="resume-preview-tab" className={mobilePane === 'preview' ? 'is-active' : ''} type="button" role="tab" aria-label="预览" title="预览" aria-selected={mobilePane === 'preview'} aria-controls="resume-preview-panel" onClick={() => selectPane('preview')}><Eye size={15} aria-hidden="true" /><span className="mobile-switcher-label">预览</span></button>
    </div>
    <div className="workbench-heading">
      <div className="workbench-title"><p className="eyebrow">统一工作台</p><h1>{resume.title || '未命名简历'}</h1></div>
      <div className="workbench-heading-side">
        <span className="hint-text workbench-hint">编辑内容与实时预览统一同步</span>
      </div>
    </div>
    <div className="workbench-template-panel">
      <div className="template-panel">
        <div className="template-panel-heading"><div><p className="eyebrow">版式风格</p><h3>选择模板</h3></div><span>即时应用</span></div>
        <TemplatePicker value={resume.templateId} onChange={(templateId) => onChange({ ...resume, templateId })} />
        <p className="hint-text">Word 导出保留内容与强调色，不复制现代模板的侧栏结构；需要视觉版式时请导出 PDF。</p>
      </div>
    </div>
    <div className="workbench-body">
      <section id="resume-editor-panel" className={`editor-column ${mobilePane === 'editor' ? 'mobile-visible' : 'mobile-hidden'}`} role="tabpanel" aria-labelledby="resume-editor-tab"><ResumeEditor resume={resume} onChange={onChange} /></section>
      <section id="resume-preview-panel" className={`preview-column ${mobilePane === 'preview' ? 'mobile-visible' : 'mobile-hidden'}`} role="tabpanel" aria-labelledby="resume-preview-tab"><div className="preview-stage"><ResumePreview resume={resume} onChange={onChange} ref={previewRef} /></div></section>
    </div>
    <button className="back-to-top-pin" type="button" onClick={scrollToTop} aria-label="返回顶部" title="返回顶部"><ArrowUp size={17} aria-hidden="true" /><span className="sr-only">返回顶部</span></button>
  </section>
}
