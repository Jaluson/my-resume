import { forwardRef, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Resume } from '../types/resume'
import { templateById } from '../data/templates'
import { cleanUrl, formatResumePeriod, getResumeContent, toSafeExternalUrl } from '../utils/resume'

type ResumePreviewProps = { resume: Resume; interactive?: boolean }

type AccentStyle = CSSProperties & { '--template-accent': string }

const hasText = (value: string) => value.trim().length > 0

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(function ResumePreview({ resume, interactive = true }, forwardedRef) {
  const content = useMemo(() => getResumeContent(resume), [resume])
  const { profile } = content
  const template = templateById(resume.templateId)
  const websiteUrl = toSafeExternalUrl(profile.website)
  const hasContact = [profile.email, profile.phone, profile.location, profile.website].some(hasText)
  const hasProfile = Boolean(hasText(profile.fullName) || hasText(profile.jobTitle) || hasContact)
  const hasContent = Boolean(hasProfile || hasText(content.summary) || content.experience.length || content.education.length || content.skills.length || content.projects.length || content.languages.length)
  const accentStyle: AccentStyle = { '--template-accent': template.accent }

  return (
    <div ref={forwardedRef} className={`resume-paper resume-${resume.templateId}`} data-resume-preview style={accentStyle}>
      <div className="resume-main">
        {hasProfile && <header className="resume-header">
          <div>
            {hasText(profile.fullName) && <h1>{profile.fullName}</h1>}
            {hasText(profile.jobTitle) && <p className="resume-role">{profile.jobTitle}</p>}
          </div>
          {hasContact && <div className="resume-contact">
            {hasText(profile.email) && (interactive ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : <span>{profile.email}</span>)}
            {hasText(profile.phone) && <span>{profile.phone}</span>}
            {hasText(profile.location) && <span>{profile.location}</span>}
            {hasText(profile.website) && (websiteUrl && interactive ? <a href={websiteUrl} target="_blank" rel="noreferrer">{cleanUrl(profile.website)}</a> : <span>{cleanUrl(profile.website)}</span>)}
          </div>}
        </header>}

        {!hasContent && <div className="resume-empty">在左侧编辑内容，预览会即时出现在这里</div>}
        {hasText(content.summary) && <section className="resume-section"><h2>个人简介</h2><p>{content.summary}</p></section>}

        {content.experience.length > 0 && <section className="resume-section"><h2>工作经历</h2>{content.experience.map((item) => <article className="resume-entry" key={item.id}>
          <div className="entry-heading"><div><h3>{item.role || item.company}</h3>{item.company && item.role && <p>{item.company}{item.location ? ` · ${item.location}` : ''}</p>}{!item.role && item.location && <p>{item.location}</p>}</div><time>{formatResumePeriod(item.startDate, item.endDate, item.current)}</time></div>
          {item.visibleBullets.length > 0 && <ul>{item.visibleBullets.map((bullet, index) => <li key={`${item.id}-bullet-${index}`}>{bullet}</li>)}</ul>}
        </article>)}</section>}

        {content.education.length > 0 && <section className="resume-section"><h2>教育经历</h2>{content.education.map((item) => <article className="resume-entry" key={item.id}>
          <div className="entry-heading"><div><h3>{item.school || [item.degree, item.field].filter(hasText).join(' · ')}</h3>{item.school && (item.degree || item.field) && <p>{[item.degree, item.field].filter(hasText).join(' · ')}</p>}</div><time>{formatResumePeriod(item.startDate, item.endDate, false)}</time></div>
        </article>)}</section>}

        {content.skills.length > 0 && <section className="resume-section"><h2>技能</h2><div className="resume-tags">{content.skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div></section>}

        {content.projects.length > 0 && <section className="resume-section"><h2>项目经历</h2>{content.projects.map((item) => {
          const projectUrl = toSafeExternalUrl(item.url)
          return <article className="resume-entry" key={item.id}>
            <div className="entry-heading"><div><h3>{item.name || item.url}</h3>{item.url && (projectUrl && interactive ? <a className="entry-url" href={projectUrl} target="_blank" rel="noreferrer">{cleanUrl(item.url)}</a> : <p className="entry-url">{cleanUrl(item.url)}</p>)}</div></div>
            {hasText(item.description) && <p>{item.description}</p>}
            {item.visibleBullets.length > 0 && <ul>{item.visibleBullets.map((bullet, index) => <li key={`${item.id}-bullet-${index}`}>{bullet}</li>)}</ul>}
          </article>
        })}</section>}

        {content.languages.length > 0 && <section className="resume-section"><h2>语言</h2><p>{content.languages.join(' · ')}</p></section>}
      </div>
    </div>
  )
})

export default ResumePreview
