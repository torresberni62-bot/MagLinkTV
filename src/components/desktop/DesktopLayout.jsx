import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDrag } from '@use-gesture/react'
import { DesktopPlayer } from './DesktopPlayer'
import { FILTERS } from './FilterBar'
import previewLogo from '../preview.webp'

const SLOT_W = 200


// ─── TV Fullscreen Splash ─────────────────────────────────────────────────────
function TVSplash({ onEnter }) {
  useEffect(() => {
    const h = (e) => {
      if (['Enter', ' ', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault(); onEnter()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onEnter])

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{ backgroundColor: 'rgba(5,5,5,1)' }}
      onClick={onEnter}
    >
      {/* ── Imagen de fondo con blur (igual que SplashScreen) ── */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={previewLogo}
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.3, filter: 'blur(10px)', transform: 'scale(1.08)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/50" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.65) 100%)' }}
        />
      </div>

      {/* ── Contenido ── */}
      <div className="relative z-10 flex flex-col items-center gap-10 text-center px-12">

        {/* Logo y nombre */}
        <div className="flex flex-col items-center gap-5">
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
          <h1
            className="text-white font-black uppercase"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              letterSpacing: '0.2em',
              textShadow: '0 0 30px rgba(0,229,255,0.12), 0 4px 24px rgba(0,0,0,0.9)',
            }}
          >
            MagLink<span style={{ color: '#00E5FF' }}>·</span>TV
          </h1>
        </div>

        {/* Separador */}
        <div className="w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)' }} />

        {/* Instrucción principal */}
        <div className="flex flex-col items-center gap-4">
          {/* Ícono de botón OK */}
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{
              background: 'rgba(0,229,255,0.08)',
              border: '2px solid rgba(0,229,255,0.25)',
              boxShadow: '0 0 20px rgba(0,229,255,0.1)',
              animation: 'okPulse 2.5s ease-in-out infinite',
            }}
          >
            <span
              className="font-black text-accent"
              style={{ fontSize: '15px', letterSpacing: '0.05em', textShadow: '0 0 8px rgba(0,229,255,0.6)' }}
            >
              OK
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <p
              className="text-white font-bold uppercase"
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', letterSpacing: '0.18em', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
            >
              Presioná OK para continuar
            </p>
            <p className="text-white/25 font-medium uppercase tracking-widest" style={{ fontSize: '11px' }}>
              o tocá la pantalla
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export function DesktopLayout({
  selectedChannel,
  channels, filteredChannels, epgData,
  searchQuery, setSearchQuery,
  activeFilter, setActiveFilter,
  onChannelClick,
  toggleFavorite, isFavorite, favoriteIds,
}) {
  const logoScrollRef    = useRef(null)
  const gridScrollRef    = useRef(null)
  const scrollTimeout    = useRef(null)
  const controlsTimeout  = useRef(null)
  const searchRef        = useRef(null)
  const autoCloseTimerRef = useRef(null)

  const isTV     = true
  const isMobile = false

  const [tvSplashDone, setTvSplashDone] = useState(!isTV)
  const [gridVisible,  setGridVisible]  = useState(false)
  const [now,          setNow]          = useState(new Date())
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)
  const [volume,       setVolume]       = useState(100)
  const [isMuted,      setIsMuted]      = useState(false)
  const [typedNumber,  setTypedNumber]  = useState('')
  const [isPortrait,   setIsPortrait]   = useState(window.innerHeight > window.innerWidth)
  const prevIsPortrait                  = useRef(isPortrait)
  const zappingTimeout                  = useRef(null)

  // ── Navigation state ─────────────────────────────────────────────────────────
  // 'player' | 'filter' | 'channel'
  const [navZone,            setNavZone]            = useState('player')
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(0)
  const [focusedFilterIndex,  setFocusedFilterIndex]  = useState(0)
  // How many filter tabs + 1 search box = total "filter items"
  const filterItemCount = useRef(0)

  // Keep filterItemCount in sync (TV: no search box, so no +1)
  useEffect(() => {
    const hasFav = favoriteIds?.length > 0
    const visible = FILTERS.filter(f => f.id !== 'Favoritos' || hasFav)
    filterItemCount.current = visible.length // TV mode: no search input
  }, [favoriteIds])

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // ── Orientation ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const nowPortrait = window.innerHeight > window.innerWidth
      const wasPortrait = prevIsPortrait.current
      setIsPortrait(nowPortrait)
      if (isMobile && wasPortrait !== nowPortrait) {
        if (!nowPortrait) { setGridVisible(false); document.documentElement.requestFullscreen().catch(() => {}) }
        else              { setGridVisible(true);  document.fullscreenElement && document.exitFullscreen().catch(() => {}) }
      }
      prevIsPortrait.current = nowPortrait
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile])

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        if (isMobile && window.screen?.orientation) await window.screen.orientation.lock('landscape').catch(() => {})
      } catch (e) {}
    } else {
      try {
        isMobile && window.screen?.orientation?.unlock()
        await document.exitFullscreen()
      } catch (e) {}
    }
  }, [isMobile])

  const toggleMute = useCallback(() => setIsMuted(p => !p), [])

  const handleVolumeChange = useCallback((e) => {
    const v = parseInt(e.target.value)
    setVolume(v)
    if (v > 0) setIsMuted(false)
  }, [])

  // ── Show controls temporarily ─────────────────────────────────────────────
  const showControlsTemp = useCallback(() => {
    setShowControls(true)
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 5000)
  }, [])

  useEffect(() => {
    if (!selectedChannel) return
    setShowControls(true)
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => setShowControls(false), 5000)
  }, [selectedChannel])

  // ── Scroll sync ───────────────────────────────────────────────────────────
  const handleGridScroll = useCallback((e) => {
    if (logoScrollRef.current && Math.abs(logoScrollRef.current.scrollTop - e.target.scrollTop) > 2) {
      logoScrollRef.current.scrollTop = e.target.scrollTop
    }
  }, [])

  const handleLogoScroll = useCallback((e) => {
    if (gridScrollRef.current && Math.abs(gridScrollRef.current.scrollTop - e.target.scrollTop) > 2) {
      gridScrollRef.current.scrollTop = e.target.scrollTop
    }
  }, [])

  // ── TV Splash ─────────────────────────────────────────────────────────────
  const handleTVEnter = useCallback(async () => {
    try { await document.documentElement.requestFullscreen() } catch (e) {}
    setTvSplashDone(true)
  }, [])

  // ── Swipe gesture (for mobile) ────────────────────────────────────────────
  const bind = useDrag(({ movement: [, my], velocity: [, vy], direction: [, dy], last }) => {
    if (last && Math.abs(vy) > 0.5) {
      if (dy < 0) { setGridVisible(true);  setNavZone('filter') }
      if (dy > 0) { setGridVisible(false); setNavZone('player') }
    }
  }, { filterTaps: true })

  // ── Open grid and focus filter zone ──────────────────────────────────────
  const openGrid = useCallback(() => {
    setGridVisible(true)
    setShowControls(true)
    setNavZone('filter')
    // Auto-cierre del grid tras 15s sin interacción
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    autoCloseTimerRef.current = setTimeout(() => {
      setGridVisible(false)
      setNavZone('player')
    }, 15000)
  }, [])

  // Limpiar timer al desmontar
  useEffect(() => () => { if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current) }, [])

  // ── KEYBOARD / REMOTE NAVIGATION ─────────────────────────────────────────
  useEffect(() => {
    const resetAutoClose = () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
        autoCloseTimerRef.current = setTimeout(() => {
          setGridVisible(false)
          setNavZone('player')
        }, 15000)
      }
    }

    const handleKey = (e) => {
      const inInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'

      // Mostrar controles en cualquier tecla (TV: sin mouse)
      showControlsTemp()

      // ── Media keys (TV remotes) ───────────────────────────────────────────
      if (e.key === 'MediaPlayPause' || e.keyCode === 179) {
        e.preventDefault(); toggleMute(); return
      }
      if (e.key === 'MediaStop' || e.keyCode === 178) {
        e.preventDefault(); toggleMute(); return
      }

      // ── Backspace / Escape ────────────────────────────────────────────────
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (inInput) {
          // Exit search on Escape, or Backspace if empty
          if (e.key === 'Escape' || !searchQuery) {
            e.preventDefault()
            document.activeElement?.blur()
            setNavZone('filter')
          }
          return
        }
        e.preventDefault()
        if (navZone === 'channel') {
          // Go back to filter zone
          setNavZone('filter')
        } else if (navZone === 'filter' || gridVisible) {
          setGridVisible(false)
          setNavZone('player')
        } else if (document.fullscreenElement) {
          document.exitFullscreen()
        }
        return
      }

      // ── Enter / OK ────────────────────────────────────────────────────────
      if (e.key === 'Enter' || e.key === 'Return') {
        if (inInput) {
          // Confirm search and go to channels
          e.preventDefault()
          document.activeElement?.blur()
          setNavZone('channel')
          setFocusedChannelIndex(0)
          return
        }
        e.preventDefault()
        if (navZone === 'filter') {
          const hasFav = favoriteIds?.length > 0
          const visible = FILTERS.filter(f => f.id !== 'Favoritos' || hasFav)
          if (focusedFilterIndex < visible.length) {
            setActiveFilter(visible[focusedFilterIndex].id)
            setNavZone('channel')
          }
        } else if (navZone === 'channel') {
          const ch = filteredChannels[focusedChannelIndex]
          if (ch) {
            onChannelClick(ch)
            if (!isPortrait) { setGridVisible(false); setNavZone('player') }
          }
        } else {
          // player zone — open grid
          openGrid()
        }
        return
      }

      // ── Arrow keys ────────────────────────────────────────────────────────
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Numeric zapping
        if (!inInput && /^[0-9]$/.test(e.key)) {
          e.preventDefault()
          setTypedNumber(prev => {
            const next = (prev + e.key).slice(-3)
            if (zappingTimeout.current) clearTimeout(zappingTimeout.current)
            zappingTimeout.current = setTimeout(() => {
              const idx = parseInt(next, 10) - 1
              if (idx >= 0 && idx < filteredChannels.length) {
                onChannelClick(filteredChannels[idx])
                if (!isPortrait) setGridVisible(false)
              }
              setTypedNumber('')
            }, 1500)
            return next
          })
        }
        // f = fullscreen, m = mute
        if (!inInput && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); toggleFullscreen() }
        if (!inInput && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); toggleMute() }
        return
      }

      // From here: arrow keys
      if (inInput) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          document.activeElement?.blur()
          setNavZone('channel')
          setFocusedChannelIndex(0)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          document.activeElement?.blur()
          setNavZone('filter')
        }
        return
      }

      // ── Zone: player ──────────────────────────────────────────────────────
      if (navZone === 'player') {
        e.preventDefault()
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          openGrid()
        } else if (e.key === 'ArrowLeft') {
          setVolume(p => Math.max(0, p - 10))
        } else if (e.key === 'ArrowRight') {
          setVolume(p => { const v = Math.min(100, p + 10); if (v > 0) setIsMuted(false); return v })
        }
        return
      }

      // ── Zone: filter ──────────────────────────────────────────────────────
      if (navZone === 'filter') {
        const hasFav = favoriteIds?.length > 0
        const visible = FILTERS.filter(f => f.id !== 'Favoritos' || hasFav)
        const total = visible.length // TV mode: no search input

        resetAutoClose()
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setFocusedFilterIndex(p => Math.max(0, p - 1))
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          setFocusedFilterIndex(p => Math.min(total - 1, p + 1))
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setNavZone('channel')
          // Make sure channel list is visible
          if (filteredChannels.length > 0) setFocusedChannelIndex(p => Math.max(0, p))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          // Close grid — go back to player
          setGridVisible(false)
          setNavZone('player')
        }
        return
      }

      // ── Zone: channel ─────────────────────────────────────────────────────
      if (navZone === 'channel') {
        resetAutoClose()
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (focusedChannelIndex <= 0) {
            setNavZone('filter')
          } else {
            setFocusedChannelIndex(p => p - 1)
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setFocusedChannelIndex(p => Math.min(filteredChannels.length - 1, p + 1))
        } else if (e.key === 'PageUp') {
          e.preventDefault()
          setFocusedChannelIndex(p => Math.max(0, p - 10))
        } else if (e.key === 'PageDown') {
          e.preventDefault()
          setFocusedChannelIndex(p => Math.min(filteredChannels.length - 1, p + 10))
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          if (e.key === 'ArrowLeft') {
            setVolume(p => Math.max(0, p - 10))
          } else {
            setVolume(p => { const v = Math.min(100, p + 10); if (v > 0) setIsMuted(false); return v })
          }
        }
        return
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
    navZone, gridVisible, focusedChannelIndex, focusedFilterIndex,
    filteredChannels, onChannelClick, isPortrait, favoriteIds,
    setActiveFilter, toggleFullscreen, toggleMute, showControlsTemp, openGrid,
    searchQuery,
  ])

  // ── EPG data / time ───────────────────────────────────────────────────────
  const startH    = now.getHours() - 1
  const startTime = new Date(now); startTime.setHours(startH, 0, 0, 0)
  const msToPixels = useCallback((ms) => (ms / 1800000) * SLOT_W, [])
  const nowOffset  = msToPixels(now - startTime)
  const timeSlots  = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const t = new Date(startTime); t.setMinutes(t.getMinutes() + i * 30); return t
  }), [startTime.getTime()])

  const currentPrograms  = selectedChannel ? (epgData[selectedChannel.tvgId || selectedChannel.id] || []) : []
  const currentProgIndex = currentPrograms.findIndex(p => p.start <= now && p.end > now)
  const currentProg      = currentProgIndex !== -1 ? currentPrograms[currentProgIndex] : null
  const nextProg         = currentProgIndex !== -1 ? currentPrograms[currentProgIndex + 1] : null
  const progressPercent  = currentProg ? ((now - currentProg.start) / (currentProg.end - currentProg.start)) * 100 : 0

  // Sync focusedChannelIndex when selectedChannel changes externally
  useEffect(() => {
    if (!selectedChannel) return
    const idx = filteredChannels.findIndex(c => c.id === selectedChannel.id)
    if (idx !== -1) setFocusedChannelIndex(idx)
  }, [selectedChannel, filteredChannels])

  return (
    <>
      {!tvSplashDone && <TVSplash onEnter={handleTVEnter} />}

      <div
        {...bind()}
        className="fixed inset-0 bg-black overflow-hidden outline-none touch-none"
        style={isTV ? {
          padding: 'env(safe-area-inset-top, 24px) env(safe-area-inset-right, 32px) env(safe-area-inset-bottom, 24px) env(safe-area-inset-left, 32px)',
        } : undefined}
        onMouseMove={showControlsTemp}
      >
        <DesktopPlayer
          selectedChannel={selectedChannel}
          currentProg={currentProg}
          nextProg={nextProg}
          progressPercent={progressPercent}
          showControls={showControls}
          isMuted={isMuted}
          volume={volume}
          onToggleMute={toggleMute}
          onVolumeChange={handleVolumeChange}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          gridVisible={gridVisible}
          setGridVisible={setGridVisible}
          typedNumber={typedNumber}
          isTV={isTV}

          // Grid & filter props
          channels={channels}
          filteredChannels={filteredChannels}
          epgData={epgData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          toggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          favoriteIds={favoriteIds}
          onChannelClick={useCallback((ch) => {
            onChannelClick(ch)
            if (!isPortrait) setGridVisible(false)
          }, [onChannelClick, isPortrait, setGridVisible])}
          now={now}
          startTime={startTime}
          timeSlots={timeSlots}
          nowOffset={nowOffset}
          msToPixels={msToPixels}
          SLOT_W={SLOT_W}

          // Scroll refs
          logoScrollRef={logoScrollRef}
          gridScrollRef={gridScrollRef}
          handleGridScroll={handleGridScroll}
          handleLogoScroll={handleLogoScroll}

          // Navigation state (passed down to EPGGrid and FilterBar)
          navZone={navZone}
          focusedChannelIndex={focusedChannelIndex}
          setFocusedChannelIndex={setFocusedChannelIndex}
          focusedFilterIndex={focusedFilterIndex}
          searchRef={searchRef}

          // Callbacks
          onNavZone={setNavZone}
          openGrid={openGrid}
        />
      </div>
    </>
  )
}
