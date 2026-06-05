import { useEffect, useState } from 'react'
import previewLogo from './preview.webp'

export function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState(0) // 0=oculto, 1=visible, 2=salida
  const [version, setVersion] = useState('3.0.0')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80)
    const t2 = setTimeout(() => setPhase(2), 3000)
    const t3 = setTimeout(() => onFinish(), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  useEffect(() => {
    if (phase !== 1) return
    const start = Date.now()
    const duration = 2700
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100)
      setProgress(p)
      if (p < 100) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [phase])

  useEffect(() => {
    let active = true
    fetch(`/status.json?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (active && d?.update?.version) setVersion(d.update.version) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        opacity: phase === 0 ? 0 : phase === 2 ? 0 : 1,
        transition: phase === 2
          ? 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'opacity 0.7s ease-out',
        pointerEvents: phase === 2 ? 'none' : 'all',
        backgroundColor: 'rgba(5,5,5,1)',
      }}
    >
      {/* ── Imagen de fondo con blur ── */}
      <div className="absolute inset-0">
        <img
          src={previewLogo}
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.35, filter: 'blur(8px)', transform: 'scale(1.08)' }}
        />
        {/* Gradientes sobre la imagen */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        {/* Viñeta perimetral */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
        />
      </div>

      {/* ── Contenido central ── */}
      <div
        className="relative z-10 flex flex-col items-center gap-8 text-center px-8"
        style={{
          transform: phase === 1 ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)',
          transition: 'transform 0.9s cubic-bezier(0.25,1,0.5,1)',
        }}
      >
        {/* Logo / ícono de la app */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-24 h-24 rounded-[28px] flex items-center justify-center"
            style={{
              background: 'rgba(0,18,22,0.7)',
              border: '1px solid rgba(0,229,255,0.18)',
              boxShadow: '0 0 0 1px rgba(0,229,255,0.06), 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,229,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <polygon points="5 3 19 12 5 21 5 3" fill="#00E5FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.7))' }} />
            </svg>
          </div>

          {/* Nombre */}
          <div className="flex flex-col items-center gap-2">
            <h1
              className="text-white font-black uppercase"
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                letterSpacing: '0.2em',
                textShadow: '0 0 30px rgba(0,229,255,0.12), 0 4px 24px rgba(0,0,0,0.9)',
              }}
            >
              MagLink<span style={{ color: '#00E5FF' }}>·</span>TV
            </h1>
            {/* Badge versión */}
            <div
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(0,229,255,0.07)',
                border: '1px solid rgba(0,229,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 6px rgba(0,229,255,0.8)' }} />
              <span className="text-accent/80 text-[11px] font-bold tracking-[0.2em] uppercase">
                Versión {version}
              </span>
            </div>
          </div>
        </div>

        {/* Indicador de carga */}
        <div className="flex flex-col items-center gap-3">
          {/* Spinner delgado elegante */}
          <div
            className="w-8 h-8 rounded-full"
            style={{
              border: '2px solid rgba(0,229,255,0.12)',
              borderTopColor: 'rgba(0,229,255,0.8)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span
            className="text-white/30 font-semibold uppercase tracking-[0.25em]"
            style={{ fontSize: '10px' }}
          >
            Iniciando...
          </span>
        </div>
      </div>

      {/* ── Barra de progreso inferior ── */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="w-full h-[2px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, rgba(0,229,255,0.3), #00E5FF)',
              boxShadow: '0 0 10px rgba(0,229,255,0.5)',
              transition: 'width 0.08s linear',
            }}
          />
        </div>
      </div>
    </div>
  )
}
