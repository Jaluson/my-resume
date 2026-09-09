import { makeId } from '../../store/resumeStore'
import type { EducationItem, ExperienceItem, ProjectItem, ResumeSectionId } from '../../types/resume'

export const moveAt = <T,>(items: T[], index: number, direction: -1 | 1) => {
  const next = index + direction
  if (next < 0 || next >= items.length) return items
  const result = [...items]
  ;[result[index], result[next]] = [result[next], result[index]]
  return result
}

export const emptyExperience = (): ExperienceItem => ({ id: makeId(), company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] })
export const emptyEducation = (): EducationItem => ({ id: makeId(), school: '', degree: '', field: '', startDate: '', endDate: '' })
export const emptyProject = (): ProjectItem => ({ id: makeId(), name: '', description: '', url: '', bullets: [''] })

export const sectionLabels: Record<ResumeSectionId, string> = {
  summary: '个人简介', experience: '工作经历', education: '教育经历', skills: '技能', projects: '项目经历', languages: '语言',
}
