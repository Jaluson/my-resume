import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, FilePlus2, FileText, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { templateById } from '../data/templates'
import type { RefObject } from 'react'
import type { Resume, TemplateId } from '../types/resume'
import TemplatePicker from './TemplatePicker'
import ResumePreview from './ResumePreview'

type ResumeManagerProps = { resumes: Resume[]; selectedId: string; templateId: TemplateId; onSelect: (id: string) => void; onTemplateChange: (templateId: TemplateId) => void; onCreate: () => void; onDuplicate: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void; onDeleteMany: (ids: string[]) => void; onReorder: (orderedIds: string[]) => void; mobileOpen: boolean; onCloseMobile: () => void; mobileTriggerRef: RefObject<HTMLButtonElement> }
type GestureAxis = 'idle' | 'horizontal' | 'vertical'
type ResumeGesture = { id: string; pointerId: number; startX: number; startY: number; axis: GestureAxis; longPressFired: boolean; moved: boolean; dragging: boolean; swipeOffset: number; timer: number | null }
type ResumePosition = { id: string; centerY: number }
const updatedAtFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' })
const mobileMediaQuery = '(max-width: 1100px)'
const TEMPLATE_TRANSITION_MS = 420
const TEMPLATE_EXIT_MS = 300
const LONG_PRESS_MS = 380
const GESTURE_SLOP = 8
const SWIPE_DELETE_OFFSET = 76

const formatUpdatedAt = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '刚刚更新' : updatedAtFormatter.format(date) }

