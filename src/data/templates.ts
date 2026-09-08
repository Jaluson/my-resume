import type { TemplateId } from '../types/resume'

export type TemplateMeta = {
  id: TemplateId
  name: string
  description: string
  accent: string
  previewClass: string
}

export const templates: readonly TemplateMeta[] = [
  { id: 'classic', name: '经典', description: '传统单栏，清晰稳重', accent: '#2563eb', previewClass: 'template-thumb-classic' },
  { id: 'modern', name: '现代', description: '侧栏信息，强调层次', accent: '#2563eb', previewClass: 'template-thumb-modern' },
  { id: 'minimal', name: '极简', description: '黑白留白，干净利落', accent: '#374151', previewClass: 'template-thumb-minimal' },
]

export const templateById = (id: TemplateId): TemplateMeta => templates.find((template) => template.id === id) ?? templates[0]
