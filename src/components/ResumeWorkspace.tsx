import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react'
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
type DragSession = {
  pointerId: number
  startX: number
  startY: number
  originLeft: number
  originTop: number
  currentLeft: number
  currentTop: number
  moved: boolean
}
type ViewportBounds = { minLeft: number; maxLeft: number; minTop: number; maxTop: number }

const DRAG_THRESHOLD = 4
const VIEWPORT_EDGE_GAP = 8

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const getViewportBounds = (element: HTMLElement): ViewportBounds => {
  const rect = element.getBoundingClientRect()
  const viewport = window.visualViewport
  const viewportLeft = viewport?.offsetLeft ?? 0
  const viewportTop = viewport?.offsetTop ?? 0
  const viewportWidth = viewport && viewport.width > 0 ? viewport.width : window.innerWidth
  const viewportHeight = viewport && viewport.height > 0 ? viewport.height : window.innerHeight
  return {
    minLeft: viewportLeft + VIEWPORT_EDGE_GAP,
    maxLeft: Math.max(viewportLeft + VIEWPORT_EDGE_GAP, viewportLeft + viewportWidth - rect.width - VIEWPORT_EDGE_GAP),
    minTop: viewportTop + VIEWPORT_EDGE_GAP,
    maxTop: Math.max(viewportTop + VIEWPORT_EDGE_GAP, viewportTop + viewportHeight - rect.height - VIEWPORT_EDGE_GAP),
  }
}
const constrainPosition = (position: DragPosition, element: HTMLElement): DragPosition => {
  const bounds = getViewportBounds(element)
  return {
    left: clamp(position.left, bounds.minLeft, bounds.maxLeft),
    top: clamp(position.top, bounds.minTop, bounds.maxTop),
  }
}
const snapToNearestEdge = (position: DragPosition, element: HTMLElement): DragPosition => {
  const bounds = getViewportBounds(element)
  const constrained = constrainPosition(position, element)
  return {
    left: constrained.left - bounds.minLeft <= bounds.maxLeft - constrained.left ? bounds.minLeft : bounds.maxLeft,
    top: constrained.top,
  }
}

export default function ResumeWorkspace({ resume, onChange, previewRef }: ResumeWorkspaceProps) {
  const [mobilePane, setMobilePane] = useState<MobilePane>('editor')
  const [switcherExpanded, setSwitcherExpanded] = useState(false)
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const workbenchRef = useRef<HTMLElement>(null)
  const switcherRef = useRef<HTMLDivElement>(null)
  const dragSessionRef = useRef<DragSession | null>(null)
  const dragPositionRef = useRef<DragPosition | null>(null)
  const suppressClickRef = useRef(false)
  dragPositionRef.current = dragPosition
  const finishDrag = (event: PointerEvent) => {
    const switcher = switcherRef.current
    const session = dragSessionRef.current
    if (!switcher || !session || session.pointerId !== event.pointerId) return
    dragSessionRef.current = null
    setDragging(false)
    if (session.moved) {
      const snappedPosition = snapToNearestEdge({
        left: session.currentLeft,
        top: session.currentTop,
      }, switcher)
      dragPositionRef.current = snappedPosition
      setDragPosition(snappedPosition)
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    if (switcher.hasPointerCapture(event.pointerId)) switcher.releasePointerCapture(event.pointerId)
  }
  useEffect(() => {
    const switcher = switcherRef.current
    if (!switcher) return
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
      if (getComputedStyle(switcher).position !== 'fixed' || dragSessionRef.current) return
      const rect = switcher.getBoundingClientRect()
      dragSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft: rect.left,
        originTop: rect.top,
        currentLeft: rect.left,
        currentTop: rect.top,
        moved: false,
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      const session = dragSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      const deltaX = event.clientX - session.startX
      const deltaY = event.clientY - session.startY
      if (!session.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return
      if (!session.moved) {
        session.moved = true
        setDragging(true)
        try {
          switcher.setPointerCapture(event.pointerId)
        } catch {
          // Window listeners still keep the drag alive when capture is unavailable.
        }
      }
      event.preventDefault()
      const position = constrainPosition({
        left: session.originLeft + deltaX,
        top: session.originTop + deltaY,
      }, switcher)
      session.currentLeft = position.left
      session.currentTop = position.top
      dragPositionRef.current = position
      setDragPosition(position)
    }
    const onPointerEnd = (event: PointerEvent) => finishDrag(event)
    switcher.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
    window.addEventListener('pointerup', onPointerEnd, true)
    window.addEventListener('pointercancel', onPointerEnd, true)
    switcher.addEventListener('lostpointercapture', onPointerEnd)
    return () => {
      switcher.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerEnd, true)
      window.removeEventListener('pointercancel', onPointerEnd, true)
      switcher.removeEventListener('lostpointercapture', onPointerEnd)
      if (dragSessionRef.current) dragSessionRef.current = null
    }
  }, [])
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
  useLayoutEffect(() => {
    const switcher = switcherRef.current
    if (!switcher) return
    let frameId: number | null = null
    const reclamp = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        const element = switcherRef.current
        const position = dragPositionRef.current
        if (!element || !position) return
        const constrained = constrainPosition(position, element)
        if (constrained.left === position.left && constrained.top === position.top) return
        dragPositionRef.current = constrained
        setDragPosition(constrained)
      })
    }
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === switcher && event.propertyName === 'width') reclamp()
    }
    switcher.addEventListener('transitionend', onTransitionEnd)
    reclamp()
    return () => {
      switcher.removeEventListener('transitionend', onTransitionEnd)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [switcherExpanded])
  useEffect(() => {
    let frameId: number | null = null
    const reclamp = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        const element = switcherRef.current
        const position = dragPositionRef.current
        if (!element || !position) return
        const constrained = constrainPosition(position, element)
        if (constrained.left === position.left && constrained.top === position.top) return
        dragPositionRef.current = constrained
        setDragPosition(constrained)
      })
    }
    const viewport = window.visualViewport
    window.addEventListener('resize', reclamp)
    viewport?.addEventListener('resize', reclamp)
    return () => {
      window.removeEventListener('resize', reclamp)
      viewport?.removeEventListener('resize', reclamp)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])
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
