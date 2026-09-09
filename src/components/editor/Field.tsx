type FieldProps = { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }

export function Field({ label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}

export function TextareaField({ label, value, onChange, placeholder }: Omit<FieldProps, 'type'>) {
  return <label className="field field-full"><span>{label}</span><textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} rows={4} /></label>
}
