import type { EducationItem, ExperienceItem, ProjectItem, Resume } from '../types/resume'

export type ProjectedExperience = ExperienceItem & { visibleBullets: string[] }
export type ProjectedProject = ProjectItem & { visibleBullets: string[] }
export type ResumeContent = {
  profile: Resume['profile']
  summary: string
  experience: ProjectedExperience[]
  education: EducationItem[]
  skills: string[]
  projects: ProjectedProject[]
  languages: string[]
}

const hasText = (value: string) => value.trim().length > 0
const visibleBullets = (bullets: string[]) => bullets.filter(hasText)

export function getResumeContent(resume: Resume): ResumeContent {
  const experience = resume.experience.map((item) => ({ ...item, visibleBullets: visibleBullets(item.bullets) })).filter((item) => [item.company, item.role, item.location, formatResumePeriod(item.startDate, item.endDate, item.current)].some(hasText) || item.visibleBullets.length > 0)
  const education = resume.education.filter((item) => [item.school, item.degree, item.field, formatResumePeriod(item.startDate, item.endDate, false)].some(hasText))
  const projects = resume.projects.map((item) => ({ ...item, visibleBullets: visibleBullets(item.bullets) })).filter((item) => [item.name, item.description, item.url].some(hasText) || item.visibleBullets.length > 0)
  return { profile: resume.profile, summary: resume.summary, experience, education, skills: resume.skills.filter(hasText), projects, languages: resume.languages.filter(hasText) }
}

export function formatResumePeriod(start: string, end: string, current: boolean): string {
  const first = start.trim()
  const finish = current ? '至今' : end.trim()
  return [first, finish].filter(hasText).join(' — ')
}

export function cleanUrl(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '')
}

export function toSafeExternalUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
