export type TemplateId = 'classic' | 'modern' | 'minimal' | 'editorial' | 'executive' | 'compact'

export type Profile = {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  website: string
}

export type ExperienceItem = {
  id: string
  company: string
  role: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
}

export type EducationItem = {
  id: string
  school: string
  degree: string
  field: string
  startDate: string
  endDate: string
}

export type ProjectItem = {
  id: string
  name: string
  description: string
  url: string
  bullets: string[]
}

export type ResumeSectionId = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'languages'

export type ResumeLayout = {
  sectionOrder: ResumeSectionId[]
  hiddenSections: ResumeSectionId[]
  sectionTitles: Partial<Record<ResumeSectionId, string>>
  density: 'comfortable' | 'compact'
  fontScale: number
  sectionGap: number
  lineHeight: number
  accentColor: string
  alignment: 'left' | 'center'
}

export type Resume = {
  id: string
  title: string
  templateId: TemplateId
  updatedAt: string
  profile: Profile
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: string[]
  projects: ProjectItem[]
  languages: string[]
  layout: ResumeLayout
}

export type ResumeStore = {
  selectedResumeId: string
  resumes: Resume[]
}
