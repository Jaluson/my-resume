import { forwardRef } from 'react'
import type { Resume } from '../types/resume'

type ResumePreviewProps = { resume: Resume }

const formatPeriod = (start: string, end: string, current: boolean) => {
  const finish = current ? '至今' : end
  if (!start && !finish) return ''
  if (!start) return finish
  if (!finish) return start
  return `${start} — ${finish}`
}

const cleanUrl = (value: string) => value.trim().replace(/^https?:\/\//, '')

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(function ResumePreview({ resume }, forwardedRef) {
  const { profile } = resume
  const experience = resume.experience.filter((item) => Boolean(item.company || item.role || item.location || formatPeriod(item.startDate, item.endDate, item.current) || item.bullets.some(Boolean)))
  const education = resume.education.filter((item) => Boolean(item.school || item.degree || item.field || formatPeriod(item.startDate, item.endDate, false)))
  const projects = resume.projects.filter((item) => Boolean(item.name || item.description || item.url || item.bullets.some(Boolean)))
  const skills = resume.skills.filter(Boolean)
  const languages = resume.languages.filter(Boolean)
  const hasContact = [profile.email, profile.phone, profile.location, profile.website].some(Boolean)
  const hasProfile = Boolean(profile.fullName || profile.jobTitle || hasContact)
  const hasContent = Boolean(hasProfile || resume.summary || experience.length || education.length || skills.length || projects.length || languages.length)

  return (
    <div ref={forwardedRef} className={`resume-paper resume-${resume.templateId}`} data-resume-preview>
      <div className="resume-main">
        {hasProfile && <header className="resume-header">
          <div>
            {profile.fullName && <h1>{profile.fullName}</h1>}
            {profile.jobTitle && <p className="resume-role">{profile.jobTitle}</p>}
          </div>
          {hasContact && (
            <div className="resume-contact">
              {profile.email && <span>{profile.email}</span>}
              {profile.phone && <span>{profile.phone}</span>}
              {profile.location && <span>{profile.location}</span>}
              {profile.website && <span>{cleanUrl(profile.website)}</span>}
            </div>
          )}
        </header>}

        {!hasContent && <div className="resume-empty">在左侧编辑内容，预览会即时出现在这里</div>}

        {resume.summary && (
          <section className="resume-section">
            <h2>个人简介</h2>
            <p>{resume.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="resume-section">
            <h2>工作经历</h2>
            {experience.map((item) => (
              <article className="resume-entry" key={item.id}>
                <div className="entry-heading">
                  <div><h3>{item.role || item.company}</h3>{item.company && item.role && <p>{item.company}{item.location ? ` · ${item.location}` : ''}</p>}{!item.role && item.location && <p>{item.location}</p>}</div>
                  <time>{formatPeriod(item.startDate, item.endDate, item.current)}</time>
                </div>
                {item.bullets.filter(Boolean).length > 0 && <ul>{item.bullets.filter(Boolean).map((bullet, index) => <li key={`${item.id}-bullet-${index}`}>{bullet}</li>)}</ul>}
              </article>
            ))}
          </section>
        )}

        {education.length > 0 && (
          <section className="resume-section">
            <h2>教育经历</h2>
            {education.map((item) => (
              <article className="resume-entry" key={item.id}>
                <div className="entry-heading">
                  <div><h3>{item.school || [item.degree, item.field].filter(Boolean).join(' · ')}</h3>{item.school && (item.degree || item.field) && <p>{[item.degree, item.field].filter(Boolean).join(' · ')}</p>}</div>
                  <time>{formatPeriod(item.startDate, item.endDate, false)}</time>
                </div>
              </article>
            ))}
          </section>
        )}

        {skills.length > 0 && (
          <section className="resume-section">
            <h2>技能</h2>
            <div className="resume-tags">{skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="resume-section">
            <h2>项目经历</h2>
            {projects.map((item) => (
              <article className="resume-entry" key={item.id}>
                <div className="entry-heading"><div><h3>{item.name || item.url}</h3>{item.name && item.url && <p className="entry-url">{cleanUrl(item.url)}</p>}</div></div>
                {item.description && <p>{item.description}</p>}
                {item.bullets.filter(Boolean).length > 0 && <ul>{item.bullets.filter(Boolean).map((bullet, index) => <li key={`${item.id}-bullet-${index}`}>{bullet}</li>)}</ul>}
              </article>
            ))}
          </section>
        )}

        {languages.length > 0 && (
          <section className="resume-section">
            <h2>语言</h2>
            <p>{languages.join(' · ')}</p>
          </section>
        )}
      </div>
    </div>
  )
})

export default ResumePreview
