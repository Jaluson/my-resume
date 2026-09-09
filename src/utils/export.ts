import type { Paragraph as DocxParagraph } from 'docx'
import type { Resume, ResumeSectionId } from '../types/resume'
import { templateById } from '../data/templates'
import { formatResumePeriod, getResumeContent, toSafeExternalUrl } from './resume'

const PDF_PAGE_WIDTH_MM = 210
const PDF_PAGE_HEIGHT_MM = 297

export const sanitizeFileName = (title: string) => {
  const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/[. ]+$/g, '').trim()
  return cleaned || 'resume'
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const waitForFonts = async () => {
  if (document.fonts) await document.fonts.ready
}
const trimTrailingWhitespace = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const rowStride = canvas.width * 4
  let bottom = canvas.height
  while (bottom > 0) {
    const rowStart = (bottom - 1) * rowStride
    let hasInk = false
    for (let index = rowStart; index < rowStart + rowStride; index += 4) {
      if (pixels[index] < 250 || pixels[index + 1] < 250 || pixels[index + 2] < 250 || pixels[index + 3] < 250) {
        hasInk = true
        break
      }
    }
    if (hasInk) break
    bottom -= 1
  }
  if (bottom === 0 || bottom === canvas.height) return canvas
  const trimmed = document.createElement('canvas')
  trimmed.width = canvas.width
  trimmed.height = bottom
  trimmed.getContext('2d')?.drawImage(canvas, 0, 0, canvas.width, bottom, 0, 0, canvas.width, bottom)
  return trimmed
}
const hasVisibleInk = (canvas: HTMLCanvasElement): boolean => {
  const context = canvas.getContext('2d')
  if (!context) return true
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245 || pixels[index + 3] < 245) return true
  }
  return false
}

export async function exportResumeToPdf(resume: Resume, element: HTMLElement): Promise<void> {
  if (typeof window === 'undefined') throw new Error('PDF 导出只能在浏览器中执行')
  await waitForFonts()
  const bounds = element.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) throw new Error('找不到有效的 PDF 预览尺寸')
  // These optional export dependencies load only after the user chooses a format.
  const { default: html2canvas } = await import('html2canvas')
  const { jsPDF } = await import('jspdf')
  const width = Math.ceil(bounds.width)
  const height = Math.ceil(bounds.height)
  const scale = Math.min(2.25, Math.max(2, window.devicePixelRatio || 1))
  const canvas = await html2canvas(element, {
    scale,
    width,
    height,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: width,
    windowHeight: height,
    onclone: (clonedDocument) => {
      clonedDocument.querySelectorAll<HTMLElement>('*').forEach((node) => {
        node.style.animation = 'none'
        node.style.transition = 'none'
      })
    },
  })
  const renderedCanvas = trimTrailingWhitespace(canvas)
  if (renderedCanvas.width <= 0 || renderedCanvas.height <= 0) throw new Error('PDF 预览裁切为空')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const sourcePageHeight = Math.max(1, Math.round(renderedCanvas.width * PDF_PAGE_HEIGHT_MM / PDF_PAGE_WIDTH_MM))
  let sourceOffset = 0
  let emittedPageCount = 0
  while (sourceOffset < renderedCanvas.height) {
    const sliceHeight = Math.min(sourcePageHeight, renderedCanvas.height - sourceOffset)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = renderedCanvas.width
    pageCanvas.height = sliceHeight
    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('无法创建 PDF 页面画布')
    context.drawImage(renderedCanvas, 0, sourceOffset, renderedCanvas.width, sliceHeight, 0, 0, renderedCanvas.width, sliceHeight)
    if (emittedPageCount > 0 && !hasVisibleInk(pageCanvas)) {
      sourceOffset += sliceHeight
      continue
    }
    if (emittedPageCount > 0) pdf.addPage()
    pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, PDF_PAGE_WIDTH_MM, sliceHeight * PDF_PAGE_WIDTH_MM / renderedCanvas.width)
    sourceOffset += sliceHeight
    emittedPageCount += 1
  }
  if (emittedPageCount === 0) throw new Error('PDF 预览没有可导出的内容')
  pdf.save(`${sanitizeFileName(resume.title)}.pdf`)
}

const resumeFont = {
  ascii: 'Arial',
  hAnsi: 'Arial',
  eastAsia: 'Microsoft YaHei',
  cs: 'Arial',
}

const inlineText = (value: string) => value.replace(/\s+/g, ' ').trim()


