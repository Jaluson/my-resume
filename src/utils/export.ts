import type { Paragraph as DocxParagraph } from 'docx'
import type { Resume } from '../types/resume'
import { templateById } from '../data/templates'
import { formatResumePeriod, getResumeContent, toSafeExternalUrl } from './resume'

export const sanitizeFileName = (title: string) => {
  const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/[. ]+$/g, '').trim()
  return cleaned || 'resume'
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportResumeToPdf(resume: Resume, element: HTMLElement): Promise<void> {
  if (typeof window === 'undefined') throw new Error('PDF 导出只能在浏览器中执行')
  const bounds = element.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) throw new Error('找不到有效的 PDF 预览尺寸')
  // Exporters stay out of the initial editor chunk; these modules are only needed after an export action.
  await import('html2canvas')
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  await pdf.html(element, { x: 0, y: 0, width: 210, windowWidth: 794, autoPaging: 'text', html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false } })
  pdf.save(`${sanitizeFileName(resume.title)}.pdf`)
}

export async function exportResumeToDocx(resume: Resume): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Word 导出只能在浏览器中执行')
  // Keep the document generator out of the initial editor chunk.
  const { Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
  const accent = templateById(resume.templateId).accent.replace('#', '').toUpperCase()
  const content = getResumeContent(resume)
  const { profile } = content
  const sectionHeading = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 }, children: [new TextRun({ text, color: accent, bold: true })] })
  const bodyParagraph = (text: string) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun(text)] })
  const bulletParagraph = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 70 }, children: [new TextRun(text)] })
  const linkOrText = (text: string) => { const href = toSafeExternalUrl(text); return href ? new ExternalHyperlink({ link: href, children: [new TextRun({ text, color: accent, underline: {} })] }) : new TextRun(text) }
  const children: DocxParagraph[] = []
  if (profile.fullName.trim()) children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: profile.fullName, bold: true, size: 34 })] }))
  if (profile.jobTitle.trim()) children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: profile.jobTitle, color: accent, size: 24 })] }))
  const contactParts = [profile.email, profile.phone, profile.location].filter((value) => value.trim())
  if (profile.website.trim()) contactParts.push(profile.website)
  if (contactParts.length) children.push(new Paragraph({ spacing: { after: 220 }, children: contactParts.flatMap((part, index) => index === 0 ? [new TextRun({ text: part, color: '6B7280', size: 19 })] : [new TextRun({ text: '  ·  ', color: '6B7280', size: 19 }), profile.website === part ? linkOrText(part) : new TextRun({ text: part, color: '6B7280', size: 19 })]) }))
  if (content.summary.trim()) children.push(sectionHeading('个人简介'), bodyParagraph(content.summary))
  if (content.experience.length) { children.push(sectionHeading('工作经历')); content.experience.forEach((item) => { const title = [item.role, item.company].filter((value) => value.trim()).join(' · '); const details = [formatResumePeriod(item.startDate, item.endDate, item.current), item.location.trim()].filter(Boolean).join('  |  '); if (title || details) children.push(new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: title, bold: true }), new TextRun({ text: details ? `\n${details}` : '', color: '6B7280' })] })); item.visibleBullets.forEach((bullet) => children.push(bulletParagraph(bullet))) }) }
  if (content.education.length) { children.push(sectionHeading('教育经历')); content.education.forEach((item) => children.push(bodyParagraph([[item.school, item.degree, item.field].filter((value) => value.trim()).join(' · '), formatResumePeriod(item.startDate, item.endDate, false)].filter(Boolean).join('  |  ')))) }
  if (content.skills.length) children.push(sectionHeading('技能'), bodyParagraph(content.skills.join('  ·  ')))
  if (content.projects.length) { children.push(sectionHeading('项目经历')); content.projects.forEach((item) => { if (item.name.trim() || item.url.trim()) children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: item.name, bold: true }), ...(item.url.trim() ? [new TextRun({ text: '  ·  ' }), linkOrText(item.url)] : [])] })); if (item.description.trim()) children.push(bodyParagraph(item.description)); item.visibleBullets.forEach((bullet) => children.push(bulletParagraph(bullet))) }) }
  if (content.languages.length) children.push(sectionHeading('语言'), bodyParagraph(content.languages.join('  ·  ')))
  const document = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 1050, bottom: 900, left: 1050 } } }, children }] })
  const blob = await Packer.toBlob(document)
  downloadBlob(blob, `${sanitizeFileName(resume.title)}.docx`)
}
