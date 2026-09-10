import { useId, useState } from 'react'

type FieldProps = { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; validate?: (value: string) => string | undefined }

export function Field({ label, value, onChange, placeholder, type = 'text', validate }: FieldProps) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const error = touched ? validate?.(value) : undefined
  const errorId = `${id}-error`
  return <label className={`field${error ? ' has-error' : ''}`}><span>{label}</span><input id={id} type={type} value={value} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(event.target.value)} onBlur={() => setTouched(true)} />{error && <span id={errorId} className="field-error" role="alert">{error}</span>}</label>
}

export function TextareaField({ label, value, onChange, placeholder, validate }: Omit<FieldProps, 'type'>) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const error = touched ? validate?.(value) : undefined
  const errorId = `${id}-error`
  return <label className={`field field-full${error ? ' has-error' : ''}`}><span>{label}</span><textarea id={id} value={value} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(event.target.value)} onBlur={() => setTouched(true)} rows={4} />{error && <span id={errorId} className="field-error" role="alert">{error}</span>}</label>
}
