import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileText, X } from 'lucide-react'

export type ExportFormat = 'pdf' | 'docx'

type ExportMenuProps = {
  exporting: ExportFormat | null
  onExport: (format: ExportFormat) => Promise<void>
}

const options: Array<{ format: ExportFormat; label: string; description: string }> = [
  { format: 'pdf', label: '导出为 PDF', description: '保留视觉版式，适合投递或打印' },
  { format: 'docx', label: '导出为 Word', description: '便于继续编辑内容' },
]

export default function ExportMenu({ exporting, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  const rootRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownFirstRef = useRef<HTMLButtonElement>(null)
  const modalFirstRef = useRef<HTMLButtonElement>(null)

  const closeMenu = () => {
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return
    const isMobile = isMobileViewport
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
      if (!isMobile || event.key !== 'Tab' || !modalRef.current) return
      const controls = Array.from(modalRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      if (controls.length < 2) return
      const index = controls.indexOf(document.activeElement as HTMLButtonElement)
      event.preventDefault()
      controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.requestAnimationFrame(() => (isMobile ? modalFirstRef : dropdownFirstRef).current?.focus())
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = async (format: ExportFormat) => {
    setOpen(false)
    await onExport(format)
    window.setTimeout(() => triggerRef.current?.focus(), 50)
  }

  const renderOption = (option: (typeof options)[number], firstRef: { current: HTMLButtonElement | null }, className: string, role?: 'menuitem') => {
    const Icon = option.format === 'pdf' ? Download : FileText
    return <button ref={option === options[0] ? (element) => { firstRef.current = element } : undefined} className={`export-option ${className}`} type="button" role={role} disabled={Boolean(exporting)} onClick={() => void choose(option.format)}>
      <Icon size={18} aria-hidden="true" />
      <span><strong>{option.label}</strong><small>{option.description}</small></span>
    </button>
  }

  return <div ref={rootRef} className={`export-menu ${open ? 'is-open' : ''}`}>
    <button ref={triggerRef} className="export-menu-trigger primary-button" type="button" onClick={() => setOpen(!open)} disabled={Boolean(exporting)} aria-haspopup={isMobileViewport ? 'dialog' : 'menu'} aria-expanded={open} aria-controls={isMobileViewport ? 'export-format-dialog' : 'export-menu-dropdown'} aria-busy={Boolean(exporting)}>
      <Download size={16} aria-hidden="true" />
      <span>{exporting ? '生成…' : '导出'}</span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>
    <div id="export-menu-dropdown" className="export-menu-dropdown" role="menu" aria-label="选择导出格式">
      {options.map((option) => renderOption(option, dropdownFirstRef, `export-option-${option.format}`, 'menuitem'))}
    </div>
    {open && <div className="export-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenu() }}>
      <div id="export-format-dialog" ref={modalRef} className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
        <div className="export-modal-heading"><div><p className="eyebrow">导出简历</p><h2 id="export-modal-title">选择导出格式</h2></div><button className="icon-button" type="button" onClick={closeMenu} aria-label="关闭导出选项"><X size={18} /></button></div>
        <p className="export-modal-hint">选择格式后会立即生成当前简历文件。</p>
        <div className="export-modal-options">
          {options.map((option) => renderOption(option, modalFirstRef, `export-option-${option.format}`))}
        </div>
      </div>
    </div>}
  </div>
}
