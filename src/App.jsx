import { useRef, useState } from 'react'
import mammoth from 'mammoth'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  LoaderCircle,
  PenLine,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import './App.css'

const MAX_LENGTH = 3500

const sampleScript = `《凌晨两点的电话》

第1场｜天台｜夜
暴雨。林晚握着手机站在天台边缘，电话那头传来未婚夫顾沉的声音。
顾沉：别回头。
林晚僵住。身后传来脚步声。

第2场｜医院走廊｜三小时前
林晚拿着父亲的病危通知书冲向缴费窗口，却被告知账户余额已被清空。她收到顾沉发来的消息：今晚别来找我。

第3场｜顾家晚宴｜夜
林晚推开包厢门，看到顾沉正为另一个女孩戴上戒指。顾沉平静地说，林晚父亲的公司欠顾家一笔债，而她是唯一的抵押品。`

const defaultCriteria = [
  { name: '钩子强度', text: '开篇是否设置足够的悬念或冲突，前3场能否在30秒内抓住观众。' },
  { name: '节奏控制', text: '情节推进速度是否合理，有无冗余废场景，每集信息密度是否达短剧标准。' },
  { name: '人物弧光', text: '主角是否经历可信的成长或转变，行为动机是否清晰一致。' },
  { name: '情感张力', text: '情绪爆发节点是否精准，能否引发观众共鸣。' },
  { name: '反转设计', text: '转折是否出人意料且合理，信息差或身份差是否有效利用。' },
  { name: '短剧适配度', text: '是否符合竖屏短剧分集逻辑与单集时长节奏，场景数量是否匹配平台调性。' },
]

function scoreTone(score) {
  if (score >= 70) return 'good'
  if (score >= 50) return 'warning'
  return 'danger'
}