export async function exportResumeToDocx(resume: Resume): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Word 导出只能在浏览器中执行')
  await waitForFonts()
  // These optional export dependencies load only after the user chooses Word export.
  const { AlignmentType, Document, ExternalHyperlink, Packer, Paragraph, TextRun } = await import('docx')
  const paragraphsFromText = (text: string, style: string, alignment: (typeof AlignmentType)[keyof typeof AlignmentType]): DocxParagraph[] => (
    text.replace(/\r\n?/g, '\n').split('\n').map((line) => new Paragraph({ style, alignment, children: line.trim() ? [new TextRun(line)] : [] }))
  )
  const accentSource = resume.layout.accentColor || templateById(resume.templateId).accent
  const accent = /^#[\da-f]{6}$/i.test(accentSource) ? accentSource.slice(1).toUpperCase() : templateById(resume.templateId).accent.replace('#', '').toUpperCase()
  const content = getResumeContent(resume)
  const { profile } = content
  const paragraphAlignment = resume.layout.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT
  const sectionHeading = (text: string) => new Paragraph({
    style: 'ResumeSection',
    alignment: paragraphAlignment,
    keepNext: true,
    children: [new TextRun({ text: inlineText(text), font: resumeFont, color: accent, bold: true })],
  })
  const bodyParagraphs = (text: string) => paragraphsFromText(text, 'ResumeBody', paragraphAlignment)
  const bulletParagraph = (text: string) => new Paragraph({
    style: 'ResumeBullet',
    alignment: paragraphAlignment,
    children: [new TextRun({ text: `•  ${inlineText(text)}`, font: resumeFont })],
  })
  const linkOrText = (text: string) => {
    const href = toSafeExternalUrl(text)
    if (!href) return new TextRun({ text, font: resumeFont })
    return new ExternalHyperlink({ link: href, children: [new TextRun({ text, font: resumeFont, color: accent, underline: {} })] })
  }
  const children: DocxParagraph[] = []
  const title = inlineText(profile.fullName)
  const role = inlineText(profile.jobTitle)
  if (title) children.push(new Paragraph({ style: 'ResumeTitle', alignment: paragraphAlignment, keepNext: Boolean(role), children: [new TextRun({ text: title, font: resumeFont, bold: true })] }))
  if (role) children.push(new Paragraph({ style: 'ResumeSubtitle', alignment: paragraphAlignment, keepNext: true, children: [new TextRun({ text: role, font: resumeFont, color: accent })] }))
  const contactParts = [
    { value: inlineText(profile.email), isLink: false },
    { value: inlineText(profile.phone), isLink: false },
    { value: inlineText(profile.location), isLink: false },
    { value: inlineText(profile.website), isLink: true },
  ].filter((part) => part.value)
  if (contactParts.length) {
    children.push(new Paragraph({
      style: 'ResumeContact',
      alignment: paragraphAlignment,
      keepNext: true,
      children: contactParts.flatMap((part, index) => [
        ...(index ? [new TextRun({ text: '  ·  ', font: resumeFont, color: '6B7280' })] : []),
        part.isLink ? linkOrText(part.value) : new TextRun({ text: part.value, font: resumeFont, color: '6B7280' }),
      ]),
    }))
  }
  const sectionBuilders: Record<ResumeSectionId, { fallback: string; build: () => DocxParagraph[] }> = {
    summary: { fallback: '个人简介', build: () => bodyParagraphs(content.summary) },
    experience: {
      fallback: '工作经历',
      build: () => content.experience.flatMap((item) => {
        const paragraphs: DocxParagraph[] = []
        const itemTitle = [item.role, item.company].map(inlineText).filter(Boolean).join(' · ')
        const details = [formatResumePeriod(item.startDate, item.endDate, item.current), inlineText(item.location)].filter(Boolean).join('  |  ')
        if (itemTitle) paragraphs.push(new Paragraph({ style: 'ResumeEntryTitle', alignment: paragraphAlignment, keepNext: Boolean(details || item.visibleBullets.length), children: [new TextRun({ text: itemTitle, font: resumeFont, bold: true })] }))
        if (details) paragraphs.push(new Paragraph({ style: 'ResumeMeta', alignment: paragraphAlignment, keepNext: item.visibleBullets.length > 0, children: [new TextRun({ text: details, font: resumeFont })] }))
        paragraphs.push(...item.visibleBullets.map(bulletParagraph))
        return paragraphs
      }),
    },
    education: {
      fallback: '教育经历',
      build: () => content.education.flatMap((item) => {
        const paragraphs: DocxParagraph[] = []
        const itemTitle = [item.school, item.degree, item.field].map(inlineText).filter(Boolean).join(' · ')
        const period = formatResumePeriod(item.startDate, item.endDate, false)
        if (itemTitle) paragraphs.push(new Paragraph({ style: 'ResumeEntryTitle', alignment: paragraphAlignment, keepNext: Boolean(period), children: [new TextRun({ text: itemTitle, font: resumeFont, bold: true })] }))
        if (period) paragraphs.push(new Paragraph({ style: 'ResumeMeta', alignment: paragraphAlignment, children: [new TextRun({ text: period, font: resumeFont })] }))
        return paragraphs
      }),
    },
    skills: { fallback: '技能', build: () => bodyParagraphs(content.skills.map(inlineText).filter(Boolean).join('  ·  ')) },
    projects: {
      fallback: '项目经历',
      build: () => content.projects.flatMap((item) => {
        const paragraphs: DocxParagraph[] = []
        const itemName = inlineText(item.name)
        const itemUrl = inlineText(item.url)
        if (itemName || itemUrl) paragraphs.push(new Paragraph({
          style: 'ResumeEntryTitle',
          alignment: paragraphAlignment,
          keepNext: Boolean(item.description.trim() || item.visibleBullets.length),
          children: [ ...(itemName ? [new TextRun({ text: itemName, font: resumeFont, bold: true })] : []), ...(itemName && itemUrl ? [new TextRun({ text: '  ·  ', font: resumeFont })] : []), ...(itemUrl ? [linkOrText(itemUrl)] : []) ],
        }))
        paragraphs.push(...(item.description.trim() ? bodyParagraphs(item.description) : []))
        paragraphs.push(...item.visibleBullets.map(bulletParagraph))
        return paragraphs
      }),
    },
    languages: { fallback: '语言', build: () => bodyParagraphs(content.languages.map(inlineText).filter(Boolean).join('  ·  ')) },
  }
  const seenSections = new Set<ResumeSectionId>()
  const sectionOrder = [...resume.layout.sectionOrder, ...(Object.keys(sectionBuilders) as ResumeSectionId[])]
  sectionOrder.forEach((id) => {
    if (seenSections.has(id)) return
    seenSections.add(id)
    const section = sectionBuilders[id]
    if (!section || resume.layout.hiddenSections.includes(id)) return
    const sectionChildren = section.build()
    if (!sectionChildren.length) return
    children.push(sectionHeading(inlineText(resume.layout.sectionTitles[id] ?? '') || section.fallback), ...sectionChildren)
  })
  const fontScale = resume.layout.fontScale
  const bodySize = Math.round(21 * fontScale)
  const metaSize = Math.round(18 * fontScale)
  const titleSize = Math.round(34 * fontScale)
  const subtitleSize = Math.round(24 * fontScale)
  const bodyLine = Math.round(240 * resume.layout.lineHeight)
  const sectionGap = Math.round(resume.layout.sectionGap * 12)
  const paragraphAfter = resume.layout.density === 'compact' ? 70 : 100
  const document = new Document({
    title: inlineText(resume.title) || '简历',
    subject: '简历导出',
    creator: '简历工坊',
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, right: 900, bottom: 720, left: 900 },
        },
      },
      children,
    }],
    styles: {
      default: {
        document: {
          run: { font: resumeFont, size: bodySize, color: '374151' },
          paragraph: { spacing: { line: bodyLine } },
        },
      },
      paragraphStyles: [
        { id: 'ResumeTitle', name: 'Resume Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { after: 60, line: Math.round(360 * fontScale) }, keepLines: true }, run: { font: resumeFont, size: titleSize, bold: true, color: '111827' } },
        { id: 'ResumeSubtitle', name: 'Resume Subtitle', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { after: 100, line: Math.round(280 * fontScale) }, keepLines: true }, run: { font: resumeFont, size: subtitleSize, color: accent } },
        { id: 'ResumeContact', name: 'Resume Contact', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { after: Math.round(sectionGap * .75), line: Math.round(250 * fontScale) }, keepLines: true }, run: { font: resumeFont, size: metaSize, color: '6B7280' } },
        { id: 'ResumeSection', name: 'Resume Section', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { before: sectionGap, after: paragraphAfter, line: Math.round(280 * fontScale) }, keepNext: true, keepLines: true }, run: { font: resumeFont, size: Math.round(22 * fontScale), bold: true, color: accent } },
        { id: 'ResumeEntryTitle', name: 'Resume Entry Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { before: Math.round(sectionGap * .35), after: 35, line: Math.round(280 * fontScale) }, keepLines: true }, run: { font: resumeFont, size: bodySize, color: '1F2937' } },
        { id: 'ResumeMeta', name: 'Resume Meta', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { after: 55, line: Math.round(250 * fontScale) }, keepLines: true }, run: { font: resumeFont, size: metaSize, color: '6B7280' } },
        { id: 'ResumeBody', name: 'Resume Body', basedOn: 'Normal', next: 'Normal', quickFormat: true, paragraph: { spacing: { after: paragraphAfter, line: bodyLine }, keepLines: true }, run: { font: resumeFont, size: bodySize, color: '4B5563' } },
        { id: 'ResumeBullet', name: 'Resume Bullet', basedOn: 'Normal', next: 'ResumeBullet', quickFormat: true, paragraph: { indent: { left: 360, hanging: 180 }, spacing: { after: Math.round(paragraphAfter * .7), line: bodyLine }, keepLines: true }, run: { font: resumeFont, size: Math.max(18, bodySize - 1), color: '4B5563' } },
      ],
    },
  })
  const blob = await Packer.toBlob(document)
  downloadBlob(blob, `${sanitizeFileName(resume.title)}.docx`)
}
