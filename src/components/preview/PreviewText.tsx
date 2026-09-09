import { createElement, useEffect, useRef } from 'react'
import type { ElementType, SyntheticEvent } from 'react'

type EditableTextProps = { value: string; onChange: (value: string) => void; as?: ElementType; className?: string; ariaLabel: string; placeholder?: string }

export function EditableText({ value, onChange, as = 'span', className, ariaLabel, placeholder }: EditableTextProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.textContent !== value) ref.current.textContent = value
  }, [value])
  const handleInput = (event: SyntheticEvent<HTMLElement>) => onChange(event.currentTarget.textContent ?? '')
  return createElement(as, { ref, className: `${className ?? ''} preview-editable${value ? '' : ' is-empty'}`, contentEditable: true, suppressContentEditableWarning: true, role: 'textbox', 'aria-label': ariaLabel, 'data-placeholder': placeholder, onInput: handleInput }, value)
}

export const text = (value: string, interactive: boolean, onChange: ((value: string) => void) | undefined, as: ElementType, ariaLabel: string, placeholder?: string, className?: string) => interactive && onChange
  ? <EditableText value={value} onChange={onChange} as={as} ariaLabel={ariaLabel} placeholder={placeholder} className={className} />
  : createElement(as, { className }, value)
