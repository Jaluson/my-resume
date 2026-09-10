import { createElement, useEffect, useRef } from 'react'
import type { ClipboardEvent, ElementType, KeyboardEvent, SyntheticEvent } from 'react'

type EditableTextProps = { value: string; onChange: (value: string) => void; as?: ElementType; className?: string; ariaLabel: string; placeholder?: string; multiline?: boolean }

export function EditableText({ value, onChange, as = 'span', className, ariaLabel, placeholder, multiline = false }: EditableTextProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.textContent !== value) ref.current.textContent = value
  }, [value])
  const handleInput = (event: SyntheticEvent<HTMLElement>) => onChange(event.currentTarget.textContent ?? '')
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!multiline && event.key === 'Enter') event.preventDefault()
  }
  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    event.preventDefault()
    const plainText = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, plainText)
  }
  return createElement(as, { ref, className: `${className ?? ''} preview-editable${value.trim() ? '' : ' is-empty'}`, contentEditable: true, suppressContentEditableWarning: true, role: 'textbox', 'aria-label': ariaLabel, 'aria-multiline': multiline || undefined, 'data-placeholder': placeholder, onInput: handleInput, onKeyDown: handleKeyDown, onPaste: handlePaste }, value)
}

export const text = (value: string, interactive: boolean, onChange: ((value: string) => void) | undefined, as: ElementType, ariaLabel: string, placeholder?: string, className?: string, multiline = false) => interactive && onChange
  ? <EditableText value={value} onChange={onChange} as={as} ariaLabel={ariaLabel} placeholder={placeholder} className={className} multiline={multiline} />
  : createElement(as, { className }, value)
