import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import { ArrowLeft, ArrowRight, Bird, Check, Flame, Sparkles, Upload } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { criteria } from './criteria'
import { CinematicHero, HomeFeatures } from './CinematicHero'
import './App.css'

const MAX_LENGTH = 3500
const categories = ['故事', '人物', '视觉呈现']
const routes = { home: '/', dimensions: '/dimensions', waiting: '/waiting', results: '/results', projects: '/projects' }
const sampleScript = `《凌晨两点的电话》

第1场｜天台｜夜
暴雨。林晚握着手机站在天台边缘，电话那头传来未婚夫顾沉的声音。
顾沉：别回头。
林晚僵住。身后传来脚步声。

第2场｜医院走廊｜三小时前
林晚拿着父亲的病危通知书冲向缴费窗口，却被告知账户余额已被清空。她收到顾沉发来的消息：今晚别来找我。

第3场｜顾家晚宴｜夜
林晚推开包厢门，看到顾沉正为另一个女孩戴上戒指。顾沉平静地说，林晚父亲的公司欠顾家一笔债，而她是唯一的抵押品。`

function scoreTone(score) {
  if (score >= 70) return 'good'
  if (score >= 50) return 'warning'
  return 'danger'
}

function App() {
  const [page, setPage] = useState('home')
  const [script, setScript] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const overLimit = script.length > MAX_LENGTH

  useEffect(() => {
    if (window.location.pathname !== '/') window.history.replaceState({ page: 'home' }, '', '/')
  }, [])

  useEffect(() => {
    const onPopState = (event) => {
      const next = event.state?.page || 'home'
      setPage(next === 'waiting' || (next === 'results' && !result) ? 'dimensions' : next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [result])

  const navigate = (next, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({ page: next }, '', routes[next])
    setPage(next)
    window.scrollTo(0, 0)
  }

  const openWorkspace = () => {
    if (page !== 'home') navigate('home')
    requestAnimationFrame(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const openFeatures = () => {
    if (page !== 'home') navigate('home')
    requestAnimationFrame(() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }))
  }

  const loadSample = () => {
    setScript(sampleScript)
    setFileName('')
    setResult(null)
    setError('')
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      let content
      if (extension === 'docx') content = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
      else if (extension === 'txt' || extension === 'md') content = await file.text()
      else throw new Error('仅支持 .txt、.md 和 .docx 文件')
      setScript(content.trim())
      setFileName(file.name)
      setResult(null)
      setError('')
    } catch (fileError) {
      setError(fileError.message || '文件读取失败，请重新选择')
    } finally {
      event.target.value = ''
    }
  }

  const goToDimensions = () => {
    if (!script.trim()) return setError('请先粘贴或导入剧本。')
    if (overLimit) return setError('超过 3,500 字限制，请删减后再评估。')
    setError('')
    navigate('dimensions')
  }

  const toggleCriterion = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setError('')
  }

  const evaluate = async () => {
    if (!selectedIds.length || isEvaluating) return
    setIsEvaluating(true)
    setError('')
    setResult(null)
    navigate('waiting')
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, criteria: selectedIds }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '评估失败，请稍后重试')
      setResult(payload)
      navigate('results', true)
    } catch (evaluationError) {
      setError(evaluationError.message || '评估失败，请稍后重试')
      navigate('dimensions', true)
    } finally {
      setIsEvaluating(false)
    }
  }

  return <main className={page === 'home' ? 'is-home' : 'inner-page'}>
    <header className="topbar">
      <button className="brand" type="button" onClick={() => navigate('home')} aria-label="燃剧 AI 首页"><span className="brand-mark"><Flame size={31} fill="currentColor" /></span><span>燃剧<span className="brand-ai">AI</span></span></button>
      <nav className="main-nav" aria-label="主导航"><button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}>首页</button><button className={['dimensions', 'waiting', 'results'].includes(page) ? 'active' : ''} onClick={openWorkspace}>剧本评估</button><button onClick={openFeatures}>爆款灵感</button><button className={page === 'projects' ? 'active' : ''} onClick={() => navigate('projects')}>我的项目</button></nav>
      <button className="nav-cta" onClick={openWorkspace}>开始评估 <ArrowRight size={17} /></button>
    </header>

    {page === 'home' && <>
      <CinematicHero onStart={openWorkspace} />
      <HomeFeatures onStart={openWorkspace} />
      <section className="workspace" id="workspace">
        <div className="section-heading"><div><p className="section-index">01 / 输入剧本</p><h2>粘贴文本，或导入剧本文件</h2></div><button type="button" className="text-button" onClick={loadSample}><Sparkles size={16} />填入示例</button></div>
        <div className={`script-editor ${overLimit ? 'is-over-limit' : ''}`}>
          <textarea value={script} onChange={(event) => { setScript(event.target.value); setFileName(''); setResult(null); setError('') }} placeholder="从剧本正文开始粘贴，例如：场景、人物、动作和台词..." aria-label="剧本正文" />
          <div className="editor-footer"><div className="file-action"><input ref={fileInputRef} id="script-file" type="file" accept=".txt,.md,.docx" onChange={handleFile} hidden /><button type="button" className="file-button" onClick={() => fileInputRef.current?.click()}><Upload size={16} />导入文件</button><span>{fileName || '支持 .txt、.md、.docx'}</span></div><span className="counter">{script.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()} 字</span></div>
        </div>
        {error && <p className="input-error" role="alert">{error}</p>}
        {overLimit && !error && <p className="input-error">超过 3,500 字限制，请删减后再评估。</p>}
      </section>
      <section className="action-panel"><div><p className="section-index">NEXT STEP</p><h2>选好关注点，再开始诊断。</h2></div><button className="evaluate-button" type="button" onClick={goToDimensions}>开始评估<ArrowRight size={18} /></button></section>
    </>}

    {page === 'projects' && <section className="projects-page page-intro"><p className="section-index">MY PROJECT</p><h1>我的项目</h1><p className="intro-copy">本次会话中的剧本与评估结果。刷新页面后将清空，请及时复制保存。</p><article className="project-card"><span className="section-index">{script.trim() ? '当前剧本' : '开始你的第一个故事'}</span><h2>{script.trim() ? script.trim().split('\n')[0].slice(0, 40) : '每一个爆款，都从一个故事开始。'}</h2><p className="intro-copy">{script.trim() ? `${script.length.toLocaleString()} 字 · ${result ? '评估已完成' : '待评估'}` : '导入或粘贴剧本，选择你关心的评估维度。'}</p><div className="hero-actions"><button className="primary-cta" onClick={openWorkspace}>{script.trim() ? '继续编辑' : '上传剧本'}<ArrowRight size={17} /></button>{result && <button className="outline-cta" onClick={() => navigate('results')}>查看报告</button>}</div></article></section>}

    {page === 'dimensions' && <>
      <section className="page-intro"><button className="back-button" type="button" onClick={() => navigate('home')}><ArrowLeft size={16} />返回剧本输入</button><p className="section-index">02 / 评估维度</p><h1>选择本次评估的关注点</h1><p className="intro-copy">从以下维度中至少选择一项。评估将使用对应的专业标准分析你的剧本。</p></section>
      {error && <p className="input-error dimension-error" role="alert">{error}</p>}
      <section className="criteria-section">{categories.map((category) => <div className="criterion-group" key={category}><div className="group-heading"><h2>{category}</h2><span>{criteria.filter((item) => item.category === category).length} 项维度</span></div><div className="criteria-grid">{criteria.filter((item) => item.category === category).map((criterion) => <label className={`criterion-card ${selectedIds.includes(criterion.id) ? 'selected' : ''}`} key={criterion.id}><div className="criterion-topline"><span className="criterion-number">{String(criterion.id).padStart(2, '0')}</span><input type="checkbox" checked={selectedIds.includes(criterion.id)} onChange={() => toggleCriterion(criterion.id)} aria-label={`选择${criterion.name}`} /></div><h3>{criterion.name}</h3><p>{criterion.description}</p></label>)}</div></div>)}</section>
      <section className="action-panel sticky-action"><div><p className="section-index">SELECTED DIMENSIONS</p><h2>已选择 {selectedIds.length} 项评估维度</h2><small>至少选择 1 项后即可开始</small></div><button className="evaluate-button" type="button" disabled={selectedIds.length === 0} onClick={evaluate}>开始评估<ArrowRight size={18} /></button></section>
    </>}

    {page === 'waiting' && <section className="waiting-screen" role="status" aria-live="polite"><p className="section-index">03 / 剧本评估中</p><h1 className="waiting-title"><Bird size={48} strokeWidth={1.8} aria-hidden="true" />正在火速工作中……</h1><p>正在按所选的 {selectedIds.length} 项维度审读剧本，结果完成后会自动呈现。</p><div className="waiting-progress"><span /></div></section>}

    {page === 'results' && result && <section className="results" id="assessment-results">
      <div className="result-header"><div><p className="section-index">04 / 评估结果</p><h2>剧本诊断报告</h2></div><span className="mock-label">DeepSeek 生成</span></div>
      <div className="score-overview"><div className="overall-score"><span>综合评分</span><strong>{result.overall}</strong><small>/ 100</small><p>基于本次选择的 {result.scores.length} 项维度计算。</p></div><div className="radar-wrap">{result.scores.length >= 3 ? <ResponsiveContainer width="100%" height={300}><RadarChart data={result.scores} outerRadius="72%"><PolarGrid stroke="#48392b" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#b8a695', fontSize: 12 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey="value" stroke="#d6b37a" fill="#b82e28" fillOpacity={0.3} strokeWidth={2} /></RadarChart></ResponsiveContainer> : <div className="compact-score"><span>本次评估</span><strong>{result.scores.length}</strong><span>项维度</span></div>}</div><div className="score-list">{result.scores.map((score) => <div className="score-row" key={score.subject}><span>{score.subject}</span><b className={scoreTone(score.value)}>{score.value}</b></div>)}</div></div>
      <div className="feedback-block"><div className="feedback-heading"><h3>修改建议</h3><span>按优先级排列</span></div><div className="feedback-list">{result.feedback.map((item) => <article className="feedback-item" key={item.name}><div className="feedback-score"><span>{item.name}</span><b className={scoreTone(item.score)}>{item.score}</b></div><p>{item.problem}</p><ul>{item.suggestions.map((suggestion) => <li key={suggestion}><Check size={15} />{suggestion}</li>)}</ul></article>)}</div></div>
      <div className="revision-block"><div className="feedback-heading"><h3>优化版剧本</h3><span>基于所选评估维度生成</span></div><div className="script-compare"><article><div className="compare-label">原始版本</div><pre>{script}</pre></article><article className="revised"><div className="compare-label">优化建议版</div><pre>{result.revised}</pre></article></div></div>
      <div className="result-actions"><button type="button" className="back-button" onClick={() => navigate('dimensions')}><ArrowLeft size={16} />重新选择维度</button><button type="button" className="text-button" onClick={() => navigate('home')}>返回首页</button></div>
    </section>}
    <footer><Flame size={14} />燃剧 AI · 让好故事，燃成爆款。<span>DeepSeek AI 驱动</span></footer>
  </main>
}

export default App
