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
  { id: 'editorial', name: '杂志', description: '编辑感排版，突出标题', accent: '#be123c', previewClass: 'template-thumb-editorial' },
  { id: 'executive', name: '商务', description: '深色页眉，专业有力', accent: '#0f766e', previewClass: 'template-thumb-executive' },
  { id: 'compact', name: '紧凑', description: '高信息密度，适合一页', accent: '#7c3aed', previewClass: 'template-thumb-compact' },
  { id: 'academic', name: '学术', description: '严谨分栏，适合研究经历', accent: '#1d4ed8', previewClass: 'template-thumb-academic' },
  { id: 'creative', name: '创意', description: '大胆配色，展示个人风格', accent: '#db2777', previewClass: 'template-thumb-creative' },
  { id: 'tech', name: '科技', description: '清晰模块，突出技术能力', accent: '#0891b2', previewClass: 'template-thumb-tech' },
  { id: 'clean', name: '清新', description: '轻盈配色，阅读舒适', accent: '#16a34a', previewClass: 'template-thumb-clean' },
  { id: 'bold', name: '先锋', description: '强烈标题，打造视觉重点', accent: '#ea580c', previewClass: 'template-thumb-bold' },
  { id: 'friendly', name: '亲和', description: '柔和圆角，传递可靠感', accent: '#ca8a04', previewClass: 'template-thumb-friendly' },
  { id: 'portfolio', name: '作品集', description: '突出项目，适合创意岗位', accent: '#9333ea', previewClass: 'template-thumb-portfolio' },
  { id: 'finance', name: '金融', description: '克制专业，强调可信度', accent: '#334155', previewClass: 'template-thumb-finance' },
  { id: 'healthcare', name: '医疗', description: '清爽有序，突出专业背景', accent: '#0d9488', previewClass: 'template-thumb-healthcare' },
  { id: 'startup', name: '创业', description: '灵活高效，适合多元经历', accent: '#4f46e5', previewClass: 'template-thumb-startup' },
]

export const isTemplateId = (value: unknown): value is TemplateId => templates.some(({ id }) => id === value)

export const templateById = (id: TemplateId): TemplateMeta => templates.find((template) => template.id === id) ?? templates[0]
