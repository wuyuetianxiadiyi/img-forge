import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Upload, Download, CheckCircle2,
  FileImage, RotateCcw, Zap, ShieldCheck, Layers
} from 'lucide-react'

import { useUpdateCheck } from './useUpdateCheck'
import Cat from './Cat'

const APP_VERSION = '2.0.0'

const FORMATS = [
  { id: 'PNG', label: 'PNG', desc: '无损', mime: 'image/png' },
  { id: 'JPG', label: 'JPG', desc: '通用', mime: 'image/jpeg' },
  { id: 'WebP', label: 'WebP', desc: '现代', mime: 'image/webp' },
  { id: 'BMP', label: 'BMP', desc: '原始', mime: 'image/bmp' },
]

const MIME_MAP = { PNG: 'image/png', JPG: 'image/jpeg', WebP: 'image/webp', BMP: 'image/bmp' }
const EXT_MAP = { PNG: 'png', JPG: 'jpg', WebP: 'webp', BMP: 'bmp' }

// 移动端检测
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window)

// 浏览器端图片转换（不需要 Python 后端）
function convertImage(file, format, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('转换失败：浏览器不支持该格式'))
        const url = URL.createObjectURL(blob)
        resolve({ url, blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + EXT_MAP[format] })
      }, MIME_MAP[format], quality / 100)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

