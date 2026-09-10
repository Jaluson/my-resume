import { useEffect, useRef, useState } from 'react'
import { FileDown } from 'lucide-react'
import type { CSSProperties } from 'react'

type LoadingIndicatorProps = {
  label?: string
  detail?: string
  fullScreen?: boolean
}

const loadingStages = [
  { label: '整理内容', detail: '把你的经历收拢成清晰脉络' },
  { label: '校准版式', detail: '让每一段信息都落在合适的位置' },
  { label: '生成文件', detail: '最后检查，即将交到你手上' },
]

export default function LoadingIndicator({ label = '正在处理', detail, fullScreen = false }: LoadingIndicatorProps) {
  const [stageIndex, setStageIndex] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fullScreen) {
      setStageIndex(0)
      return
    }
    overlayRef.current?.focus()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setStageIndex((current) => Math.min(current + 1, loadingStages.length - 1)), 1500)
    return () => window.clearInterval(timer)
  }, [fullScreen])

  const stage = loadingStages[stageIndex]
  const visual = <span className="loading-symbol" aria-hidden="true">
    <span className="loading-orbit loading-orbit-one" />
    <span className="loading-orbit loading-orbit-two" />
    <span className="loading-symbol-glow" />
    <span className="loading-sheet loading-sheet-back"><i /><i /><i /></span>
    <span className="loading-sheet loading-sheet-front"><i /><i /><i /><FileDown className="loading-sheet-icon" strokeWidth={2.2} /></span>
    <span className="loading-beam" />
    <span className="loading-spark loading-spark-one" />
    <span className="loading-spark loading-spark-two" />
    <span className="loading-spark loading-spark-three" />
  </span>
  const copy = <span className="loading-copy">
    <strong>{label}</strong>
    {detail && <small>{detail}</small>}
  </span>

  if (!fullScreen) return <span className="loading-indicator loading-indicator-inline" role="status" aria-label={label}>{visual}{copy}</span>

  const progressStyle = { '--loading-progress': `${((stageIndex + 1) / loadingStages.length) * 100}%` } as CSSProperties
  return <div ref={overlayRef} className="loading-overlay" role="dialog" aria-modal="true" aria-live="polite" aria-busy="true" aria-label={`${label}，${stage.label}`} tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Tab') event.preventDefault() }}>
    <div className="loading-card">
      <div className="loading-card-topline"><span className="loading-kicker">简历工坊 · 正在准备</span><span className="loading-stage-count">{String(stageIndex + 1).padStart(2, '0')} / {String(loadingStages.length).padStart(2, '0')}</span><span className="loading-live"><i />进行中</span></div>
      <div className="loading-card-visual">{visual}</div>
      {copy}
      <div className="loading-steps" aria-hidden="true">
        {loadingStages.map((item, index) => <span className={`loading-step ${index < stageIndex ? 'is-complete' : ''} ${index === stageIndex ? 'is-current' : ''}`} key={item.label}><i />{item.label}</span>)}
      </div>
      <span className="loading-progress" aria-hidden="true" style={progressStyle}><span /></span>
      <span className="loading-stage-copy" aria-hidden="true">{stage.detail}</span>
    </div>
  </div>
}
