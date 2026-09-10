import { Check } from 'lucide-react'
import type { TemplateId } from '../types/resume'
import { templates } from '../data/templates'

type TemplatePickerProps = { pickerId: string; value: TemplateId; onChange: (value: TemplateId) => void }

export default function TemplatePicker({ pickerId, value, onChange }: TemplatePickerProps) {
  return (
    <fieldset className="template-picker-group">
      <legend>选择简历模板</legend>
      <div className="template-picker-content" id={`${pickerId}-content`}>
        <div className="template-picker">
          {templates.map((template) => {
            const isSelected = value === template.id
            const descriptionId = `${pickerId}-description-${template.id}`

            return (
              <button
                className={`template-card ${isSelected ? 'is-selected' : ''}`}
                key={template.id}
                type="button"
                onClick={() => onChange(template.id)}
                aria-pressed={isSelected}
                aria-describedby={descriptionId}
              >
                <span className={`template-thumb ${template.previewClass}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="template-card-copy">
                  <span className="template-card-heading">
                    <strong>{template.name}</strong>
                    {isSelected && <span className="template-card-state"><Check size={13} strokeWidth={2.5} aria-hidden="true" />已选择</span>}
                  </span>
                  <small id={descriptionId}>{template.description}</small>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}