const StaggerDiv = ({ children, delay, className }) => (
  <div className={className} style={{
    animation: `fade-up 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s both`
  }}>{children}</div>
)

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [format, setFormat] = useState('PNG')
  const [quality, setQuality] = useState([92])
  const [loading, setLoading] = useState(false)
  const [progressVal, setProgressVal] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const { update, checking, error: updateErr, check: checkUpdate } = useUpdateCheck(APP_VERSION)

  const fileRef = useRef(null)
  const cursorDot = useRef(null)
  const cursorRing = useRef(null)
  const tiltRef = useRef(null)
  const tiltInner = useRef(null)
  const orb1 = useRef(null)
  const orb2 = useRef(null)

  // 自定义光标 + 平滑动画（桌面鼠标 / 移动端触摸跟随）
  useEffect(() => {
    const dot = cursorDot.current
    const ring = cursorRing.current
    if (!dot || !ring) return
    let mx = 0, my = 0, rx = 0, ry = 0, running = true

    if (isMobile) {
      // 移动端：默认隐藏，触摸时显示跟随
      ring.style.opacity = '0'
      ring.style.transition = 'opacity .35s ease, width .3s, height .3s, border-color .3s'
      dot.style.display = 'none'

      const onStart = (e) => {
        const t = e.touches[0]; mx = t.clientX; my = t.clientY
        rx = mx; ry = my
        ring.style.opacity = '1'
        ring.style.left = rx + 'px'
        ring.style.top = ry + 'px'
      }
      const onMove = (e) => {
        const t = e.touches[0]; mx = t.clientX; my = t.clientY
      }
      const onEnd = () => { ring.style.opacity = '0' }

      document.addEventListener('touchstart', onStart, { passive: true })
      document.addEventListener('touchmove', onMove, { passive: true })
      document.addEventListener('touchend', onEnd, { passive: true })
    } else {
      // 桌面端：鼠标跟随
      const onMove = (e) => { mx = e.clientX; my = e.clientY }
      document.addEventListener('mousemove', onMove)

      const els = document.querySelectorAll('a, button, input, .format-chip, .drop-zone')
      const addH = () => ring.classList.add('hover')
      const rmH = () => ring.classList.remove('hover')
      els.forEach(el => { el.addEventListener('mouseenter', addH); el.addEventListener('mouseleave', rmH) })
    }

    const smooth = () => {
      if (!running) return
      const ease = isMobile ? 0.18 : 0.12
      rx += (mx - rx) * ease; ry += (my - ry) * ease
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px'
      if (!isMobile) { dot.style.left = mx + 'px'; dot.style.top = my + 'px' }
      requestAnimationFrame(smooth)
    }
    smooth()

    return () => { running = false }
  }, [])

  // 3D 倾斜 + 光晕跟随（桌面鼠标 + 移动端触摸）
  useEffect(() => {
    const card = tiltRef.current
    const inner = tiltInner.current
    const o1 = orb1.current, o2 = orb2.current
    if (!card || !inner) return

    const getXY = (e) => {
      if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
      return { x: e.clientX, y: e.clientY }
    }

    const onMove = (e) => {
      const { x, y } = getXY(e)
      const rect = card.getBoundingClientRect()
      const cx = (x - rect.left) / rect.width - 0.5
      const cy = (y - rect.top) / rect.height - 0.5
      inner.style.transform = `rotateX(${cy * -6}deg) rotateY(${cx * 6}deg)`

      const wx = x / window.innerWidth, wy = y / window.innerHeight
      if (o1) o1.style.transform = `translate(${wx * 40}px, ${wy * 40}px)`
      if (o2) o2.style.transform = `translate(${wx * -30}px, ${wy * -30}px)`
    }
    const onLeave = () => { inner.style.transform = 'rotateX(0) rotateY(0)' }

    card.addEventListener('mousemove', onMove)
    card.addEventListener('mouseleave', onLeave)
    // 移动端触摸倾斜
    if (isMobile) {
      card.addEventListener('touchmove', onMove, { passive: true })
      card.addEventListener('touchend', onLeave)
    }
    return () => {
      card.removeEventListener('mousemove', onMove)
      card.removeEventListener('mouseleave', onLeave)
      card.removeEventListener('touchmove', onMove)
      card.removeEventListener('touchend', onLeave)
    }
  }, [])

  const handleFile = useCallback((f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const formatSize = (bytes) =>
    bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(1) + ' KB'
      : (bytes / 1024 / 1024).toFixed(2) + ' MB'

  const convert = async () => {
    if (!file) return
    setLoading(true); setProgressVal(0); setError(null); setResult(null)

    const timer = setInterval(() => {
      setProgressVal((p) => Math.min(p + Math.random() * 15, 85))
    }, 300)

    try {
      const data = await convertImage(file, format, quality[0])

      clearInterval(timer)
      setProgressVal(100)
      setTimeout(() => { setResult(data); setLoading(false) }, 400)
    } catch (e) {
      clearInterval(timer)
      setError(e.message)
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null)
    setProgressVal(0); setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="dark relative min-h-screen bg-[#020617] text-foreground overflow-hidden font-sans selection:bg-cyber-500/30">

      {/* 自定义光标（桌面+移动端触摸跟随） */}
      <div ref={cursorDot} className="fixed w-2 h-2 bg-cyber-400 rounded-full pointer-events-none z-[99999] mix-blend-difference"
        style={{ transform: 'translate(-50%,-50%)', transition: 'width .15s,height .15s' }} />
      <div ref={cursorRing} className="fixed w-9 h-9 rounded-full pointer-events-none z-[99998]"
        style={{
          border: '1.5px solid rgba(129,140,248,.5)',
          transform: 'translate(-50%,-50%)',
          transition: 'width .3s,height .3s,border-color .3s'
        }} />

      {/* 噪声纹理 */}
      <div className="fixed inset-0 z-[9999] pointer-events-none opacity-[.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px'
        }} />

      {/* 网格 */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent 80%)',
        }}
      />

      {/* 浮动光晕 */}
      <div ref={orb1} className="fixed -top-48 -left-48 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none z-0 transition-transform duration-300 ease-out" />
      <div ref={orb2} className="fixed -bottom-32 -right-32 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[100px] pointer-events-none z-0 transition-transform duration-300 ease-out" />
      <div className="fixed top-1/3 left-1/2 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* ===== 导航（含窗口控制） ===== */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[.03]"
        style={{ background: 'rgba(2,6,23,.75)', backdropFilter: 'blur(24px)', WebkitAppRegion: 'drag' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <StaggerDiv delay={0.05} className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-500 to-purple-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-cyber-500/20">IF</div>
            <span className="font-semibold text-sm tracking-tight">ImageForge</span>
            <span className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[.04] text-white/30 tracking-widest">v2.0</span>
          </StaggerDiv>
          <StaggerDiv delay={0.1} className="flex items-center gap-4 text-xs text-white/25">
            <span className="hidden sm:flex items-center gap-1.5"><Zap className="w-3 h-3" /> Local</span>
            <span className="hidden sm:flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Private</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
              Ready
            </span>
            {/* 更新检查 */}
            {update && (
              <button onClick={() => {
                const a = document.createElement('a')
                a.href = update.apkUrl
                a.target = '_blank'
                a.click()
              }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                <Download className="w-3 h-3" /> v{update.version}
              </button>
            )}
            {checking && (
              <span className="text-[10px] text-white/20">检查中...</span>
            )}
            {/* 窗口控制按钮（仅桌面） */}
            {!isMobile && <span className="flex items-center gap-1 ml-2" style={{ WebkitAppRegion: 'no-drag' }}>
              <button onClick={() => window.electronAPI?.minimize()}
                className="w-7 h-7 rounded-md hover:bg-white/[.08] flex items-center justify-center transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              <button onClick={() => window.electronAPI?.maximize()}
                className="w-7 h-7 rounded-md hover:bg-white/[.08] flex items-center justify-center transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8M4 8h16" /></svg>
              </button>
              <button onClick={() => window.electronAPI?.close()}
                className="w-7 h-7 rounded-md hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>}
          </StaggerDiv>
        </div>
      </header>

      {/* ===== 主内容 ===== */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* 标题 */}
        <div className="text-center mb-10 space-y-4">
          <StaggerDiv delay={0.15}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[.03] border border-white/[.06] text-[11px] text-white/30 tracking-wide">
              <Layers className="w-3 h-3" /> Image Conversion Engine
            </div>
          </StaggerDiv>
          <StaggerDiv delay={0.2}>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-b from-white via-indigo-100 to-indigo-300/30 bg-clip-text text-transparent">图片格式转换</span>
            </h1>
          </StaggerDiv>
          <StaggerDiv delay={0.25}>
            <p className="text-white/20 text-sm md:text-base max-w-md mx-auto font-light">拖入图片 · 一秒转换 · 8 种格式</p>
          </StaggerDiv>
        </div>

        {/* ===== 主卡片（带动画边框 + 3D倾斜） ===== */}
        <StaggerDiv delay={0.3} ref={tiltRef} className="relative tilt-card" style={{ perspective: '1000px' }}>
          <div ref={tiltInner} className="tilt-inner relative rounded-2xl" style={{ transformStyle: 'preserve-3d', transition: 'transform .15s ease-out' }}>
            {/* 动画边框 */}
            <div className="absolute -inset-[1px] rounded-2xl pointer-events-none overflow-hidden">
              <div className="absolute inset-0 rounded-2xl animate-border-spin"
                style={{
                  background: 'conic-gradient(from var(--angle,0deg), transparent 40%, rgba(129,140,248,.6), rgba(139,92,246,.6), transparent 60%)',
                  padding: 1,
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude'
                }} />
            </div>

            <Card className="relative border-white/[.06] bg-black/40 backdrop-blur-2xl shadow-2xl shadow-cyber-500/5 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(10,10,20,.7)' }}>
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyber-500/40 to-transparent" />
              <div className="p-6 md:p-8">
                {/* 状态 */}
                <div className="flex items-center gap-2 text-[10px] text-white/15 tracking-widest uppercase mb-6">
                  <span className={`w-1.5 h-1.5 rounded-full ${file ? 'bg-emerald-400/60' : 'bg-white/20'}`} />
                  {file ? 'File loaded' : 'Awaiting input'}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* 左：上传 */}
                  <div className="space-y-3">
                    <label className="text-[11px] text-white/30 tracking-wider uppercase font-medium">源文件</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`
                        drop-zone relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
                        ${dragging ? 'border-cyber-400 bg-cyber-500/8 scale-[1.01]' : file ? 'border-cyber-500/30 bg-cyber-500/5' : 'border-white/[.08] hover:border-white/[.15] hover:bg-white/[.02]'}
                      `}
                      style={{ minHeight: '180px' }}
                    >
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                      {!file ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-cyber-500/10 flex items-center justify-center transition-transform duration-300 group-hover:translate-y-[-4px]">
                            <Upload className="w-5 h-5 text-cyber-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white/60 font-medium">拖拽或点击上传</p>
                            <p className="text-xs text-white/20 mt-1">PNG · JPG · WebP · AVIF · GIF</p>
                          </div>
                          <Button variant="secondary" size="sm" className="h-8 text-xs rounded-lg">
                            <FileImage className="w-3 h-3 mr-1.5" /> 选择文件
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-cyber-500/10 flex items-center justify-center">
                            <FileImage className="w-6 h-6 text-cyber-400" />
                          </div>
                          <p className="text-sm text-white font-medium truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-white/30">{formatSize(file.size)}</p>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-white/30 hover:text-white/60"
                            onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>更换</Button>
                        </div>
                      )}
                    </div>
                    {preview && (
                      <div className="relative rounded-xl overflow-hidden bg-black/50 border border-white/[.04] aspect-video flex items-center justify-center">
                        <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                  </div>

                  {/* 右：格式+质量+按钮 */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="text-[11px] text-white/30 tracking-wider uppercase font-medium mb-3 block">输出格式</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {FORMATS.map((f) => (
                          <button key={f.id} onClick={() => setFormat(f.id)}
                            className={`
                              format-chip px-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 border relative overflow-hidden
                              ${format === f.id
                                ? 'bg-gradient-to-br from-cyber-500 to-purple-600 text-white border-transparent shadow-lg shadow-cyber-500/30 scale-[1.02] -translate-y-0.5'
                                : 'bg-white/[.03] text-white/40 border-white/[.06] hover:bg-white/[.06] hover:text-white/70 hover:-translate-y-0.5'
                              }
                            `}
                          >
                            <div className="font-semibold relative z-10">{f.label}</div>
                            <div className={`text-[9px] mt-0.5 relative z-10 ${format === f.id ? 'text-white/50' : 'text-white/20'}`}>{f.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/30 tracking-wider">质量</span>
                        <span className="text-cyber-300/70 font-mono tabular-nums">{quality[0]}%</span>
                      </div>
                      <Slider value={quality} onValueChange={setQuality} min={10} max={100} step={1} />
                      <div className="flex justify-between text-[10px] text-white/15"><span>小体积</span><span>高质量</span></div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end gap-2">
                      {loading && (
                        <div className="space-y-1.5 mb-1 animate-fade-up">
                          <div className="flex justify-between text-xs text-white/30">
                            <span>转换中...</span>
                            <span className="font-mono">{Math.round(progressVal)}%</span>
                          </div>
                          <Progress value={progressVal} className="h-1.5 bg-white/[.06] [&>div]:bg-gradient-to-r [&>div]:from-cyber-500 [&>div]:to-purple-500" />
                        </div>
                      )}
                      <Button onClick={convert} disabled={!file || loading} size="lg"
                        className="w-full h-12 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group
                          [&:not(:disabled)]:shadow-lg [&:not(:disabled)]:shadow-cyber-500/20
                          [&:not(:disabled)]:hover:shadow-cyber-500/30 [&:not(:disabled)]:hover:-translate-y-0.5
                          [&:not(:disabled)]:active:translate-y-0">
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg> 正在转换
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <FileImage className="w-4 h-4" /> {file ? `转换为 ${format}` : '请先上传图片'}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 结果 */}
                {(result || error) && (
                  <div className="mt-6 pt-6 border-t border-white/[.04] animate-fade-up">
                    {error ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 text-lg">!</div>
                        <div>
                          <p className="text-sm text-red-400 font-medium">转换失败</p>
                          <p className="text-xs text-red-300/50 mt-0.5">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" className="ml-auto h-8 text-xs rounded-lg" onClick={reset}>重试</Button>
                      </div>
                    ) : result && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center animate-scale-in">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-emerald-400">转换完成</p>
                              <p className="text-xs text-white/25 mt-0.5">{result.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-9 text-xs rounded-lg"
                              onClick={() => {
                                const a = document.createElement('a')
                                a.href = result.url
                                a.download = result.name
                                a.click()
                              }}>
                              <Download className="w-3.5 h-3.5 mr-1.5" /> 下载
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 text-xs rounded-lg" onClick={() => {
                              URL.revokeObjectURL(result.url)
                              reset()
                            }}>
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> 继续
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-xl overflow-hidden bg-black/50 border border-white/[.04] flex items-center justify-center max-h-72 shimmer">
                          <img src={result.url} alt="result" className="max-w-full max-h-72 object-contain" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </StaggerDiv>

        {/* 特性 */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          {[
            ['⚡', '即时转换', '毫秒级处理'],
            ['🔒', '本地运算', '数据不出设备'],
            ['🎯', '8 种格式', '全格式覆盖']
          ].map(([icon, title, desc], i) => (
            <StaggerDiv key={i} delay={0.35 + i * 0.05}>
              <div className="p-4 rounded-xl bg-white/[.02] border border-white/[.04]">
                <p className="text-lg">{icon}</p>
                <p className="text-xs font-medium text-white/50 mt-1.5">{title}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{desc}</p>
              </div>
            </StaggerDiv>
          ))}
        </div>

        <StaggerDiv delay={0.5}>
          <footer className="text-center mt-10 text-[10px] text-white/[.06] tracking-widest uppercase">
            ImageForge · Data never leaves your device
          </footer>
        </StaggerDiv>
      </main>

      {/* 猫 */}
      <Cat status={loading ? 'converting' : result ? 'done' : 'idle'} />

      {/* CSS 动画 keyframes */}
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-spin {
          to { --angle: 360deg; }
        }
        .animate-border-spin {
          animation: border-spin 6s linear infinite;
        }
        .animate-fade-up {
          animation: fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.04), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .cursor-pointer,
        button,
        a,
        input,
        [role="button"],
        .format-chip,
        .drop-zone {
          cursor: none;
        }
        .hover\\:cursor-none:hover {
          cursor: none;
        }
      `}</style>
    </div>
  )
}

export default App
