import type { EducationItem, ExperienceItem, ProjectItem, Profile, Resume, ResumeStore } from '../types/resume'

export const STORAGE_KEY = 'resume-editor:v1'
export const RECOVERY_KEY = 'resume-editor:recovery'
export const STORAGE_VERSION = 2

export type LoadStatus = 'example' | 'stored' | 'migrated' | 'recovered'
export type ResumeStoreLoad = { store: ResumeStore; status: LoadStatus; warning?: string }

type StoredEnvelope = { version: number; store: ResumeStore }

export const makeId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

const profile: Profile = { fullName: '林晓岚', jobTitle: '产品设计师', email: 'xiaolan.lin@example.com', phone: '+86 138 0000 1234', location: '上海，中国', website: 'xiaolan.design' }
const experience: ExperienceItem[] = [
  { id: makeId(), company: '拾光科技', role: '高级产品设计师', location: '上海', startDate: '2021-06', endDate: '', current: true, bullets: ['负责企业协作产品从 0 到 1 的体验设计，推动核心流程转化率提升 32%。', '建立跨团队设计规范与评审机制，缩短交付周期并提升产品一致性。'] },
  { id: makeId(), company: '知行工作室', role: '产品设计师', location: '杭州', startDate: '2018-08', endDate: '2021-05', current: false, bullets: ['参与移动端产品重构，覆盖用户研究、交互原型与视觉落地。'] },
]
const education: EducationItem[] = [{ id: makeId(), school: '中国美术学院', degree: '本科', field: '视觉传达设计', startDate: '2014', endDate: '2018' }]
const projects: ProjectItem[] = [{ id: makeId(), name: '协作工作台', description: '面向远程团队的任务协作与知识管理产品。', url: 'xiaolan.design/workspace', bullets: ['通过信息架构重组，让新用户上手时间降低 40%。'] }]

export const createBlankResume = (title = '未命名简历'): Resume => ({
  id: makeId(), title, templateId: 'classic', updatedAt: now(),
  profile: { fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '' }, summary: '', experience: [], education: [], skills: [], projects: [], languages: [],
})

const createExampleResume = (): Resume => ({
  id: makeId(), title: '我的第一份简历', templateId: 'classic', updatedAt: now(), profile: { ...profile },
  summary: '拥有 6 年数字产品设计经验，擅长将复杂业务转化为清晰、可执行的用户体验。注重以研究驱动决策，并通过设计系统帮助团队高质量交付。',
  experience: experience.map((item) => ({ ...item, id: makeId(), bullets: [...item.bullets] })), education: education.map((item) => ({ ...item, id: makeId() })),
  skills: ['用户研究', '交互设计', '设计系统', 'Figma', '原型设计', '团队协作'], projects: projects.map((item) => ({ ...item, id: makeId(), bullets: [...item.bullets] })), languages: ['中文（母语）', '英语（熟练）'],
})

const isString = (value: unknown): value is string => typeof value === 'string'
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)
const isProfile = (value: unknown): value is Profile => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Profile>
  return [item.fullName, item.jobTitle, item.email, item.phone, item.location, item.website].every(isString)
}
const isExperience = (value: unknown): value is ExperienceItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ExperienceItem>
  return [item.id, item.company, item.role, item.location, item.startDate, item.endDate].every(isString) && typeof item.current === 'boolean' && isStringArray(item.bullets)
}
const isEducation = (value: unknown): value is EducationItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<EducationItem>
  return [item.id, item.school, item.degree, item.field, item.startDate, item.endDate].every(isString)
}
const isProject = (value: unknown): value is ProjectItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ProjectItem>
  return [item.id, item.name, item.description, item.url].every(isString) && isStringArray(item.bullets)
}
const isResume = (value: unknown): value is Resume => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Resume>
  return isString(item.id) && isString(item.title) && (item.templateId === 'classic' || item.templateId === 'modern' || item.templateId === 'minimal' || item.templateId === 'editorial' || item.templateId === 'executive' || item.templateId === 'compact') && isString(item.updatedAt) && isProfile(item.profile) && isString(item.summary) && Array.isArray(item.experience) && item.experience.every(isExperience) && Array.isArray(item.education) && item.education.every(isEducation) && isStringArray(item.skills) && Array.isArray(item.projects) && item.projects.every(isProject) && isStringArray(item.languages)
}
const isStoreShape = (value: unknown): value is { selectedResumeId: string; resumes: unknown[] } => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<{ selectedResumeId: string; resumes: unknown[] }>
  return isString(item.selectedResumeId) && Array.isArray(item.resumes)
}

