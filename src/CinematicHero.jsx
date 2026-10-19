import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Flame, Pause, Play, RotateCcw, Volume2, VolumeX, Zap, Users, ChartNoAxesCombined } from 'lucide-react'

const POSTER = '/media/hero-poster.jpg'
const formatTime = (seconds) => `00:${String(Math.floor(seconds || 0)).padStart(2, '0')}`

export function CinematicHero({ onStart }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)
  const [muted, setMuted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const video = videoRef.current
    video.play().catch(() => setPlaying(false))
    return () => video.pause()
  }, [])
  const playFilm = async (restart = false) => {
    const video = videoRef.current
    if (!video || failed) return
    if (restart || video.ended) { video.currentTime = 0; setCurrent(0); setFinished(false) }
    try { await video.play() } catch { setPlaying(false) }
  }
  return <section className="cinematic-hero" aria-label="燃剧 AI 概念预告">
    <div className={`hero-film ${finished || failed ? 'is-finished' : ''}`}>
      <img className="hero-still" src={POSTER} alt="红衣侠客持剑立于月夜，金色斗笠与衣饰映出冷光" />
      <video ref={videoRef} className="hero-video" src="/media/hero-film.mp4" poster={POSTER}
        autoPlay muted={muted} playsInline preload="auto" aria-label="武侠概念预告视频"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setFinished(true); setPlaying(false) }}
        onError={() => { setFailed(true); setPlaying(false) }} />
    </div>
    <div className="hero-shade" />
    <div className="hero-content">
      <p className="hero-eyebrow"><span />AI 短剧 · 剧本评估引擎</p>
      <h1>让好故事，<br /><span>燃成爆款。</span></h1>
      <p className="hero-subtitle">15 秒，看见故事的爆发力。</p>
      <div className="hero-actions">
        <button className="primary-cta" onClick={onStart}>上传剧本，立即评估 <ArrowRight size={20} /></button>
        <button className="outline-cta" disabled={failed} onClick={() => playFilm(true)}><Play size={16} fill="currentColor" />{finished ? '重播概念预告' : '播放概念预告'}</button>
      </div>
      <div className="hero-caption"><Flame size={13} /><span>故事的下一次爆发，从这里开始</span></div>
    </div>
    <div className="film-controls">
      <div className="film-track" role="progressbar" aria-label="预告播放进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(duration ? current / duration * 100 : 0)}><span style={{ width: `${duration ? current / duration * 100 : 0}%` }} /></div>
      <div className="film-controls-row">
        <button disabled={failed} aria-label={finished ? '重播视频' : playing ? '暂停视频' : '播放视频'} onClick={() => playing ? videoRef.current.pause() : playFilm(finished)}>{finished ? <RotateCcw size={15} /> : playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <span className="film-time">{formatTime(current)} / {formatTime(duration)}</span>
        <span className="film-label">{failed ? '预告暂不可用 · 展示尾帧' : finished ? '预告已结束 · 尾帧定格' : '概念预告'}</span>
        <button disabled={failed} aria-label={muted ? '开启视频声音' : '关闭视频声音'} aria-pressed={!muted} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
      </div>
    </div>
    <button className="scroll-cue" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} aria-label="了解评估功能"><span>SCROLL</span><i /><ArrowDown size={13} /></button>
  </section>
}

export function HomeFeatures({ onStart }) {
  return <section className="home-features" id="features">
    <div className="feature-heading"><p className="section-index">THE STORY BEHIND A HIT</p><h2>从灵感到爆款，每一步<span>都有依据</span></h2></div>
    <div className="feature-grid">
      <button className="feature-card feature-hooks" onClick={onStart}>
        <img src="/media/hero-poster.jpg" alt="" /><div className="feature-wash" />
        <span className="feature-no">01</span><span className="feature-icon"><Zap size={22} /></span>
        <h3>爽点与钩子</h3><p>让第一场戏，就抓住观众。</p>
        <div className="hook-visual"><span className="hook-line" /><b>开场钩子</b><span /><span /><span /></div>
        <span className="feature-link">发现故事爆点 <ArrowRight size={15} /></span>
      </button>
      <button className="feature-card feature-conflict" onClick={onStart}>
        <img src="/media/film-middle.jpg" alt="" /><div className="feature-wash" />
        <span className="feature-no">02</span><span className="feature-icon"><Users size={22} /></span>
        <h3>角色与冲突</h3><p>让每一次交锋，都推动故事。</p>
        <div className="conflict-visual"><span>人物动机</span><i /><b>核心冲突</b><i /><span>关系张力</span></div>
        <span className="feature-link">拆解人物关系 <ArrowRight size={15} /></span>
      </button>
      <button className="feature-card feature-rhythm" onClick={onStart}>
        <img src="/media/film-start.jpg" alt="" /><div className="feature-wash" />
        <span className="feature-no">03</span><span className="feature-icon"><ChartNoAxesCombined size={22} /></span>
        <h3>节奏与反转</h3><p>让情绪递进，让悬念留到最后。</p>
        <div className="rhythm-visual"><svg viewBox="0 0 320 72" aria-hidden="true"><defs><linearGradient id="rhythm-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a468" stopOpacity=".28" /><stop offset="100%" stopColor="#c9a468" stopOpacity="0" /></linearGradient></defs><path d="M0 66 Q30 64 55 48 T100 52 T165 31 T210 35 T270 10 L320 22 L320 72 L0 72Z" fill="url(#rhythm-fill)" /><path d="M0 66 Q30 64 55 48 T100 52 T165 31 T210 35 T270 10 L320 22" fill="none" stroke="#c9a468" strokeWidth="2" /><circle cx="270" cy="10" r="4" fill="#e8463c" /></svg><b>高潮爆发</b></div>
        <span className="feature-link">找到关键反转 <ArrowRight size={15} /></span>
      </button>
    </div>
    <p className="feature-note">以上为评估方向示意，具体诊断以所选维度与实际剧本为准。</p>
  </section>
}
