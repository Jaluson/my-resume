import { Check } from 'lucide-react'
import { templates } from '../data/templates'
import type { TemplateId } from '../types/resume'

type TemplatePickerProps = { value: TemplateId; onChange: (value: TemplateId) => void }

export default function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  return (
    <div className="template-picker" aria-label="选择简历模板">
      {templates.map((template) => (
        <button className={`template-card ${value === template.id ? 'is-selected' : ''}`} key={template.id} type="button" onClick={() => onChange(template.id)} aria-pressed={value === template.id}>
          <span className={`template-thumb ${template.previewClass}`} aria-hidden="true"><i /><i /><i /></span>
          <span className="template-card-copy"><strong>{template.name}</strong><small>{template.description}</small></span>
          {value === template.id && <Check size={16} strokeWidth={2.5} aria-label="已选中" />}
        </button>
      ))}
    </div>
  )
}