const normalizeResume = (resume: Resume, usedResumeIds: Set<string>): Resume => {
  const resumeId = resume.id.trim() && !usedResumeIds.has(resume.id) ? resume.id : makeId()
  usedResumeIds.add(resumeId)
  const normalizeItems = <T extends { id: string }>(items: T[], copy: (item: T) => T) => {
    const used = new Set<string>()
    return items.map((item) => {
      const id = item.id.trim() && !used.has(item.id) ? item.id : makeId()
      used.add(id)
      return { ...copy(item), id }
    })
  }
  return {
    ...resume, id: resumeId, profile: { ...resume.profile }, summary: resume.summary, updatedAt: resume.updatedAt,
    experience: normalizeItems(resume.experience, (item) => ({ ...item, endDate: item.current ? '' : item.endDate, bullets: [...item.bullets] })),
    education: normalizeItems(resume.education, (item) => ({ ...item })),
    projects: normalizeItems(resume.projects, (item) => ({ ...item, bullets: [...item.bullets] })),
    skills: [...resume.skills], languages: [...resume.languages],
  }
}

const normalizeStore = (resumes: Resume[], selectedResumeId: string): ResumeStore => {
  const usedResumeIds = new Set<string>()
  const normalized = resumes.map((resume) => normalizeResume(resume, usedResumeIds))
  const selected = normalized.find((resume) => resume.id === selectedResumeId)
  return { resumes: normalized, selectedResumeId: selected?.id ?? normalized[0].id }
}

const createBlankStore = (): ResumeStore => { const blank = createBlankResume(); return { selectedResumeId: blank.id, resumes: [blank] } }
const exampleStore = (): ResumeStore => { const first = createExampleResume(); return { selectedResumeId: first.id, resumes: [first] } }
const envelope = (store: ResumeStore): StoredEnvelope => ({ version: STORAGE_VERSION, store })

const saveRecovery = (raw: string) => { try { window.localStorage.setItem(RECOVERY_KEY, raw) } catch { /* Keep recovery in the returned in-memory state. */ } }
const warningFor = (message: string) => `本地数据需要恢复：${message} 原始数据已保存在恢复备份中。`
export const clearRecovery = () => { if (typeof window !== 'undefined') { try { window.localStorage.removeItem(RECOVERY_KEY) } catch { /* Recovery dismissal is best effort. */ } } }

export const loadResumeStore = (): ResumeStoreLoad => {
  if (typeof window === 'undefined') return { store: exampleStore(), status: 'example' }
  let raw: string | null
  try { raw = window.localStorage.getItem(STORAGE_KEY) } catch { return { store: createBlankStore(), status: 'recovered', warning: '无法读取本地存储，当前使用内存中的空白简历。' } }
  if (!raw) return { store: exampleStore(), status: 'example' }
  try {
    const parsed: unknown = JSON.parse(raw)
    const parsedRecord = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
    const isEnvelope = Boolean(parsedRecord && 'version' in parsedRecord)
    const candidate = isEnvelope ? parsedRecord?.store : parsed
    const unknownVersion = isEnvelope && parsedRecord?.version !== STORAGE_VERSION
    if (!isStoreShape(candidate)) {
      saveRecovery(raw)
      return { store: createBlankStore(), status: 'recovered', warning: warningFor('存储结构无效，已载入空白简历。') }
    }
    if (candidate.resumes.length === 0) {
      if (unknownVersion) {
        saveRecovery(raw)
        return { store: createBlankStore(), status: 'recovered', warning: warningFor('存储版本未知，已载入空白简历。') }
      }
      return { store: createBlankStore(), status: isEnvelope ? 'stored' : 'migrated', warning: isEnvelope ? undefined : '旧版数据已升级。' }
    }
    const validResumes = candidate.resumes.filter(isResume)
    if (validResumes.length === 0) {
      saveRecovery(raw)
      return { store: createBlankStore(), status: 'recovered', warning: warningFor('没有可验证的简历，已载入空白简历。') }
    }
    const store = normalizeStore(validResumes, candidate.selectedResumeId)
    const dropped = validResumes.length !== candidate.resumes.length
    if (dropped || unknownVersion) saveRecovery(raw)
    if (unknownVersion) return { store, status: 'recovered', warning: warningFor('存储版本未知，已保留可验证的简历。') }
    return { store, status: isEnvelope ? 'stored' : 'migrated', warning: dropped ? warningFor(`已跳过 ${candidate.resumes.length - validResumes.length} 条损坏简历。`) : isEnvelope ? undefined : '旧版数据已升级。' }
  } catch {
    saveRecovery(raw)
    return { store: createBlankStore(), status: 'recovered', warning: warningFor('JSON 无法解析，已载入空白简历。') }
  }
}

export const saveResumeStore = (store: ResumeStore): boolean => {
  if (typeof window === 'undefined') return false
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope(store))); return true } catch { return false }
}
