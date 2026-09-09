import { createElement, forwardRef, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties, ElementType, SyntheticEvent } from 'react'
import type { Resume } from '../types/resume'
import { templateById } from '../data/templates'
import { cleanUrl, formatResumePeriod, getResumeContent, toSafeExternalUrl } from '../utils/resume'

type ResumePreviewProps = { resume: Resume; interactive?: boolean; onChange?: (resume: Resume) => void }
type AccentStyle = CSSProperties & { '--template-accent': string; '--resume-font-scale': string }
type EditableTextProps = { value: string; onChange: (value: string) => void; as?: ElementType; className?: string; ariaLabel: string; placeholder?: string }

const hasText = (value: string) => value.trim().length > 0

function EditableText({ value, onChange, as = 'span', className, ariaLabel, placeholder }: EditableTextProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.textContent !== value) ref.current.textContent = value
  }, [value])
  const handleInput = (event: SyntheticEvent<HTMLElement>) => onChange(event.currentTarget.textContent ?? '')
  return createElement(as, {
    ref,
    className: `${className ?? ''} preview-editable${value ? '' : ' is-empty'}`,
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: 'textbox',
    'aria-label': ariaLabel,
    'data-placeholder': placeholder,
    onInput: handleInput,
  }, value)
}

const text = (value: string, interactive: boolean, onChange: ((value: string) => void) | undefined, as: ElementType, ariaLabel: string, placeholder?: string, className?: string) => interactive && onChange
  ? <EditableText value={value} onChange={onChange} as={as} ariaLabel={ariaLabel} placeholder={placeholder} className={className} />
  : createElement(as, { className }, value)

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(function ResumePreview({ resume, interactive = true, onChange }, forwardedRef) {
  const content = useMemo(() => getResumeContent(resume), [resume])
  const { profile } = content
  const template = templateById(resume.templateId)
  const websiteUrl = toSafeExternalUrl(profile.website)
  const hasContact = [profile.email, profile.phone, profile.location, profile.website].some(hasText)
  const hasProfile = Boolean(hasText(profile.fullName) || hasText(profile.jobTitle) || hasContact)
  const hasContent = Boolean(hasProfile || hasText(content.summary) || content.experience.length || content.education.length || content.skills.length || content.projects.length || content.languages.length)
  const accentStyle: AccentStyle = { '--template-accent': template.accent, '--resume-font-scale': String(resume.layout.fontScale) }
  const editing = Boolean(interactive && onChange)
  const editProfile = (key: keyof Resume['profile'], value: string) => onChange?.({ ...resume, profile: { ...resume.profile, [key]: value } })
  const editExperience = (id: string, key: keyof Resume['experience'][number], value: string) => onChange?.({ ...resume, experience: resume.experience.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const editBullet = (id: string, bullet: string, value: string) => onChange?.({ ...resume, experience: resume.experience.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((entry) => entry === bullet ? value : entry) } : item) })
  const editEducation = (id: string, key: keyof Resume['education'][number], value: string) => onChange?.({ ...resume, education: resume.education.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const editProject = (id: string, key: keyof Resume['projects'][number], value: string) => onChange?.({ ...resume, projects: resume.projects.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const editProjectBullet = (id: string, bullet: string, value: string) => onChange?.({ ...resume, projects: resume.projects.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((entry) => entry === bullet ? value : entry) } : item) })
  const editList = (key: 'skills' | 'languages', index: number, value: string) => onChange?.({ ...resume, [key]: resume[key].map((entry, entryIndex) => entryIndex === index ? value : entry) })

  return (
    <div ref={forwardedRef} className={`resume-paper resume-${resume.templateId} resume-custom-order resume-density-${resume.layout.density} resume-align-${resume.layout.alignment}`} data-resume-preview style={accentStyle}>
      <div className="resume-main">
        {hasProfile && <header className="resume-header">
          <div>
            {hasText(profile.fullName) && text(profile.fullName, editing, (value) => editProfile('fullName', value), 'h1', '姓名', '例如：张三')}
            {hasText(profile.jobTitle) && text(profile.jobTitle, editing, (value) => editProfile('jobTitle', value), 'p', '职位', '例如：产品经理', 'resume-role')}
          </div>
          {hasContact && <div className="resume-contact">
            {hasText(profile.email) && (editing ? <EditableText value={profile.email} onChange={(value) => editProfile('email', value)} as="span" ariaLabel="邮箱" /> : <a href={`mailto:${profile.email}`}>{profile.email}</a>)}
            {hasText(profile.phone) && text(profile.phone, editing, (value) => editProfile('phone', value), 'span', '电话')}
            {hasText(profile.location) && text(profile.location, editing, (value) => editProfile('location', value), 'span', '所在地')}
            {hasText(profile.website) && (editing ? <EditableText value={profile.website} onChange={(value) => editProfile('website', value)} as="span" ariaLabel="个人网站" /> : websiteUrl ? <a href={websiteUrl} target="_blank" rel="noreferrer">{cleanUrl(profile.website)}</a> : <span>{cleanUrl(profile.website)}</span>)}
          </div>}
        </header>}

        {!hasContent && <div className="resume-empty">在左侧编辑内容，预览会即时出现在这里</div>}
        {hasText(content.summary) && <section className="resume-section" style={{ order: resume.layout.sectionOrder.indexOf('summary') + 1 }}><h2>个人简介</h2>{text(content.summary, editing, (value) => onChange?.({ ...resume, summary: value }), 'p', '个人简介')}</section>}

        {content.experience.length > 0 && <section className="resume-section" style={{ order: resume.layout.sectionOrder.indexOf('experience') + 1 }}><h2>工作经历</h2>{content.experience.map((item) => (
          <article className="resume-entry" key={item.id}>
            <div className="entry-heading"><div><h3>{text(item.role, editing, (value) => editExperience(item.id, 'role', value), 'span', '职位', '职位名称') || text(item.company, editing, (value) => editExperience(item.id, 'company', value), 'span', '公司', '公司名称')}</h3>{(item.company || item.role || item.location) && <p>{text(item.company, editing, (value) => editExperience(item.id, 'company', value), 'span', '公司', '公司名称')}{item.company && item.role && ' · '}{item.location && text(item.location, editing, (value) => editExperience(item.id, 'location', value), 'span', '所在地')}</p>}</div><time>{editing ? <><EditableText value={item.startDate} onChange={(value) => editExperience(item.id, 'startDate', value)} ariaLabel="开始时间" placeholder="开始时间" />{(item.startDate || item.endDate || item.current) && ' — '}{item.current ? '至今' : <EditableText value={item.endDate} onChange={(value) => editExperience(item.id, 'endDate', value)} ariaLabel="结束时间" placeholder="结束时间" />}</> : formatResumePeriod(item.startDate, item.endDate, item.current)}</time></div>
            {item.visibleBullets.length > 0 && <ul>{item.visibleBullets.map((bullet, index) => <li key={`${item.id}-bullet-${index}`}>{editing ? <EditableText value={bullet} onChange={(value) => editBullet(item.id, bullet, value)} ariaLabel={`工作成果 ${index + 1}`} /> : bullet}</li>)}</ul>}
          </article>
        ))}</section>}

        {content.education.length > 0 && <section className="resume-section" style={{ order: resume.layout.sectionOrder.indexOf('education') + 1 }}><h2>教育经历</h2>{content.education.map((item) => (
          <article className="resume-entry" key={item.id}><div className="entry-heading"><div><h3>{text(item.school, editing, (value) => editEducation(item.id, 'school', value), 'span', '学校', '学校名称') || text(item.degree, editing, (value) => editEducation(item.id, 'degree', value), 'span', '学位', '学位')}</h3>{(item.degree || item.field) && <p>{text(item.degree, editing, (value) => editEducation(item.id, 'degree', value), 'span', '学位', '学位')}{item.degree && item.field && ' · '}{text(item.field, editing, (value) => editEducation(item.id, 'field', value), 'span', '专业', '专业')}</p>}</div><time>{editing ? <><EditableText value={item.startDate} onChange={(value) => editEducation(item.id, 'startDate', value)} ariaLabel="开始时间" />{(item.startDate || item.endDate) && ' — '}<EditableText value={item.endDate} onChange={(value) => editEducation(item.id, 'endDate', value)} ariaLabel="结束时间" /></> : formatResumePeriod(item.startDate, item.endDate, false)}</time></div></article>
        ))}</section>}

        {content.skills.length > 0 && <section className="resume-section" style={{ order: resume.layout.sectionOrder.indexOf('skills') + 1 }}><h2>技能</h2><div className="resume-tags">{content.skills.map((skill, index) => { const sourceIndex = resume.skills.indexOf(skill); return <span key={`${skill}-${index}`}>{editing ? <EditableText value={skill} onChange={(value) => editList('skills', sourceIndex, value)} as="span" ariaLabel={`技能 ${index + 1}`} /> : skill}</span> })}</div></section>}

        {content.projects.length > 0 && <section className="resume-section" style={{ order: resume.layout.sectionOrder.indexOf('projects') + 1 }}><h2>项目经历</h2>{content.projects.map((item) => {
          const projectUrl = toSafeExternalUrl(item.url)
          return <article className="resume-entry" key={item.id}><div className="entry-heading"><div><h3>{text(item.name, editing, (value) => editProject(item.id, 'name', value), 'span', '项目名称', '项目名称') || text(item.url, editing, (value) => editProject(item.id, 'url', value), 'span', '项目链接', '项目链接')}</h3>{item.url && (editing ? <EditableText value={cleanUrl(item.url)} onChange={(value) => editProject(item.id, 'url', value)} as="span" className="entry-url" ariaLabel="项目链接" /> : projectUrl ? <a className="entry-url" href={projectUrl} target="_blank" rel="noreferrer">{cleanUrl(item.url)}</a> : <p className="entry-url">{cleanUrl(item.url)}</p>)}</div></div>{hasText(item.description) && text(item.description, editing, (value) => editProject(item.id, 'description', value), 'p', '项目描述')}{item.visibleBullets.length > 0 && <ul>{item.visibleBullets.map((bullet, index) => <li key={`${item.id}-bullet-${index}`}>{editing ? <EditableText value={bullet} onChange={(value) => editProjectBullet(item.id, bullet, value)} ariaLabel={`项目成果 ${index + 1}`} /> : bullet}</li>)}</ul>}</article>
        })}</section>}

        {content.languages.length > 0 && <section className="resume-section" style={{ order: resume.layout.sectionOrder.indexOf('languages') + 1 }}><h2>语言</h2><p>{content.languages.map((language, index) => { const sourceIndex = resume.languages.indexOf(language); return <span key={`${language}-${index}`}>{editing ? <EditableText value={language} onChange={(value) => editList('languages', sourceIndex, value)} ariaLabel={`语言 ${index + 1}`} /> : language}{index < content.languages.length - 1 && ' · '}</span> })}</p></section>}
      </div>
    </div>
  )
})

export default ResumePreview
