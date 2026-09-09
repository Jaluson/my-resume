import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Resume, ResumeSectionId } from '../../types/resume'
import { moveAt, sectionLabels } from './editorUtils'

type LayoutControlsProps = { resume: Resume; onChange: (resume: Resume) => void }

export default function LayoutControls({ resume, onChange }: LayoutControlsProps) {
  const updateLayout = (patch: Partial<Resume['layout']>) => onChange({ ...resume, layout: { ...resume.layout, ...patch } })
  const toggleSection = (section: ResumeSectionId, visible: boolean) => updateLayout({ hiddenSections: visible ? resume.layout.hiddenSections.filter((item) => item !== section) : [...resume.layout.hiddenSections, section] })
  const setSectionTitle = (section: ResumeSectionId, value: string) => updateLayout({ sectionTitles: { ...resume.layout.sectionTitles, [section]: value } })
  const setDensity = (density: Resume['layout']['density']) => { const previousDefault = resume.layout.density === 'compact' ? 14 : 24; const nextDefault = density === 'compact' ? 14 : 24; updateLayout({ density, sectionGap: resume.layout.sectionGap === previousDefault ? nextDefault : resume.layout.sectionGap }) }
  return <section className="layout-controls" aria-labelledby="layout-controls-title">
    <div className="layout-controls-heading"><div><p className="eyebrow">自由排版</p><h2 id="layout-controls-title">调整版式</h2></div><span className="hint-text">预览即时同步</span></div>
    <div className="layout-control-grid">
      <label className="field"><span>内容密度</span><select value={resume.layout.density} onChange={(event) => setDensity(event.target.value as Resume['layout']['density'])}><option value="comfortable">舒适留白</option><option value="compact">紧凑一页</option></select></label>
      <label className="field"><span>文字大小</span><input type="range" min="0.85" max="1.15" step="0.05" value={resume.layout.fontScale} onChange={(event) => updateLayout({ fontScale: Number(event.target.value) })} /></label>
      <label className="field"><span>文字对齐</span><select value={resume.layout.alignment} onChange={(event) => updateLayout({ alignment: event.target.value as Resume['layout']['alignment'] })}><option value="left">左对齐</option><option value="center">居中对齐</option></select></label>
      <label className="field"><span>区块间距</span><input type="range" min="8" max="36" step="1" value={resume.layout.sectionGap} onChange={(event) => updateLayout({ sectionGap: Number(event.target.value) })} /></label>
      <label className="field"><span>行高</span><input type="range" min="1.3" max="1.8" step="0.05" value={resume.layout.lineHeight} onChange={(event) => updateLayout({ lineHeight: Number(event.target.value) })} /></label>
      <label className="field color-field"><span>强调色</span><input type="color" value={resume.layout.accentColor || '#2563eb'} onChange={(event) => updateLayout({ accentColor: event.target.value })} /></label>
    </div>
    <div className="layout-section-settings"><span className="sub-label">区块内容</span>{resume.layout.sectionOrder.map((section) => { const visible = !resume.layout.hiddenSections.includes(section); return <div className="layout-section-row" key={section}><label className="layout-section-title"><input value={resume.layout.sectionTitles[section] ?? sectionLabels[section]} onChange={(event) => setSectionTitle(section, event.target.value)} aria-label={`${sectionLabels[section]}标题`} /><span>{sectionLabels[section]}</span></label><label className="layout-section-visible"><input type="checkbox" checked={visible} onChange={(event) => toggleSection(section, event.target.checked)} />显示</label></div> })}</div>
    <div className="layout-order"><span className="sub-label">区块顺序</span>{resume.layout.sectionOrder.map((section, index) => <div className="layout-order-row" key={section}><span>{index + 1}. {resume.layout.sectionTitles[section] || sectionLabels[section]}</span><span><button className="icon-button" type="button" disabled={index === 0} onClick={() => updateLayout({ sectionOrder: moveAt(resume.layout.sectionOrder, index, -1) })} aria-label={`上移${sectionLabels[section]}`}><ChevronUp size={14} /></button><button className="icon-button" type="button" disabled={index === resume.layout.sectionOrder.length - 1} onClick={() => updateLayout({ sectionOrder: moveAt(resume.layout.sectionOrder, index, 1) })} aria-label={`下移${sectionLabels[section]}`}><ChevronDown size={14} /></button></span></div>)}</div>
  </section>
}
