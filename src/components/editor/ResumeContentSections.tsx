import type { Resume } from '../../types/resume'
import { validateExternalUrl } from '../../utils/resume'
import EditorSection from './EditorSection'
import { Field, TextareaField } from './Field'
import SimpleList from './SimpleList'
export { EducationSection, ExperienceSection, ProjectsSection } from './RepeatItemSections'
const Section = EditorSection

type SectionEditorProps = { resume: Resume; onChange: (resume: Resume) => void }
const updateList = <K extends keyof Resume>(resume: Resume, onChange: (resume: Resume) => void, key: K, value: Resume[K]) => onChange({ ...resume, [key]: value })

export function ProfileSection({ resume, onChange }: SectionEditorProps) {
  const updateProfile = (key: keyof Resume['profile'], value: string) => onChange({ ...resume, profile: { ...resume.profile, [key]: value } })
  return <Section title="个人信息" description="让招聘者快速了解你"><div className="field-grid profile-field-grid">
    <Field label="姓名" value={resume.profile.fullName} placeholder="例如：张三" onChange={(value) => updateProfile('fullName', value)} />
    <Field label="职位" value={resume.profile.jobTitle} placeholder="例如：产品经理" onChange={(value) => updateProfile('jobTitle', value)} />
    <Field label="邮箱" value={resume.profile.email} placeholder="name@example.com" type="email" validate={(value) => value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '请输入有效的邮箱地址' : undefined} onChange={(value) => updateProfile('email', value)} />
    <Field label="电话" value={resume.profile.phone} placeholder="+86 138 0000 0000" onChange={(value) => updateProfile('phone', value)} />
    <Field label="所在地" value={resume.profile.location} placeholder="城市，国家" onChange={(value) => updateProfile('location', value)} />
    <Field label="个人网站" value={resume.profile.website} placeholder="yourwebsite.com" type="url" validate={validateExternalUrl} onChange={(value) => updateProfile('website', value)} />
  </div></Section>
}

export function SummarySection({ resume, onChange }: SectionEditorProps) {
  return <Section title="个人简介" description="用几句话概括你的优势" defaultOpen={Boolean(resume.summary)}><TextareaField label="简介内容" value={resume.summary} placeholder="介绍你的经验、专长和职业方向……" onChange={(value) => updateList(resume, onChange, 'summary', value)} /></Section>
}


export function SkillsSection({ resume, onChange }: SectionEditorProps) {
  return <Section title="技能" description="用关键词突出你的能力"><SimpleList values={resume.skills} label="技能" placeholder="例如：项目管理" emptyText="还没有添加技能" onChange={(values) => updateList(resume, onChange, 'skills', values)} /></Section>
}


export function LanguagesSection({ resume, onChange }: SectionEditorProps) {
  return <Section title="语言" description="你掌握的语言及熟练度"><SimpleList values={resume.languages} label="语言" placeholder="例如：英语（熟练）" emptyText="还没有添加语言" onChange={(values) => updateList(resume, onChange, 'languages', values)} /></Section>
}