export default function ResumeManager({ resumes, selectedId, templateId, onSelect, onTemplateChange, onCreate, onDuplicate, onRename, onDelete, onDeleteMany, onReorder, mobileOpen, onCloseMobile, mobileTriggerRef }: ResumeManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [batchDeletePending, setBatchDeletePending] = useState(false)
  const [templatePreviewId, setTemplatePreviewId] = useState<TemplateId | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [managerPane, setManagerPane] = useState<'resumes' | 'template'>('resumes')
  const [templateTransitioning, setTemplateTransitioning] = useState<'idle' | 'entering' | 'exiting'>('idle')
  const [isMobileViewport, setIsMobileViewport] = useState(typeof window !== 'undefined' && window.matchMedia(mobileMediaQuery).matches)
  const renameSessionRef = useRef<{ id: string; cancelled: boolean; committed: boolean } | null>(null)
  const menuTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const deleteTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const previousTemplateIdRef = useRef(templateId)
  const templateTransitionTimerRef = useRef<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [longPressArmedId, setLongPressArmedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const templatePreviewDialogRef = useRef<HTMLDivElement>(null)
  const templatePreviewCloseRef = useRef<HTMLButtonElement>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const gestureRef = useRef<ResumeGesture | null>(null)
  const dragOverRef = useRef<string | null>(null)
  const resumeItemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const suppressClickRef = useRef<string | null>(null)
  const dragPositionsRef = useRef<ResumePosition[]>([])
  const selectedResume = resumes.find((resume) => resume.id === selectedId)
  const previewResume = selectedResume && templatePreviewId ? { ...selectedResume, templateId: templatePreviewId } : null
  const mobilePanelRef = useRef<HTMLElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)
  const mobilePreviousFocusRef = useRef<HTMLElement | null>(null)
  const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  useEffect(() => { if (editingId && !resumes.some((resume) => resume.id === editingId)) setEditingId(null) }, [editingId, resumes])
  useEffect(() => {
    const previousTemplateId = previousTemplateIdRef.current
    previousTemplateIdRef.current = templateId
    if (previousTemplateId === templateId) return
    setTemplateTransitioning('entering')
    if (templateTransitionTimerRef.current !== null) window.clearTimeout(templateTransitionTimerRef.current)
    templateTransitionTimerRef.current = window.setTimeout(() => {
      setTemplateTransitioning('exiting')
      templateTransitionTimerRef.current = window.setTimeout(() => {
        templateTransitionTimerRef.current = null
        setTemplateTransitioning('idle')
      }, TEMPLATE_EXIT_MS)
    }, TEMPLATE_TRANSITION_MS)
    return () => {
      if (templateTransitionTimerRef.current !== null) window.clearTimeout(templateTransitionTimerRef.current)
    }
  }, [templateId])
  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery)
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches)
      if (!mediaQuery.matches) {
        setManagerPane('resumes')
        setTemplatePreviewId(null)
        if (mobileOpen) onCloseMobile()
      }
    }
    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)
    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [mobileOpen, onCloseMobile])
  useEffect(() => {
    if (!menuId) return
    const closeOnPointer = (event: PointerEvent) => { if (!(event.target instanceof Node) || !(event.target as Element).closest(`[data-resume-menu="${menuId}"]`)) setMenuId(null) }
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuId(null)
        menuTriggerRefs.current[menuId]?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const menu = document.getElementById(`resume-menu-${menuId}`)
      const controls = Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
      const index = controls.indexOf(document.activeElement as HTMLButtonElement)
      if (index < 0) return
      event.preventDefault()
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + controls.length) % controls.length
      controls[nextIndex]?.focus()
    }
    document.addEventListener('pointerdown', closeOnPointer)
    document.addEventListener('keydown', closeOnKey)
    window.setTimeout(() => document.getElementById(`resume-menu-${menuId}`)?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus(), 0)
    return () => { document.removeEventListener('pointerdown', closeOnPointer); document.removeEventListener('keydown', closeOnKey) }
  }, [menuId])
  useEffect(() => { if (confirmId || batchDeletePending) cancelRef.current?.focus() }, [confirmId, batchDeletePending])
  useEffect(() => {
    if (!isMobileViewport || !mobileOpen) {
      const previous = mobilePreviousFocusRef.current
      mobilePreviousFocusRef.current = null
      if (!previous?.isConnected) return
      const panel = mobilePanelRef.current
      let restored = false
      const restoreFocus = () => {
        if (restored) return
        restored = true
        previous.focus()
      }
      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.target === panel && event.propertyName === 'transform') restoreFocus()
      }
      panel?.addEventListener('transitionend', handleTransitionEnd)
      const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500
      const fallbackTimer = window.setTimeout(restoreFocus, delay)
      return () => {
        panel?.removeEventListener('transitionend', handleTransitionEnd)
        window.clearTimeout(fallbackTimer)
      }
    }
    if (!mobilePreviousFocusRef.current) {
      const active = document.activeElement
      mobilePreviousFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : mobileTriggerRef.current
    }
    mobileCloseRef.current?.focus()
  }, [isMobileViewport, mobileOpen, mobileTriggerRef])
  useEffect(() => {
    if (!templatePreviewId) return
    templatePreviewCloseRef.current?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeTemplatePreview(); return }
      if (event.key !== 'Tab' || !templatePreviewDialogRef.current) return
      const controls = Array.from(templatePreviewDialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      if (!controls.length) return
      const index = controls.indexOf(document.activeElement as HTMLButtonElement)
      const nextIndex = index + (event.shiftKey ? -1 : 1)
      if (index >= 0 && nextIndex >= 0 && nextIndex < controls.length) return
      event.preventDefault()
      controls[nextIndex < 0 ? controls.length - 1 : 0].focus()
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [templatePreviewId])
  useEffect(() => {
    if (!isMobileViewport || !mobileOpen || confirmId || batchDeletePending || templatePreviewId) return
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (menuId) return
        event.preventDefault()
        onCloseMobile()
        return
      }
      if (event.key !== 'Tab' || !mobilePanelRef.current) return
      const controls = Array.from(mobilePanelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (!controls.length) return
      const index = controls.indexOf(document.activeElement as HTMLElement)
      if (index === -1) {
        event.preventDefault()
        controls[event.shiftKey ? controls.length - 1 : 0].focus()
        return
      }
      const nextIndex = index + (event.shiftKey ? -1 : 1)
      if (nextIndex >= 0 && nextIndex < controls.length) return
      event.preventDefault()
      controls[nextIndex < 0 ? controls.length - 1 : 0].focus()
    }
    document.addEventListener('keydown', closeOnKey)
    return () => document.removeEventListener('keydown', closeOnKey)
  }, [isMobileViewport, mobileOpen, confirmId, batchDeletePending, menuId, onCloseMobile])
  useEffect(() => {
    if (!isMobileViewport || !mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isMobileViewport, mobileOpen])
  useEffect(() => {
    if (!confirmId && !batchDeletePending) return
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeDialog(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      if (buttons.length < 2) return
      const current = document.activeElement
      const index = buttons.indexOf(current as HTMLButtonElement)
      event.preventDefault()
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [confirmId, batchDeletePending])

  const beginRename = (resume: Resume) => { renameSessionRef.current = { id: resume.id, cancelled: false, committed: false }; setEditingId(resume.id); setDraftTitle(resume.title); setMenuId(null) }
  const toggleSelection = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])
  const clearGestureTimer = (gesture: ResumeGesture) => { if (gesture.timer !== null) window.clearTimeout(gesture.timer); gesture.timer = null }
  const getDragOrder = (activeId: string, targetId: string) => {
    const movingSet = new Set(selectedIds.includes(activeId) ? resumes.filter((resume) => selectedIds.includes(resume.id)).map((resume) => resume.id) : [activeId])
    if (movingSet.has(targetId)) return resumes.map((resume) => resume.id)
    const remaining = resumes.filter((resume) => !movingSet.has(resume.id)).map((resume) => resume.id)
    const targetIndex = remaining.findIndex((id) => id === targetId)
    if (targetIndex < 0) return resumes.map((resume) => resume.id)
    const moving = resumes.filter((resume) => movingSet.has(resume.id)).map((resume) => resume.id)
    remaining.splice(targetIndex, 0, ...moving)
    return remaining
  }
  const startResumeDrag = (gesture: ResumeGesture) => {
    gesture.dragging = true
    gesture.axis = 'vertical'
    dragPositionsRef.current = resumes.map((resume) => {
      const bounds = resumeItemRefs.current[resume.id]?.getBoundingClientRect()
      return { id: resume.id, centerY: bounds ? bounds.top + bounds.height / 2 : 0 }
    })
    setDraggingId(gesture.id)
    setDragOffset(0)
    dragOverRef.current = null
    setDragOverId(null)
  }
  const handleResumePointerDown = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if ((event.target as Element).closest('.list-menu-button, .resume-item-menu, input')) return
    if (swipedId && swipedId !== id) setSwipedId(null)
    const gesture: ResumeGesture = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, axis: 'idle', longPressFired: false, moved: false, dragging: false, swipeOffset: 0, timer: null }
    gesture.timer = window.setTimeout(() => {
      if (gestureRef.current !== gesture) return
      gesture.longPressFired = true
      suppressClickRef.current = id
      setSelectedIds((current) => current.includes(id) ? current : [...current, id])
      setLongPressArmedId(id)
    }, LONG_PRESS_MS)
    gestureRef.current = gesture
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handleResumePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    if (!gesture.longPressFired && !gesture.moved && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > GESTURE_SLOP) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        gesture.axis = 'horizontal'
        clearGestureTimer(gesture)
      } else {
        gesture.axis = 'vertical'
        clearGestureTimer(gesture)
      }
    }
    if (gesture.longPressFired && !gesture.dragging && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > GESTURE_SLOP) {
      gesture.moved = true
      if (Math.abs(deltaY) >= Math.abs(deltaX)) startResumeDrag(gesture)
      else gesture.axis = 'horizontal'
    }
    if (gesture.dragging) {
      event.preventDefault()
      setDragOffset(deltaY)
      const movingIds = new Set(selectedIds.includes(gesture.id) ? selectedIds : [gesture.id])
      const nearest = dragPositionsRef.current.filter((position) => !movingIds.has(position.id)).sort((a, b) => Math.abs(a.centerY - event.clientY) - Math.abs(b.centerY - event.clientY))[0]?.id ?? null
      if (nearest !== dragOverRef.current) {
        dragOverRef.current = nearest
        setDragOverId(nearest)
      }
      return
    }
    if (gesture.axis === 'horizontal' && !gesture.longPressFired) {
      event.preventDefault()
      gesture.swipeOffset = Math.max(-SWIPE_DELETE_OFFSET, Math.min(0, deltaX))
      setSwipeOffset(gesture.swipeOffset)
    }
  }
  const finishResumeGesture = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    clearGestureTimer(gesture)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (gesture.dragging) {
      if (!cancelled && dragOverRef.current) onReorder(getDragOrder(gesture.id, dragOverRef.current))
      setDraggingId(null)
      setDragOffset(0)
      dragOverRef.current = null
      setDragOverId(null)
      setLongPressArmedId(null)
      gestureRef.current = null
      return
    }
    if (gesture.longPressFired) {
      suppressClickRef.current = gesture.id
      setLongPressArmedId(null)
      setSwipeOffset(0)
      gestureRef.current = null
      return
    }
    if (gesture.axis === 'horizontal') {
      suppressClickRef.current = gesture.id
      setSwipedId(gesture.swipeOffset <= -SWIPE_DELETE_OFFSET / 2 ? gesture.id : null)
      setSwipeOffset(0)
    }
    gestureRef.current = null
  }
  const handleResumeClick = (id: string) => {
    if (suppressClickRef.current === id) {
      suppressClickRef.current = null
      return
    }
    if (selectedIds.length) {
      toggleSelection(id)
      return
    }
    if (swipedId) {
      setSwipedId(null)
      return
    }
    closeAfter(() => onSelect(id))
  }
  const openSingleDelete = (id: string) => { setSwipedId(null); setConfirmId(id) }
  const clearSelection = () => { setSelectedIds([]); setSwipedId(null) }
  const allSelected = resumes.length > 0 && selectedIds.length === resumes.length
  const selectAll = () => setSelectedIds(allSelected ? [] : resumes.map((resume) => resume.id))
  const getDragShift = (id: string) => {
    if (!draggingId || !dragOverId) return 0
    const movingIds = selectedIds.includes(draggingId) ? resumes.filter((resume) => selectedIds.includes(resume.id)).map((resume) => resume.id) : [draggingId]
    if (movingIds.includes(id)) return 0
    const remainingIds = resumes.map((resume) => resume.id).filter((resumeId) => !movingIds.includes(resumeId))
    const insertIndex = remainingIds.indexOf(dragOverId)
    const remainingIndex = remainingIds.indexOf(id)
    const currentIndex = resumes.findIndex((resume) => resume.id === id)
    const desiredIndex = remainingIndex < insertIndex ? remainingIndex : remainingIndex + movingIds.length
    const currentPosition = dragPositionsRef.current[currentIndex]
    const desiredPosition = dragPositionsRef.current[desiredIndex]
    return currentPosition && desiredPosition ? desiredPosition.centerY - currentPosition.centerY : 0
  }
  const selectBatchDelete = () => { if (selectedIds.length) setBatchDeletePending(true) }
  const selectManagerPane = (nextPane: 'resumes' | 'template') => setManagerPane(nextPane)
  const handleManagerPaneKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextPane = event.key === 'Home' ? 'resumes' : event.key === 'End' ? 'template' : event.key === 'ArrowLeft' ? 'resumes' : 'template'
    selectManagerPane(nextPane)
    window.requestAnimationFrame(() => document.getElementById(`manager-${nextPane}-tab`)?.focus())
  }
  const commitRename = () => { const session = renameSessionRef.current; if (!session || session.cancelled || session.committed) return; session.committed = true; onRename(session.id, draftTitle); setEditingId(null) }
  const closeAfter = (action: () => void) => { action(); onCloseMobile() }
  const closeDialog = () => { const trigger = deleteTriggerRefs.current[confirmId ?? '']; setConfirmId(null); setBatchDeletePending(false); setSelectedIds([]); window.setTimeout(() => trigger?.focus(), 0) }
  const openTemplatePreview = (nextTemplateId: TemplateId) => { if (!isMobileViewport) { onTemplateChange(nextTemplateId); return } setTemplatePreviewId(nextTemplateId) }
  const closeTemplatePreview = () => { setTemplatePreviewId(null); window.setTimeout(() => document.querySelector<HTMLButtonElement>('#manager-template-picker .template-card[aria-pressed="true"]')?.focus(), 0) }
  const confirmTemplatePreview = () => { if (!templatePreviewId) return; onTemplateChange(templatePreviewId); closeTemplatePreview() }
  const templatePreviewModal = isMobileViewport && templatePreviewId && previewResume ? <div className="template-preview-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeTemplatePreview() }}><div ref={templatePreviewDialogRef} className="template-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="template-preview-title" aria-describedby="template-preview-description"><div className="template-preview-heading"><div><p className="eyebrow">模板预览</p><h2 id="template-preview-title">{templateById(templatePreviewId).name}</h2></div><button ref={templatePreviewCloseRef} className="icon-button" type="button" onClick={closeTemplatePreview} aria-label="关闭模板预览"><X size={18} aria-hidden="true" /></button></div><p className="template-preview-description" id="template-preview-description">确认预览效果后，再决定是否切换到此模板。</p><div className="template-preview-stage"><ResumePreview resume={previewResume} interactive={false} /></div><div className="template-preview-actions"><button className="secondary-button" type="button" onClick={closeTemplatePreview}>返回选择</button><button className="primary-button" type="button" onClick={confirmTemplatePreview}>使用此模板</button></div></div></div> : null

  return <>{isMobileViewport && <button className={`mobile-manager-backdrop${mobileOpen ? ' is-visible' : ''}`} type="button" onPointerDown={onCloseMobile} aria-label="关闭简历管理" aria-hidden={!mobileOpen} tabIndex={mobileOpen ? 0 : -1} />}{templatePreviewModal && createPortal(templatePreviewModal, document.body)}<aside ref={mobilePanelRef} id="resume-manager-panel" className={`manager-panel ${mobileOpen ? 'mobile-manager-open' : ''}`} aria-label="简历管理" aria-hidden={isMobileViewport && !mobileOpen}>
    <div className="panel-heading"><div><h2>管理区</h2></div><div className="panel-heading-actions"><span className="panel-heading-count">{resumes.length} 份</span><button ref={mobileCloseRef} className="icon-button mobile-manager-close" type="button" onClick={onCloseMobile} aria-label="关闭简历管理"><X size={18} aria-hidden="true" /></button></div></div>
    <div className="manager-pane-tabs" role="tablist" aria-label="简历管理模块"><button id="manager-resumes-tab" className={managerPane === 'resumes' ? 'is-active' : ''} type="button" role="tab" aria-selected={managerPane === 'resumes'} aria-controls="manager-resumes-panel" tabIndex={managerPane === 'resumes' ? 0 : -1} onClick={() => selectManagerPane('resumes')} onKeyDown={handleManagerPaneKeyDown}>简历选择</button><button id="manager-template-tab" className={managerPane === 'template' ? 'is-active' : ''} type="button" role="tab" aria-selected={managerPane === 'template'} aria-controls="manager-template-panel" tabIndex={managerPane === 'template' ? 0 : -1} onClick={() => selectManagerPane('template')} onKeyDown={handleManagerPaneKeyDown}>模板选择</button></div>
    <div className="manager-resume-pane" id="manager-resumes-panel" role="tabpanel" aria-labelledby="manager-resumes-tab" hidden={managerPane !== 'resumes'}><div className="manager-library"><div className="manager-section-heading"><span className="manager-section-label"><small>最近编辑</small><strong>我的简历</strong><em>共 {resumes.length} 份</em></span><button className="new-resume-action" type="button" onClick={onCreate} aria-label="新建简历"><FilePlus2 size={15} aria-hidden="true" />新建</button></div>
      {selectedIds.length > 0 && <div className="manager-selection-toolbar" role="toolbar" aria-label="批量管理简历"><span className="manager-selection-summary">已选 {selectedIds.length} 份</span><button type="button" onClick={selectAll}>{allSelected ? '取消全选' : '全选'}</button><button type="button" className="manager-selection-delete" onClick={selectBatchDelete}><Trash2 size={14} aria-hidden="true" />删除</button><button type="button" onClick={clearSelection}>完成</button></div>}
      <div className="resume-list">{resumes.map((resume) => {
        const displayTitle = resume.title.trim() || '未命名简历'
        const isSelected = selectedIds.includes(resume.id)
        const isDragging = draggingId === resume.id
        const groupDragging = Boolean(draggingId && selectedIds.includes(draggingId) && selectedIds.length > 1)
        const hiddenGroupMember = groupDragging && isSelected && !isDragging
        const isSwiping = gestureRef.current?.id === resume.id && gestureRef.current?.axis === 'horizontal'
        const revealOffset = swipedId === resume.id ? SWIPE_DELETE_OFFSET : isSwiping ? Math.max(0, -swipeOffset) : 0
        const dragShift = getDragShift(resume.id)
        const cardStyle = isDragging ? { transform: `translate3d(0, ${dragOffset}px, 0)` } : revealOffset ? { width: `calc(100% - ${revealOffset}px)` } : undefined
        const deleteStyle = isSwiping ? { opacity: revealOffset / SWIPE_DELETE_OFFSET, transform: `translate3d(${12 - revealOffset / SWIPE_DELETE_OFFSET * 12}px, 0, 0) scale(${.9 + revealOffset / SWIPE_DELETE_OFFSET * .1})` } : undefined
        const shellStyle = dragShift ? { transform: `translate3d(0, ${dragShift}px, 0)` } : undefined
        return <div className={`resume-list-item-shell${swipedId === resume.id ? ' is-swiped' : ''}${isSwiping ? ' is-swiping' : ''}${isSelected ? ' is-selected' : ''}${hiddenGroupMember ? ' is-group-member-hidden' : ''}${dragOverId === resume.id ? ' is-drag-over' : ''}`} key={resume.id} ref={(element) => { resumeItemRefs.current[resume.id] = element }} style={shellStyle}>
          <button className="resume-swipe-delete" style={deleteStyle} type="button" onClick={() => openSingleDelete(resume.id)} disabled={swipedId !== resume.id} tabIndex={swipedId === resume.id ? 0 : -1} aria-hidden={swipedId !== resume.id} aria-label={`删除${displayTitle}`}><Trash2 size={16} aria-hidden="true" /><span>删除</span></button>
          <div className={`resume-list-item ${resume.id === selectedId ? 'is-active' : ''}${isDragging ? ' is-dragging' : ''}${groupDragging && isDragging ? ' is-dragging-group' : ''}${longPressArmedId === resume.id ? ' is-long-press-armed' : ''}${revealOffset || isDragging ? ' is-gesture-moving' : ''}`} data-resume-menu={menuId === resume.id ? resume.id : undefined} onPointerDown={(event) => handleResumePointerDown(event, resume.id)} onPointerMove={handleResumePointerMove} onPointerUp={finishResumeGesture} onPointerCancel={(event) => finishResumeGesture(event, true)} style={cardStyle}>
            {groupDragging && isDragging && <span className="resume-drag-stack" aria-hidden="true"><i /><i /><b>{selectedIds.length} 份</b></span>}
            {selectedIds.length > 0 && <span className="resume-selection-indicator" aria-hidden="true">{isSelected ? <Check size={13} strokeWidth={2.7} /> : null}</span>}
            <span className="resume-list-marker" aria-hidden="true"><FileText size={16} strokeWidth={1.8} /></span>
            {editingId === resume.id ? <input className="rename-input" value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitRename() } if (event.key === 'Escape') { if (renameSessionRef.current) renameSessionRef.current.cancelled = true; setEditingId(null) } }} aria-label={`重命名 ${displayTitle}`} /> : <button className="resume-list-main" type="button" onClick={() => handleResumeClick(resume.id)} aria-pressed={selectedIds.length > 0 ? isSelected : undefined}><span className="resume-list-copy"><span className="resume-list-title">{displayTitle}</span><span className="resume-list-meta">{templateById(resume.templateId).name} · {formatUpdatedAt(resume.updatedAt)}</span></span>{resume.id === selectedId && <span className="resume-list-current">当前</span>}</button>}
            <button className="icon-button list-menu-button" type="button" ref={(element) => { menuTriggerRefs.current[resume.id] = element }} onClick={() => setMenuId(menuId === resume.id ? null : resume.id)} aria-label={`打开${displayTitle}操作菜单`} aria-haspopup="menu" aria-expanded={menuId === resume.id} aria-controls={`resume-menu-${resume.id}`}><MoreHorizontal size={17} aria-hidden="true" /></button>
            {menuId === resume.id && <div className="resume-item-menu" id={`resume-menu-${resume.id}`} role="menu" aria-label={`${displayTitle}操作`} data-resume-menu={resume.id}><button type="button" role="menuitem" onClick={() => beginRename(resume)}><Pencil size={14} aria-hidden="true" />重命名</button><button type="button" role="menuitem" onClick={() => closeAfter(() => { onDuplicate(resume.id); setMenuId(null) })}><Copy size={14} aria-hidden="true" />复制</button><button type="button" role="menuitem" className="danger-text" ref={(element) => { deleteTriggerRefs.current[resume.id] = element }} onClick={() => { setConfirmId(resume.id); setMenuId(null) }}><Trash2 size={14} aria-hidden="true" />删除</button></div>}
          </div>
        </div>
      })}</div>
    </div></div>
    <div className={`mobile-template-panel${templateTransitioning !== 'idle' ? ' is-template-switching' : ''}`} id="manager-template-panel" role="tabpanel" aria-labelledby="manager-template-tab" hidden={managerPane !== 'template'}><div className="mobile-template-heading"><span><p className="eyebrow">模板选择</p><strong>挑选你的版式</strong></span><small>{templateTransitioning !== 'idle' ? '同步中' : '即时应用'}</small></div>{templateTransitioning !== 'idle' && isMobileViewport && managerPane === 'template' && <div className={`manager-template-loading is-${templateTransitioning}`} role="status" aria-live="polite"><span className="manager-template-loading-dot" aria-hidden="true" /><span><strong>正在应用模板</strong><small>预览同步中</small></span></div>}<TemplatePicker pickerId="manager-template-picker" value={templatePreviewId ?? templateId} onChange={openTemplatePreview} /></div>
    <p className="storage-note">内容自动保存至本地浏览器</p>
  </aside>{(confirmId || batchDeletePending) && <div className="confirm-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className="confirm-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><div className="confirm-dialog-mark" aria-hidden="true"><Trash2 size={20} strokeWidth={2.2} /></div><p className="eyebrow">不可逆操作 · 请确认</p><h3 id="delete-title">{batchDeletePending ? `删除选中的 ${selectedIds.length} 份简历？` : '删除这份简历？'}</h3><p id="delete-description">{batchDeletePending ? '删除后这些简历内容无法恢复，请确认是否继续。' : `删除“${resumes.find((resume) => resume.id === confirmId)?.title.trim() || '未命名简历'}”后内容无法恢复，请确认是否继续。`}</p><div className="dialog-actions"><button className="secondary-button" type="button" ref={cancelRef} onClick={closeDialog}>取消</button><button className="danger-button" type="button" onClick={() => { if (batchDeletePending) onDeleteMany(selectedIds); else if (confirmId) { onDelete(confirmId); onCloseMobile() } closeDialog() }}>确认删除</button></div></div></div>}</>
}
