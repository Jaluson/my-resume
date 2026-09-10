import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, FileText, X } from 'lucide-react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import LoadingIndicator from './LoadingIndicator'

export type ExportFormat = 'pdf' | 'docx'

type ExportMenuProps = {
  exporting: ExportFormat | null
  onExport: (format: ExportFormat, returnFocus?: () => void) => Promise<void>
}

const options: Array<{ format: ExportFormat; label: string; description: string }> = [
  { format: 'pdf', label: '导出为 PDF', description: '保留视觉版式，适合投递或打印' },
  { format: 'docx', label: '导出为 Word', description: '便于继续编辑内容' },
]

const mobileMediaQuery = '(max-width: 768px)'

export default function ExportMenu({ exporting, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(typeof window !== 'undefined' && window.matchMedia(mobileMediaQuery).matches)
  const rootRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownFirstRef = useRef<HTMLButtonElement>(null)
  const modalFirstRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery)
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    mediaQuery.addEventListener('change', syncViewport)
    return () => {
      window.removeEventListener('resize', syncViewport)
      mediaQuery.removeEventListener('change', syncViewport)
    }
  }, [])

  useEffect(() => {
    if (!open && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = open
  }, [open])
  const closeMenu = () => setOpen(false)
  const focusMenuItem = (index: number) => {
    const controls = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('.export-menu-dropdown .export-option') ?? [])
    controls[index]?.focus()
  }
  const openMenu = () => {
    setOpen(true)
    window.requestAnimationFrame(() => focusMenuItem(0))
  }
  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMenu()
    }
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target) || modalRef.current?.contains(target)) return
      closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
        return
      }
      if (isMobileViewport && event.key === 'Tab' && modalRef.current) {
        const controls = Array.from(modalRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
        if (controls.length < 2) return
        const index = controls.indexOf(document.activeElement as HTMLButtonElement)
        event.preventDefault()
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus()
        return
      }
      if (!isMobileViewport && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
        const controls = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('.export-menu-dropdown .export-option') ?? [])
        const index = controls.indexOf(document.activeElement as HTMLButtonElement)
        if (index < 0) return
        event.preventDefault()
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + controls.length) % controls.length
        controls[nextIndex]?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => {
      const firstControl = isMobileViewport
        ? modalRef.current?.querySelector<HTMLButtonElement>('.export-option')
        : rootRef.current?.querySelector<HTMLButtonElement>('.export-menu-dropdown .export-option')
      firstControl?.focus()
    }, 0)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isMobileViewport])

  const choose = async (format: ExportFormat) => {
    setOpen(false)
    await onExport(format, () => triggerRef.current?.focus())
  }

  const renderOption = (option: (typeof options)[number], firstRef: { current: HTMLButtonElement | null }, className: string, role?: 'menuitem') => {
    const Icon = option.format === 'pdf' ? Download : FileText
    return <button ref={option === options[0] ? (element) => { firstRef.current = element } : undefined} className={`export-option ${className}`} type="button" role={role} disabled={Boolean(exporting)} onClick={() => void choose(option.format)}>
      <Icon size={18} aria-hidden="true" />
      <span><strong>{option.label}</strong><small>{option.description}</small></span>
    </button>
  }

  return <div ref={rootRef} className={`export-menu${exporting ? ' is-exporting' : ''}${open ? ' is-open' : ''}`}>
    <button ref={triggerRef} className={`export-menu-trigger primary-button${exporting ? ' is-exporting' : ''}`} type="button" onClick={() => open ? closeMenu() : openMenu()} onKeyDown={handleTriggerKeyDown} disabled={Boolean(exporting)} aria-haspopup={isMobileViewport ? 'dialog' : 'menu'} aria-expanded={open} aria-controls={isMobileViewport ? 'export-format-dialog' : 'export-menu-dropdown'} aria-busy={Boolean(exporting)}>
      {exporting ? <LoadingIndicator label="生成中" /> : <><Download size={16} aria-hidden="true" /><span>导出</span><ChevronDown size={14} aria-hidden="true" /></>}
    </button>
    {!isMobileViewport && <div id="export-menu-dropdown" className="export-menu-dropdown" role="menu" aria-label="选择导出格式">
      {options.map((option) => renderOption(option, dropdownFirstRef, `export-option-${option.format}`, 'menuitem'))}
    </div>}
    {isMobileViewport && open && createPortal(<div className="export-modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeMenu() }}>
      <div id="export-format-dialog" ref={modalRef} className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-modal-title" aria-describedby="export-modal-hint">
        <div className="modal-orbit modal-orbit-export" aria-hidden="true"><span className="modal-orbit-ring modal-orbit-ring-one" /><span className="modal-orbit-ring modal-orbit-ring-two" /><span className="modal-orbit-core"><Download size={22} strokeWidth={2.1} /></span></div>
        <div className="export-modal-heading"><div><p className="eyebrow">简历工坊 · 输出</p><h2 id="export-modal-title">选择导出格式</h2></div><button className="icon-button" type="button" onClick={closeMenu} aria-label="关闭导出选项"><X size={18} aria-hidden="true" /></button></div>
        <p className="export-modal-hint" id="export-modal-hint">选择格式后会立即生成当前简历文件。</p>
        <div className="export-modal-options">
          {options.map((option) => renderOption(option, modalFirstRef, `export-option-${option.format}`))}
        </div>
      </div>
    </div>, document.body)}
  </div>
}