function App() {
  const [script, setScript] = useState('')
  const [criteria, setCriteria] = useState(defaultCriteria)
  const [editing, setEditing] = useState(null)
  const [draftCriterion, setDraftCriterion] = useState('')
  const [result, setResult] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const characterCount = script.length
  const overLimit = characterCount > MAX_LENGTH

  const openEditor = (criterion) => {
    setEditing(criterion.name)
    setDraftCriterion(criterion.text)
  }

  const saveCriterion = () => {
    setCriteria((items) =>
      items.map((item) => (item.name === editing ? { ...item, text: draftCriterion.trim() || item.text } : item)),
    )
    setEditing(null)
  }

  const resetCriterion = () => {
    const original = defaultCriteria.find((item) => item.name === editing)
    setDraftCriterion(original?.text ?? '')
  }

  const loadSample = () => {
    setScript(sampleScript)
    setFileName('')
    setError('')
    setResult(null)
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    try {
      let content = ''
      if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer()
        const extracted = await mammoth.extractRawText({ arrayBuffer })
        content = extracted.value
      } else if (extension === 'txt' || extension === 'md') {
        content = await file.text()
      } else {
        throw new Error('仅支持 .txt、.md 和 .docx 文件')
      }
      setScript(content.trim())
      setFileName(file.name)
      setError('')
      setResult(null)
    } catch (fileError) {
      setError(fileError.message || '文件读取失败，请重新选择')
    } finally {
      event.target.value = ''
    }
  }

  const evaluate = async () => {
    if (!script.trim() || overLimit) return
    setIsEvaluating(true)
    setError('')
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, criteria }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '评估失败，请稍后重试')
      setResult(payload)
      window.setTimeout(() => document.querySelector('#assessment-results')?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (evaluationError) {
      setError(evaluationError.message || '评估失败，请稍后重试')
    } finally {
      setIsEvaluating(false)
    }
  }

  const isCustomized = (criterion) => defaultCriteria.find((item) => item.name === criterion.name)?.text !== criterion.text

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="剧本评估室">
          <span className="brand-mark"><ClipboardCheck size={19} /></span>
          <span>剧本评估室</span>
        </a>
        <div className="header-status"><span className="status-dot" />DeepSeek 已接入</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">AI SCRIPT REVIEW</p>
          <h1>让每一场戏，都有更明确的下一步。</h1>
          <p className="intro-copy">从钩子、节奏到人物弧光，获得可执行的剧本诊断与优化版本。</p>
        </div>
        <div className="intro-stat">
          <span>评估维度</span>
          <strong>06</strong>
          <small>编导视角专业标准</small>
        </div>
      </section>

      <section className="workspace" id="workspace">
        <div className="section-heading">
          <div>
            <p className="section-index">01 / 输入剧本</p>
            <h2>粘贴文本，或导入剧本文件</h2>
          </div>
          <button type="button" className="text-button" onClick={loadSample}><Sparkles size={16} />填入示例</button>
        </div>

        <div className={`script-editor ${overLimit ? 'is-over-limit' : ''}`}>
          <textarea
            value={script}
            onChange={(event) => { setScript(event.target.value); setError(''); setResult(null) }}
            placeholder="从剧本正文开始粘贴，例如：场景、人物、动作和台词..."
            aria-label="剧本正文"
          />
          <div className="editor-footer">
            <div className="file-action">
              <input ref={fileInputRef} id="script-file" type="file" accept=".txt,.md,.docx" onChange={handleFile} hidden />
              <button type="button" className="file-button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />导入文件
              </button>
              <span>{fileName || '支持 .txt、.md、.docx'}</span>
            </div>
            <span className="counter">{characterCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()} 字</span>
          </div>
        </div>
        {error && <p className="input-error">{error}</p>}
        {overLimit && <p className="input-error">超过 3,500 字限制，请删减后再评估。</p>}
      </section>

      <section className="criteria-section">
        <div className="section-heading">
          <div>
            <p className="section-index">02 / 评估标准</p>
            <h2>选择本次评估关注的维度</h2>
          </div>
          <span className="session-note">本次会话生效</span>
        </div>
        <div className="criteria-grid">
          {criteria.map((criterion, index) => (
            <article className="criterion-card" key={criterion.name}>
              <div className="criterion-topline">
                <span className="criterion-number">{String(index + 1).padStart(2, '0')}</span>
                {isCustomized(criterion) && <span className="custom-badge">已自定义</span>}
              </div>
              <h3>{criterion.name}</h3>
              <p>{criterion.text}</p>
              <button type="button" className="edit-button" onClick={() => openEditor(criterion)}>
                <PenLine size={15} />编辑标准
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="action-panel">
        <div>
          <p className="section-index">READY TO REVIEW</p>
          <h2>准备好让剧本接受一次专业审读了吗？</h2>
        </div>
        <button className="evaluate-button" type="button" disabled={!script.trim() || overLimit || isEvaluating} onClick={evaluate}>
          {isEvaluating ? <><LoaderCircle className="spin" size={18} />正在分析</> : <>开始评估<ArrowRight size={18} /></>}
        </button>
      </section>

      {result && (
        <section className="results" id="assessment-results">
          <div className="result-header">
            <div>
              <p className="section-index">03 / 评估结果</p>
              <h2>剧本诊断报告</h2>
            </div>
            <span className="mock-label">DeepSeek 生成</span>
          </div>

          <div className="score-overview">
            <div className="overall-score">
              <span>综合评分</span>
              <strong>{result.overall}</strong>
              <small>/ 100</small>
              <p>基础扎实，建议优先补强反转铺垫。</p>
            </div>
            <div className="radar-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={result.scores} outerRadius="72%">
                  <PolarGrid stroke="#d9d7ce" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#60635e', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#2d725b" fill="#3c9d79" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="score-list">
              {result.scores.map((score) => (
                <div className="score-row" key={score.subject}>
                  <span>{score.subject}</span>
                  <b className={scoreTone(score.value)}>{score.value}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="feedback-block">
            <div className="feedback-heading">
              <h3>修改建议</h3>
              <span>按优先级排列</span>
            </div>
            <div className="feedback-list">
              {result.feedback.map((item) => (
                <article className="feedback-item" key={item.name}>
                  <div className="feedback-score"><span>{item.name}</span><b className={scoreTone(item.score)}>{item.score}</b></div>
                  <p>{item.problem}</p>
                  <ul>{item.suggestions.map((suggestion) => <li key={suggestion}><Check size={15} />{suggestion}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>

          <div className="revision-block">
            <div className="feedback-heading">
              <h3>优化版剧本</h3>
              <span>基于当前评估标准生成</span>
            </div>
            <div className="script-compare">
              <article><div className="compare-label">原始版本</div><pre>{script}</pre></article>
              <article className="revised"><div className="compare-label">优化建议版</div><pre>{result.revised}</pre></article>
            </div>
          </div>
        </section>
      )}

      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><p className="section-index">编辑评估标准</p><h2 id="editor-title">{editing}</h2></div>
              <button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="关闭"><X size={20} /></button>
            </div>
            <textarea value={draftCriterion} onChange={(event) => setDraftCriterion(event.target.value)} />
            <div className="modal-actions">
              <button type="button" className="reset-button" onClick={resetCriterion}><RotateCcw size={15} />恢复默认</button>
              <div><button type="button" className="cancel-button" onClick={() => setEditing(null)}>取消</button><button type="button" className="save-button" onClick={saveCriterion}>保存标准</button></div>
            </div>
          </section>
        </div>
      )}

      <footer>剧本评估室 · DeepSeek AI 驱动 <ChevronDown size={14} /></footer>
    </main>
  )
}

export default App
