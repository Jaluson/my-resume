import html2canvas from 'html2canvas'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { jsPDF } from 'jspdf'
import type { Resume } from '../types/resume'

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

const period = (start: string, end: string, current = false) => {
  const finish = current ? '至今' : end
  return [start, finish].filter(Boolean).join(' — ')
}

const sectionHeading = (text: string, color: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 }, children: [new TextRun({ text, color, bold: true })] })
const bodyParagraph = (text: string) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun(text)] })
const bulletParagraph = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 70 }, children: [new TextRun(text)] })

export async function exportResumeToPdf(resume: Resume, element: HTMLElement): Promise<void> {
  if (typeof window === 'undefined') throw new Error('PDF 导出只能在浏览器中执行')
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
  const pageWidth = 210
  const pageHeight = 297
  const sliceHeight = Math.floor(canvas.width * pageHeight / pageWidth)
  const pageCount = Math.max(1, Math.ceil(canvas.height / sliceHeight))
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  for (let page = 0; page < pageCount; page += 1) {
    if (page > 0) pdf.addPage()
    const sourceHeight = Math.min(sliceHeight, canvas.height - page * sliceHeight)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sourceHeight
    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('无法准备 PDF 页面')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    context.drawImage(canvas, 0, page * sliceHeight, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
    const imageHeight = sourceHeight * pageWidth / canvas.width
    pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imageHeight, undefined, 'FAST')
  }
  pdf.save(`${sanitizeFileName(resume.title)}.pdf`)
}

export async function exportResumeToDocx(resume: Resume): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Word 导出只能在浏览器中执行')
  const accent = resume.templateId === 'minimal' ? '374151' : '2563EB'
  const { profile } = resume
  const experience = resume.experience.filter((item) => Boolean(item.company || item.role || item.location || period(item.startDate, item.endDate, item.current) || item.bullets.some(Boolean)))
  const education = resume.education.filter((item) => Boolean(item.school || item.degree || item.field || period(item.startDate, item.endDate)))
  const projects = resume.projects.filter((item) => Boolean(item.name || item.description || item.url || item.bullets.some(Boolean)))
  const skills = resume.skills.filter(Boolean)
  const languages = resume.languages.filter(Boolean)
  const children: Paragraph[] = []
  if (profile.fullName) children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: profile.fullName, bold: true, size: 34 })] }))
  if (profile.jobTitle) children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: profile.jobTitle, color: accent, size: 24 })] }))
  const contact = [profile.email, profile.phone, profile.location, profile.website].filter(Boolean).join('  ·  ')
  if (contact) children.push(new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: contact, color: '6B7280', size: 19 })] }))
  if (resume.summary) { children.push(sectionHeading('个人简介', accent), bodyParagraph(resume.summary)) }
  if (experience.length > 0) {
    children.push(sectionHeading('工作经历', accent))
    experience.forEach((item) => {
      const title = [item.role, item.company].filter(Boolean).join(' · ')
      const details = [period(item.startDate, item.endDate, item.current), item.location].filter(Boolean).join('  |  ')
      if (title || details) children.push(new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: title, bold: true }), new TextRun({ text: details ? `\n${details}` : '', color: '6B7280' })] }))
      item.bullets.filter(Boolean).forEach((bullet) => children.push(bulletParagraph(bullet)))
    })
  }
  if (education.length > 0) {
    children.push(sectionHeading('教育经历', accent))
    education.forEach((item) => {
      const title = [item.school, item.degree, item.field].filter(Boolean).join(' · ')
      const dates = period(item.startDate, item.endDate)
      children.push(bodyParagraph([title, dates].filter(Boolean).join('  |  ')))
    })
  }
  if (skills.length > 0) children.push(sectionHeading('技能', accent), bodyParagraph(skills.join('  ·  ')))
  if (projects.length > 0) {
    children.push(sectionHeading('项目经历', accent))
    projects.forEach((item) => {
      if (item.name || item.url) children.push(bodyParagraph([item.name, item.url].filter(Boolean).join('  ·  ')))
      if (item.description) children.push(bodyParagraph(item.description))
      item.bullets.filter(Boolean).forEach((bullet) => children.push(bulletParagraph(bullet)))
    })
  }
  if (languages.length > 0) children.push(sectionHeading('语言', accent), bodyParagraph(languages.join('  ·  ')))
  const document = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 1050, bottom: 900, left: 1050 } } }, children }] })
  const blob = await Packer.toBlob(document)
  downloadBlob(blob, `${sanitizeFileName(resume.title)}.docx`)
}
