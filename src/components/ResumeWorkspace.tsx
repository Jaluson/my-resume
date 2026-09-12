import { Fragment, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type Ref } from 'react'
import { Eye, FileText, GripVertical, PencilLine, Pin } from 'lucide-react'
import type { Resume } from '../types/resume'
import ResumeEditor from './ResumeEditor'
import TemplatePicker from './TemplatePicker'
import ResumePreview from './ResumePreview'

type ResumeWorkspaceProps = {
  resume: Resume
  onChange: (resume: Resume) => void
  previewRef: Ref<HTMLDivElement>
}

type DesktopPane = 'editor' | 'preview'
type MobilePane = DesktopPane
type DragSession = {
  pointerId: number
  startX: number
  startY: number
  originLeft: number
  originTop: number
  currentLeft: number
  currentTop: number
  moved: boolean
  isFloating: boolean
  targetPane: MobilePane | null
}
type ViewportBounds = { minLeft: number; maxLeft: number; minTop: number; maxTop: number }
type DragPosition = { left: number; top: number }

const DRAG_THRESHOLD = 4
const SWIPE_THRESHOLD = 10
const VIEWPORT_EDGE_GAP = 8
const TRANSITION_SETTLE_MS = 360
const SWITCHER_FEEDBACK_MS = 520

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
  const [paneOrder, setPaneOrder] = useState<DesktopPane[]>(['editor', 'preview'])
  const [previewFrozen, setPreviewFrozen] = useState(true)
  const [draggedPane, setDraggedPane] = useState<DesktopPane | null>(null)
  const [dragOverPane, setDragOverPane] = useState<DesktopPane | null>(null)
  const [paneSwapPulse, setPaneSwapPulse] = useState(false)
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const [transitionKind, setTransitionKind] = useState<'resume' | 'template' | null>(null)
  const [switcherPulse, setSwitcherPulse] = useState(false)
  const previousPaneRef = useRef<MobilePane>(mobilePane)
  const workbenchRef = useRef<HTMLElement>(null)
  const switcherRef = useRef<HTMLDivElement>(null)
  const previousResumeRef = useRef({ id: resume.id, templateId: resume.templateId })
  const transitionTimerRef = useRef<number | null>(null)
  const paneSwapTimerRef = useRef<number | null>(null)
  const dragSessionRef = useRef<DragSession | null>(null)
  const dragPositionRef = useRef<DragPosition | null>(null)
  const suppressClickRef = useRef(false)
  const startPaneDrag = (pane: DesktopPane, event: DragEvent<HTMLElement>) => {
    setDraggedPane(pane)
    setDragOverPane(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', pane)
    const panel = event.currentTarget.closest<HTMLElement>('.editor-column, .preview-column')
    if (panel) {
      const rect = panel.getBoundingClientRect()
      event.dataTransfer.setDragImage(panel, Math.max(0, event.clientX - rect.left), Math.max(0, event.clientY - rect.top))
    }
  }
  const finishPaneDrag = () => {
    setDraggedPane(null)
    setDragOverPane(null)
  }
  const swapPanes = (sourcePane: DesktopPane) => {
    const targetPane: DesktopPane = sourcePane === 'editor' ? 'preview' : 'editor'
    setPaneOrder([targetPane, sourcePane])
    setPaneSwapPulse(true)
    if (paneSwapTimerRef.current !== null) window.clearTimeout(paneSwapTimerRef.current)
    paneSwapTimerRef.current = window.setTimeout(() => {
      paneSwapTimerRef.current = null
      setPaneSwapPulse(false)
    }, 420)
  }
  const dropPane = (targetPane: DesktopPane, event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const sourcePane = draggedPane ?? event.dataTransfer.getData('text/plain') as DesktopPane
    if (!sourcePane || sourcePane === targetPane) {
      finishPaneDrag()
      return
    }
    swapPanes(sourcePane)
    finishPaneDrag()
  }
  useEffect(() => () => {
    if (paneSwapTimerRef.current !== null) window.clearTimeout(paneSwapTimerRef.current)
  }, [])
  useEffect(() => {
    const clearNativeDrag = () => finishPaneDrag()
    window.addEventListener('dragend', clearNativeDrag)
    window.addEventListener('drop', clearNativeDrag)
    window.addEventListener('blur', clearNativeDrag)
    document.addEventListener('visibilitychange', clearNativeDrag)
    return () => {
      window.removeEventListener('dragend', clearNativeDrag)
      window.removeEventListener('drop', clearNativeDrag)
      window.removeEventListener('blur', clearNativeDrag)
      document.removeEventListener('visibilitychange', clearNativeDrag)
    }
  }, [])
  useEffect(() => {
    const previous = previousResumeRef.current
    const kind = previous.id !== resume.id ? 'resume' : previous.templateId !== resume.templateId ? 'template' : null
    previousResumeRef.current = { id: resume.id, templateId: resume.templateId }
    if (!kind) return
    setTransitionKind(kind)
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null
      setTransitionKind(null)
    }, TRANSITION_SETTLE_MS)
    return () => {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
    }
  }, [resume.id, resume.templateId])
  useEffect(() => {
    if (previousPaneRef.current === mobilePane) return
    previousPaneRef.current = mobilePane
    setSwitcherPulse(true)
    const timer = window.setTimeout(() => setSwitcherPulse(false), SWITCHER_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [mobilePane])
  dragPositionRef.current = dragPosition
  const finishDrag = (event: PointerEvent) => {
    const switcher = switcherRef.current
    const session = dragSessionRef.current
    if (!switcher || !session || session.pointerId !== event.pointerId) return
    dragSessionRef.current = null
    setDragging(false)
    if (session.moved) {
      if (session.isFloating) {
        const snappedPosition = snapToNearestEdge({
          left: session.currentLeft,
          top: session.currentTop,
        }, switcher)
        dragPositionRef.current = snappedPosition
        setDragPosition(snappedPosition)
      }
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
      if (dragSessionRef.current) return
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
        isFloating: getComputedStyle(switcher).position === 'fixed',
        targetPane: null,
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      const session = dragSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      const deltaX = event.clientX - session.startX
      const deltaY = event.clientY - session.startY
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
      const threshold = session.isFloating ? DRAG_THRESHOLD : SWIPE_THRESHOLD
      if (!session.moved && (!isHorizontalSwipe || Math.hypot(deltaX, deltaY) < threshold)) return
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
      if (!session.isFloating) {
        const nextPane: MobilePane = deltaX < 0 ? 'preview' : 'editor'
        if (session.targetPane !== nextPane) {
          session.targetPane = nextPane
          switchMobilePane(nextPane)
        }
        return
      }
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
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      window.requestAnimationFrame(() => workbenchRef.current?.scrollIntoView({ behavior, block: 'start' }))
    }
  }
  const handlePaneKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextPane = event.key === 'Home' ? 'editor' : event.key === 'End' ? 'preview' : event.key === 'ArrowLeft' ? 'editor' : 'preview'
    switchMobilePane(nextPane)
    document.getElementById(`resume-${nextPane}-tab`)?.focus()
  }
  const selectPane = (nextPane: MobilePane) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    switchMobilePane(nextPane)
  }
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
    viewport?.addEventListener('resize', reclamp)
    return () => {
      window.removeEventListener('resize', reclamp)
      viewport?.removeEventListener('resize', reclamp)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])
  const clearPaneDropTarget = (event: DragEvent<HTMLElement>) => {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragOverPane(null)
  }
  const paneHeading = (pane: DesktopPane) => <div className="column-heading">
    <div><p className="eyebrow">{pane === 'editor' ? '内容工作区' : '视觉工作区'}</p><h2>{pane === 'editor' ? '编辑内容' : '实时预览'}</h2></div>
    <div className="column-heading-actions">
      {pane === 'preview' && <button className={`pane-freeze-toggle${previewFrozen ? ' is-active' : ''}`} type="button" aria-pressed={previewFrozen} aria-label={previewFrozen ? '取消固定预览' : '固定预览'} title={previewFrozen ? '取消固定预览' : '固定预览'} onClick={() => setPreviewFrozen((current) => !current)}><Pin size={15} aria-hidden="true" /><span>{previewFrozen ? '已固定' : '固定'}</span></button>}
      <button className="pane-drag-handle" type="button" draggable="true" onDragStart={(event) => startPaneDrag(pane, event)} onDragEnd={finishPaneDrag} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); swapPanes(pane) } }} aria-label={`拖动${pane === 'editor' ? '编辑内容' : '实时预览'}调整位置`} title="拖动调整位置"><GripVertical size={17} aria-hidden="true" /><span>拖动</span></button>
    </div>
  </div>
  const editorPane = <section id="resume-editor-panel" className={`editor-column ${mobilePane === 'editor' ? 'mobile-visible' : 'mobile-hidden'}${draggedPane === 'editor' ? ' is-dragging-pane' : ''}${dragOverPane === 'editor' ? ' is-drag-over' : ''}`} style={{ order: paneOrder.indexOf('editor') }} role="tabpanel" aria-labelledby="resume-editor-tab" onDragOver={(event) => { if (draggedPane && draggedPane !== 'editor') { event.preventDefault(); setDragOverPane('editor') } }} onDragLeave={clearPaneDropTarget} onDrop={(event) => dropPane('editor', event)}>
    {paneHeading('editor')}
    <ResumeEditor resume={resume} onChange={onChange} />
  </section>
  const previewPane = <section id="resume-preview-panel" className={`preview-column ${mobilePane === 'preview' ? 'mobile-visible' : 'mobile-hidden'}${previewFrozen ? ' is-preview-frozen' : ''}${draggedPane === 'preview' ? ' is-dragging-pane' : ''}${dragOverPane === 'preview' ? ' is-drag-over' : ''}`} style={{ order: paneOrder.indexOf('preview') }} role="tabpanel" aria-labelledby="resume-preview-tab" onDragOver={(event) => { if (draggedPane && draggedPane !== 'preview') { event.preventDefault(); setDragOverPane('preview') } }} onDragLeave={clearPaneDropTarget} onDrop={(event) => dropPane('preview', event)}>
    {paneHeading('preview')}
    <div className="preview-stage"><ResumePreview resume={resume} onChange={onChange} ref={previewRef} /></div>
  </section>

  return <section ref={workbenchRef} className={`resume-workbench${transitionKind ? ' is-switching' : ''}${paneSwapPulse ? ' is-pane-swapping' : ''}`} aria-busy={transitionKind !== null}>
    <div className={`workspace-switch-loading${transitionKind ? ' is-visible' : ''}`} aria-hidden={transitionKind === null}>
      <span className="workspace-switch-loading-visual" aria-hidden="true"><span className="workspace-switch-loading-sheet workspace-switch-loading-sheet-back"><i /><i /><i /></span><span className="workspace-switch-loading-sheet workspace-switch-loading-sheet-front"><i /><i /><i /><FileText size={12} strokeWidth={2.2} /></span><span className="workspace-switch-loading-scan" /></span>
      <span className="workspace-switch-loading-copy"><strong>{transitionKind === 'template' ? '正在应用模板' : '正在切换简历'}</strong><small>内容与预览同步中</small></span>
      <span className="workspace-switch-loading-progress" aria-hidden="true"><span /></span>
    </div>
    <div
      ref={switcherRef}
      className={`mobile-switcher${dragging ? ' is-dragging' : ''}${switcherPulse ? ' is-switched' : ''}`}
      role="tablist"
      aria-orientation="horizontal"
      aria-label="切换工作区"
      style={dragPosition ? { left: dragPosition.left, top: dragPosition.top, right: 'auto', bottom: 'auto', transform: 'none' } : undefined}
    >
      <span className={`mobile-switcher-thumb is-${mobilePane}`} aria-hidden="true" />
      <button id="resume-editor-tab" className={mobilePane === 'editor' ? 'is-active' : ''} type="button" role="tab" aria-label="编辑" title="编辑" aria-selected={mobilePane === 'editor'} aria-controls="resume-editor-panel" tabIndex={mobilePane === 'editor' ? 0 : -1} onClick={() => selectPane('editor')} onKeyDown={handlePaneKeyDown}><PencilLine size={15} aria-hidden="true" /><span className="mobile-switcher-label">编辑内容</span></button>
      <button id="resume-preview-tab" className={mobilePane === 'preview' ? 'is-active' : ''} type="button" role="tab" aria-label="预览" title="预览" aria-selected={mobilePane === 'preview'} aria-controls="resume-preview-panel" tabIndex={mobilePane === 'preview' ? 0 : -1} onClick={() => selectPane('preview')} onKeyDown={handlePaneKeyDown}><Eye size={15} aria-hidden="true" /><span className="mobile-switcher-label">实时预览</span></button>
    </div>
    <div className={`workbench-body${draggedPane ? ' is-pane-dragging' : ''}${dragOverPane ? ' has-pane-drop-target' : ''}`}>
      {paneOrder.map((pane) => <Fragment key={pane}>{pane === 'editor' ? editorPane : previewPane}</Fragment>)}
    <div className="workbench-template-panel">
      <div className="template-panel">
        <div className="template-panel-heading"><div><p className="eyebrow">模板选择</p><h3>挑选你的版式</h3></div></div>
        <TemplatePicker pickerId="workspace-template-picker" value={resume.templateId} onChange={(templateId) => onChange({ ...resume, templateId })} />
        <p className="hint-text">Word 导出保留内容与强调色，不复制现代模板的侧栏结构；需要视觉版式时请导出 PDF。</p>
      </div>
    </div>
    </div>
  </section>
}
