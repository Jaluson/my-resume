import type { Profile } from '../../types/resume'
import { cleanUrl } from '../../utils/resume'
import { EditableText, text } from './PreviewText'

type ResumeHeaderProps = { profile: Profile; editing: boolean; websiteUrl: string | undefined; onChange: (key: keyof Profile, value: string) => void }

export default function ResumeHeader({ profile, editing, websiteUrl, onChange }: ResumeHeaderProps) {
  const hasContact = [profile.email, profile.phone, profile.location, profile.website].some((value) => value.trim().length > 0)
  return <header className="resume-header">
    <div>
      {(profile.fullName.trim() || editing) && text(profile.fullName, editing, (value) => onChange('fullName', value), 'h1', '姓名', '例如：张三')}
      {(profile.jobTitle.trim() || editing) && text(profile.jobTitle, editing, (value) => onChange('jobTitle', value), 'p', '职位', '例如：产品经理', 'resume-role')}
    </div>
    {(hasContact || editing) && <div className="resume-contact">
      {(profile.email.trim() || editing) && (editing ? <EditableText value={profile.email} onChange={(value) => onChange('email', value)} as="span" ariaLabel="邮箱" placeholder="邮箱" /> : <a href={`mailto:${profile.email}`}>{profile.email}</a>)}
      {(profile.phone.trim() || editing) && text(profile.phone, editing, (value) => onChange('phone', value), 'span', '电话', '电话')}
      {(profile.location.trim() || editing) && text(profile.location, editing, (value) => onChange('location', value), 'span', '所在地', '所在地')}
      {(profile.website.trim() || editing) && (editing ? <EditableText value={profile.website} onChange={(value) => onChange('website', value)} as="span" ariaLabel="个人网站" placeholder="个人网站" /> : websiteUrl ? <a href={websiteUrl} target="_blank" rel="noreferrer">{cleanUrl(profile.website)}</a> : <span>{cleanUrl(profile.website)}</span>)}
    </div>}
  </header>
}
