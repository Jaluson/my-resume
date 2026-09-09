import type { Resume } from '../types/resume'
import LayoutControls from './editor/LayoutControls'
import { EducationSection, ExperienceSection, LanguagesSection, ProfileSection, ProjectsSection, SkillsSection, SummarySection } from './editor/ResumeContentSections'

type ResumeEditorProps = { resume: Resume; onChange: (resume: Resume) => void }

export default function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  return <div className="editor-sections">
    <LayoutControls resume={resume} onChange={onChange} />
    <ProfileSection resume={resume} onChange={onChange} />
    <SummarySection resume={resume} onChange={onChange} />
    <ExperienceSection resume={resume} onChange={onChange} />
    <EducationSection resume={resume} onChange={onChange} />
    <SkillsSection resume={resume} onChange={onChange} />
    <ProjectsSection resume={resume} onChange={onChange} />
    <LanguagesSection resume={resume} onChange={onChange} />
  </div>
}
