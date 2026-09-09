import { forwardRef, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Resume } from '../types/resume'
import { templateById } from '../data/templates'
import { getResumeContent, toSafeExternalUrl } from '../utils/resume'
import ResumeHeader from './preview/ResumeHeader'
import ResumeSections from './preview/ResumeSections'

type ResumePreviewProps = { resume: Resume; interactive?: boolean; onChange?: (resume: Resume) => void }
type AccentStyle = CSSProperties & { '--template-accent': string; '--resume-font-scale': string; '--resume-section-gap': string; '--resume-line-height': string }

const hasText = (value: string) => value.trim().length > 0

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(function ResumePreview({ resume, interactive = true, onChange }, forwardedRef) {
  const content = useMemo(() => getResumeContent(resume), [resume])
  const { profile } = content
  const template = templateById(resume.templateId)
  const websiteUrl = toSafeExternalUrl(profile.website)
  const hasContact = [profile.email, profile.phone, profile.location, profile.website].some(hasText)
  const hasProfile = Boolean(hasText(profile.fullName) || hasText(profile.jobTitle) || hasContact)
  const editing = Boolean(interactive && onChange)
  const accentStyle: AccentStyle = { '--template-accent': resume.layout.accentColor || template.accent, '--resume-font-scale': String(resume.layout.fontScale), '--resume-section-gap': `${resume.layout.sectionGap}px`, '--resume-line-height': String(resume.layout.lineHeight) }
  const isVisible = (section: keyof Resume['layout']['sectionTitles']) => !resume.layout.hiddenSections.includes(section)
  const sectionTitle = (section: keyof Resume['layout']['sectionTitles']) => resume.layout.sectionTitles[section] || ({ summary: '个人简介', experience: '工作经历', education: '教育经历', skills: '技能', projects: '项目经历', languages: '语言' }[section])
  const editProfile = (key: keyof Resume['profile'], value: string) => onChange?.({ ...resume, profile: { ...resume.profile, [key]: value } })
  const editExperience = (id: string, key: keyof Resume['experience'][number], value: string) => onChange?.({ ...resume, experience: resume.experience.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const editBullet = (id: string, bullet: string, value: string) => onChange?.({ ...resume, experience: resume.experience.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((entry) => entry === bullet ? value : entry) } : item) })
  const editEducation = (id: string, key: keyof Resume['education'][number], value: string) => onChange?.({ ...resume, education: resume.education.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const editProject = (id: string, key: keyof Resume['projects'][number], value: string) => onChange?.({ ...resume, projects: resume.projects.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const editProjectBullet = (id: string, bullet: string, value: string) => onChange?.({ ...resume, projects: resume.projects.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((entry) => entry === bullet ? value : entry) } : item) })
  const editList = (key: 'skills' | 'languages', index: number, value: string) => onChange?.({ ...resume, [key]: resume[key].map((entry, entryIndex) => entryIndex === index ? value : entry) })

  return <div ref={forwardedRef} className={`resume-paper resume-${resume.templateId} resume-custom-order resume-density-${resume.layout.density} resume-align-${resume.layout.alignment}`} data-resume-preview style={accentStyle}>
    <div className="resume-main">
      {(hasProfile || editing) && <ResumeHeader profile={profile} editing={editing} websiteUrl={websiteUrl ?? undefined} onChange={editProfile} />}
      <ResumeSections resume={resume} content={content} editing={editing} isVisible={isVisible} sectionTitle={sectionTitle} editExperience={editExperience} editBullet={editBullet} editEducation={editEducation} editProject={editProject} editProjectBullet={editProjectBullet} editList={editList} editSummary={(value) => onChange?.({ ...resume, summary: value })} />
    </div>
  </div>
})

export default ResumePreview
