import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Star, Search, X, Clock, Tag, Play, Calendar } from 'lucide-react'

const ROW_H    = (isTV, isPortrait) => isTV ? 88 : isPortrait ? 72 : 76
const COL_W    = (isTV)             => isTV ? 120 : 100
const HEADER_H = (isTV, isPortrait) => ROW_H(isTV, isPortrait) * 0.7

// ─── Channel Cell ─────────────────────────────────────────────────────────────
const ChannelCell = memo(function ChannelCell({ ch, index, onChannelClick, selected, focused, isTV, isPortrait, isFavorite }) {
  const rowH = ROW_H(isTV, isPortrait)
  const [err, setErr] = useState(false)

  return (
    <div
      onClick={() => onChannelClick(ch)}
      data-channel-index={index}
      className={`shrink-0 flex flex-col items-center justify-center gap-2 px-2 cursor-pointer transition-all duration-200 select-none relative border-b border-white/5
        ${selected ? 'bg-accent/10 border-l-[3px] border-l-accent' : focused ? 'bg-accent/15' : 'bg-transparent hover:bg-white/5'}
      `}
      style={{ height: rowH }}
    >
      {isFavorite(ch.id) && (
        <div className="absolute top-1.5 right-1.5 text-white/60"><Star size={9} fill="currentColor" /></div>
      )}
      <span className={`font-bold tabular-nums tracking-wider leading-none transition-colors
        ${focused || selected ? 'text-white' : 'text-white/30'}
        ${isTV ? 'text-xs' : 'text-[10px]'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className={`flex items-center justify-center rounded-xl overflow-hidden transition-all duration-200
        ${isTV ? 'h-11 w-[68px]' : 'h-9 w-[60px]'}
        ${focused ? 'bg-accent/20 ring-2 ring-accent/60' : selected ? 'bg-white/10 ring-1 ring-accent/30' : 'bg-white/5'}`}>
        {!err
          ? <img src={ch.logo} alt={ch.name} loading="lazy" decoding="async" draggable="false"
              className={`object-contain transition-all duration-200
                ${isTV ? 'max-w-[54px] max-h-[34px]' : 'max-w-[46px] max-h-[28px]'}
                ${focused || selected ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
              onError={() => setErr(true)} />
          : <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{ch.name.slice(0, 3)}</span>
        }
      </div>
    </div>
  )
}, (prev, next) => {
  return prev.ch.id === next.ch.id &&
         prev.index === next.index &&
         prev.selected === next.selected &&
         prev.focused === next.focused &&
         prev.isTV === next.isTV &&
         prev.isPortrait === next.isPortrait &&
         prev.isFavorite(prev.ch.id) === next.isFavorite(next.ch.id)
})

// ─── Program Detail Modal ─────────────────────────────────────────────────────
function ProgramDetailModal({ prog, ch, isNow, onClose, onPlay, isTV }) {
  const fmt = t => t ? new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  const fmtDate = t => t ? new Date(t).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const duration = prog ? Math.round((prog.end - prog.start) / 60000) : 0

  useEffect(() => {
    // Captura para correr antes del handler global de DesktopLayout y evitar conflictos
    const handle = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); onClose() }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); onPlay() }
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation() }
    }
    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [onClose, onPlay])

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-3xl rounded-t-[32px] glass-panel border-b-0 border-x-0 overflow-hidden"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.25,1,0.5,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className={`px-8 pb-8 pt-2 flex flex-col gap-5 ${isTV ? '' : ''}`}>
          {/* Header: logo + channel + live badge */}
          <div className="flex items-center gap-4">
            {ch?.logo && (
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2">
                <img src={ch.logo} alt={ch.name} className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">{ch?.name}</p>
              <h2 className={`text-white font-black leading-tight ${isTV ? 'text-2xl' : 'text-xl'}`}>
                {prog?.title || 'Sin Información'}
              </h2>
            </div>
            {isNow && (
              <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                En Vivo
              </span>
            )}
          </div>

          {/* Meta info */}
          {prog && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                <Clock size={13} className="text-accent" />
                <span className="text-white/70 text-xs font-semibold">{fmt(prog.start)} – {fmt(prog.end)}</span>
              </div>
              {duration > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                  <span className="text-white/70 text-xs font-semibold">{duration} min</span>
                </div>
              )}
              {prog.category && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                  <Tag size={13} className="text-accent" />
                  <span className="text-white/70 text-xs font-semibold">{prog.category}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                <Calendar size={13} className="text-accent" />
                <span className="text-white/70 text-xs font-semibold capitalize">{fmtDate(prog.start)}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {prog?.desc && (
            <p className={`text-white/60 leading-relaxed ${isTV ? 'text-base' : 'text-sm'}`}>
              {prog.desc}
            </p>
          )}
          {!prog?.desc && (
            <p className="text-white/25 text-sm italic">Sin descripción disponible</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-1">
            <button
              onClick={onPlay}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-accent text-black font-bold hover:bg-accent/90 transition-all ${isTV ? 'text-base' : 'text-sm'}`}
            >
              <Play size={16} fill="currentColor" />
              Ver Canal
            </button>
            <button
              onClick={onClose}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all ${isTV ? 'text-base' : 'text-sm'}`}
            >
              <X size={16} />
              Cerrar
            </button>
          </div>
          {isTV && <p className="text-white/20 text-xs tracking-widest uppercase">Enter = Ver Canal · Escape = Cerrar</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Program Block ────────────────────────────────────────────────────────────
function ProgramBlock({ prog, ch, onShowDetail, left, width, isNow, isTV }) {
  const fmt = t => t ? new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

  return (
    <div
      onClick={() => onShowDetail({ prog, ch, isNow })}
      className={`absolute top-[6px] bottom-[6px] rounded-2xl flex flex-col justify-center px-3 cursor-pointer overflow-hidden transition-all duration-200 hover:z-20 group
        ${isNow ? 'bg-white/15 border border-white/25' : 'bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15'}
      `}
      style={{ left: left + 3, width: Math.max(36, width - 6) }}
    >
      {isNow && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white rounded-l-2xl" />}
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-0.5">
          {isNow && (
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
              ● EN VIVO
            </span>
          )}
          <p className={`font-semibold truncate leading-tight
            ${isNow ? 'text-white' : 'text-white/70 group-hover:text-white/90'}
            ${isTV ? 'text-[13px]' : 'text-[11px]'}`}>
            {prog ? prog.title : "Sin Información"}
          </p>
        </div>
        {prog && width > 130 && (
          <p className={`truncate font-medium uppercase tracking-wider
            ${isNow ? 'text-white/60' : 'text-white/30 group-hover:text-white/50'}
            ${isTV ? 'text-[10px]' : 'text-[9px]'}`}>
            {fmt(prog.start)} – {fmt(prog.end)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── EPG Row ──────────────────────────────────────────────────────────────────
const EPGRow = memo(function EPGRow({ channel, programs, onShowDetail, startTime, msToPixels, now, SLOT_W, selected, isTV, isPortrait }) {
  const rowH = ROW_H(isTV, isPortrait)
  const nowMs = now instanceof Date ? now.getTime() : now

  return (
    <div className={`flex shrink-0 relative border-b border-white/5 transition-colors duration-200
      ${selected ? 'bg-accent/5' : 'bg-transparent'}`}
      style={{ height: rowH }}
    >
      <div className="relative flex-1">
        {programs.length === 0
          ? <ProgramBlock prog={null} ch={channel} onShowDetail={onShowDetail} left={0} width={SLOT_W * 24} isNow={false} isTV={isTV} />
          : programs.map((p, i) => {
              const l = msToPixels(p.start - startTime)
              const w = msToPixels(p.end - p.start)
              if (l + w < 0 || l > SLOT_W * 24) return null
              return (
                <ProgramBlock key={i} prog={p} ch={channel} onShowDetail={onShowDetail}
                  left={l} width={w} isNow={p.start <= nowMs && p.end > nowMs} isTV={isTV} />
              )
            })
        }
      </div>
    </div>
  )
}, (prev, next) => {
  return prev.channel.id === next.channel.id &&
         prev.programs === next.programs &&
         prev.startTime.getTime() === next.startTime.getTime() &&
         prev.now === next.now &&
         prev.SLOT_W === next.SLOT_W &&
         prev.selected === next.selected &&
         prev.isTV === next.isTV &&
         prev.isPortrait === next.isPortrait
})

// ─── EPG Grid (main) ─────────────────────────────────────────────────────────
export function EPGGrid({
  filteredChannels, epgData, selectedChannel, onChannelClick,
  now, startTime, timeSlots, msToPixels, SLOT_W, nowOffset,
  isPortrait, isTV, isFavorite,
  logoScrollRef, gridScrollRef, handleGridScroll, handleLogoScroll,
  setGridVisible, searchQuery, activeFilter,
  // navigation
  focusedChannelIndex, setFocusedChannelIndex, navZone,
}) {
  const rowH    = ROW_H(isTV, isPortrait)
  const colW    = COL_W(isTV)
  const headerH = HEADER_H(isTV, isPortrait)

  const [detailModal, setDetailModal] = useState(null) // { prog, ch, isNow }

  const handleChannelClick = useCallback((ch) => {
    const idx = filteredChannels.findIndex(c => c.id === ch.id)
    if (idx !== -1) setFocusedChannelIndex(idx)
    onChannelClick(ch)
    setGridVisible(false)
    setDetailModal(null)
  }, [filteredChannels, setFocusedChannelIndex, onChannelClick, setGridVisible])

  const handleShowDetail = useCallback((data) => {
    if (!data.prog) return
    setDetailModal(data)
  }, [])

  const handlePlayFromModal = useCallback(() => {
    if (!detailModal?.ch) return
    handleChannelClick(detailModal.ch)
  }, [detailModal, handleChannelClick])

  // Tecla Info (i): abre el detalle del programa actual del canal enfocado
  useEffect(() => {
    if (navZone !== 'channel') return
    const handle = (e) => {
      const isInfo = e.key === 'i' || e.key === 'I' || e.key === 'Info' || e.keyCode === 457
      if (!isInfo) return
      const ch = filteredChannels[focusedChannelIndex]
      if (!ch) return
      e.preventDefault()
      const progs = epgData[ch.tvgId || ch.id] || []
      const nowMs = Date.now()
      const cur = progs.find(p => {
        const s = p.start instanceof Date ? p.start.getTime() : new Date(p.start).getTime()
        const en = p.end instanceof Date ? p.end.getTime() : new Date(p.end).getTime()
        return s <= nowMs && en > nowMs
      }) || null
      setDetailModal({ prog: cur, ch, isNow: !!cur })
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [navZone, filteredChannels, focusedChannelIndex, epgData])

  // Scroll to keep focused channel visible
  useEffect(() => {
    if (focusedChannelIndex == null || !logoScrollRef.current) return
    const container = logoScrollRef.current
    const itemTop    = headerH + focusedChannelIndex * rowH
    const viewTop    = container.scrollTop
    const viewBottom = viewTop + container.clientHeight

    if (itemTop < viewTop) {
      const target = itemTop - headerH
      container.scrollTop = target
      if (gridScrollRef.current) gridScrollRef.current.scrollTop = target
    } else if (itemTop + rowH > viewBottom) {
      const target = itemTop + rowH - container.clientHeight + headerH
      container.scrollTop = target
      if (gridScrollRef.current) gridScrollRef.current.scrollTop = target
    }
  }, [focusedChannelIndex, rowH, headerH, logoScrollRef, gridScrollRef])

  return (
    <>
    {detailModal && (
      <ProgramDetailModal
        prog={detailModal.prog}
        ch={detailModal.ch}
        isNow={detailModal.isNow}
        isTV={isTV}
        onClose={() => setDetailModal(null)}
        onPlay={handlePlayFromModal}
      />
    )}
    <div className="flex-1 flex overflow-hidden min-h-0 relative bg-surface">
      {/* Hint de navegación TV */}
      {isTV && navZone === 'channel' && !detailModal && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-2.5 px-4 py-2 rounded-full glass-pill text-white/60 text-xs font-semibold pointer-events-none">
          <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold">i</span>
          Info del programa
          <span className="opacity-30">·</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">OK</span>
          Reproducir
        </div>
      )}
      {/* ── Channel column ── */}
      <div
        ref={logoScrollRef}
        onScroll={handleLogoScroll}
        className="shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide z-[60] relative bg-surface border-r border-white/[0.07]"
        style={{ width: colW }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-center bg-surface border-b border-white/[0.07]"
          style={{ height: headerH }}>
          <span className={`font-bold text-white/20 uppercase tracking-[0.2em] ${isTV ? 'text-[10px]' : 'text-[9px]'}`}>CH</span>
        </div>

        {filteredChannels.map((ch, i) => (
          <ChannelCell key={ch.id} ch={ch} index={i}
            onChannelClick={handleChannelClick}
            selected={selectedChannel?.id === ch.id}
            focused={focusedChannelIndex === i}
            isTV={isTV} isPortrait={isPortrait}
            isFavorite={isFavorite}
          />
        ))}

        {filteredChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 px-3 text-center gap-2">
            <span className="text-xl">📡</span>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/20">Sin Canales</p>
          </div>
        )}
      </div>

      {/* ── Timeline + programs ── */}
      <div
        ref={gridScrollRef}
        onScroll={handleGridScroll}
        className="flex-1 overflow-auto scrollbar-hide relative"
      >
        <div className="relative" style={{ width: SLOT_W * 24 }}>
          {/* Time header */}
          <div className="sticky top-0 z-40 flex bg-surface border-b border-white/[0.07]" style={{ height: headerH }}>
            {timeSlots.map((t, i) => (
              <div key={i} className={`shrink-0 flex items-center px-4 font-semibold text-white/30 uppercase tracking-widest border-l border-white/[0.04]
                ${isTV ? 'text-[11px]' : 'text-[9px]'}`}
                style={{ width: SLOT_W }}>
                {t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            ))}
          </div>

          {/* Now line (Current Time Indicator) */}
          <div className="absolute top-0 bottom-0 z-50 pointer-events-none flex flex-col items-center" style={{ left: nowOffset, width: 1 }}>
            <div className="w-full h-full bg-accent shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
            <div className="absolute top-0 w-3 h-3 rounded-full bg-accent border-2 border-white shadow-[0_0_12px_rgba(0,229,255,0.8)]" 
              style={{ transform: `translateY(${headerH - 6}px)` }} />
          </div>

          {/* Rows */}
          <div className="flex flex-col pb-10">
            {filteredChannels.length > 0
              ? filteredChannels.map((ch, i) => (
                  <EPGRow key={ch.id} channel={ch} index={i}
                    programs={epgData[ch.tvgId || ch.id] || []}
                    onShowDetail={handleShowDetail}
                    startTime={startTime} msToPixels={msToPixels}
                    now={now} SLOT_W={SLOT_W}
                    selected={selectedChannel?.id === ch.id}
                    isTV={isTV} isPortrait={isPortrait}
                  />
                ))
              : (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
                  <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Search size={22} className="text-white/20" />
                  </div>
                  <p className="text-sm font-medium text-white/30 max-w-md leading-relaxed">
                    {searchQuery
                      ? `Sin resultados para "${searchQuery}"`
                      : `No hay canales en "${activeFilter}"`}
                  </p>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
