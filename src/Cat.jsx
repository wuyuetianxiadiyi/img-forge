import { useState, useRef, useEffect } from 'react'

// 音效（预加载）
const sounds = {
  catUp: [new Audio('/audio/cat/catup-01.wav'), new Audio('/audio/cat/catup-02.wav'), new Audio('/audio/cat/catup-03.wav')],
  catDown: [new Audio('/audio/cat/catdown-01.wav'), new Audio('/audio/cat/catdown-02.wav'), new Audio('/audio/cat/catdown-03.wav')],
  complete: new Audio('/audio/cat/complete.wav'),
}

function playRandom(arr) {
  const s = arr[Math.floor(Math.random() * arr.length)]
  s.currentTime = 0
  s.play().catch(() => {}) // 忽略浏览器自动播放限制
}

export default function Cat({ status }) {
  const [excited, setExcited] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const timeoutRef = useRef(null)
  const prevStatus = useRef(status)

  // 根据 App 状态自动反应
  const isWorking = status === 'converting'
  const isDone = status === 'done'

  // 转换完成 → 播完成音效 + 弹跳
  useEffect(() => {
    if (prevStatus.current === 'converting' && status === 'done') {
      playRandom(sounds.catUp)
      sounds.complete.currentTime = 0
      sounds.complete.play().catch(() => {})
    }
    prevStatus.current = status
  }, [status])

  return (
    <div
      className="fixed bottom-0 right-4 z-40 select-none"
      style={{ pointerEvents: 'auto' }}
      onMouseEnter={() => {
        setExcited(true)
        playRandom(sounds.catUp)  // 猫站起来叫一声
      }}
      onMouseLeave={() => {
        if (!mouthOpen) {
          setExcited(false)
          playRandom(sounds.catDown)  // 猫坐下去叫一声
        }
      }}
    >
      {/* 绳子 */}
      <div
        className="absolute"
        style={{
          left: 115, top: excited ? -130 : -300,
          width: 8, height: 257,
          transition: 'top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <img
          src="/images/cat/blackcat-rope.png"
          alt="rope"
          className="swinging-rope"
          style={{
            width: 8, height: 257,
            animation: excited ? 'ropeSwing 2s ease-in-out infinite' : 'none',
          }}
        />
        {/* 绳子底部的重置按钮 */}
        {excited && (
          <div
            className="absolute cursor-pointer"
            style={{
              left: -30, top: 248, width: 71, height: 55,
              backgroundImage: 'url(/images/cat/blackcat-closemouth.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              opacity: 0.6,
            }}
          />
        )}
      </div>

      {/* 猫身体 */}
      <div
        className="relative cursor-pointer"
        style={{
          width: 233, height: 215,
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.3s',
          transform: excited ? 'translateY(0)' : `translateY(${isWorking ? 40 : 100}px)`,
          filter: isWorking ? 'brightness(1.2)' : 'none',
          ...(isDone ? { animation: 'catBounce 0.5s ease' } : {}),
        }}
        onClick={() => {
          setMouthOpen(!mouthOpen)
          setClickCount(c => c + 1)
          clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            setMouthOpen(false)
            if (!mouthOpen) setExcited(false)
          }, 1500)
        }}
      >
        {/* 猫身体 */}
        <img
          src="/images/cat/blackcat-body.png"
          alt="cat"
          style={{
            width: 233, height: 215,
            position: 'absolute', top: 0, left: 0,
            transition: 'opacity 0.15s',
            opacity: mouthOpen ? 0 : 1,
          }}
        />

        {/* 张嘴 */}
        {mouthOpen && (
          <img
            src="/images/cat/blackcat-openmouth.png"
            alt="cat mouth open"
            style={{
              width: 233, height: 215,
              position: 'absolute', top: 0, left: 0,
            }}
          />
        )}

        {/* 点击次数 */}
        {clickCount > 0 && (
          <div
            style={{
              position: 'absolute', bottom: -20, left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 10, color: 'rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            摸了 {clickCount} 次
          </div>
        )}
      </div>

      {/* 状态相关动画 */}
      <style>{`
        @keyframes ropeSwing {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(6px) rotate(2deg); }
          75% { transform: translateX(-6px) rotate(-2deg); }
        }
        @keyframes catBounce {
          0% { transform: translateY(${excited ? 0 : 100}px) scale(1); }
          30% { transform: translateY(${excited ? -10 : 90}px) scale(1.05); }
          50% { transform: translateY(${excited ? 0 : 100}px) scale(0.98); }
          70% { transform: translateY(${excited ? -5 : 95}px) scale(1.02); }
          100% { transform: translateY(${excited ? 0 : 100}px) scale(1); }
        }
      `}</style>
    </div>
  )
}
