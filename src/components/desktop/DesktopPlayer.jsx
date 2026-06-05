import { useEffect, useRef, useState, useCallback } from 'react'
import { useShakaPlayer, qualityLabel, langLabel } from '../../hooks/useShakaPlayer'
import { useDrag } from '@use-gesture/react'
import { Volume2, VolumeX, Maximize, Minimize, Star, PictureInPicture2, ChevronUp, ChevronDown, Subtitles, Languages, MonitorPlay, Server } from 'lucide-react'
import { FilterBar, FILTERS } from './FilterBar'
import { EPGGrid } from './EPGGrid'
import previewLogo from '../preview.webp'

const SLOT_W = 200

function usePiP(videoRef) {
  const [isPiP, setIsPiP] = useState(false)
  const ok = typeof document !== 'undefined' && !!document.pictureInPictureEnabled
  useEffect(() => {
    const on = () => setIsPiP(true), off = () => setIsPiP(false)
    document.addEventListener('enterpictureinpicture', on)
    document.addEventListener('leavepictureinpicture', off)
    return () => { document.removeEventListener('enterpictureinpicture', on); document.removeEventListener('leavepictureinpicture', off) }
  }, [])
  const toggle = useCallback(async () => {
    if (!videoRef.current || !ok) return
    try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await videoRef.current.requestPictureInPicture() } catch {}
  }, [videoRef, ok])
  return { isPiP, togglePiP: toggle, pipSupported: ok }
}

function Btn({ children, onClick, className = '', style }) {
  return (
    <button onClick={onClick} className={`outline-none transition-all duration-200 relative group overflow-hidden ${className}`} style={style}>
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </button>
  )
}

// ─── Menú flotante de pistas (subtítulos / audio / calidad / servidor) ────────
function TrackMenu({ title, options, onClose, isTV, isPortrait }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <div
      className={`absolute z-50 flex flex-col rounded-3xl glass-panel overflow-hidden ${
        isPortrait ? 'top-16 right-4 w-56' : isTV ? 'bottom-40 right-12 w-64' : 'bottom-28 right-8 w-60'
      }`}
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.1)' }}
    >
      <div className="px-4 pt-4 pb-2">
        <span className="text-white/60 text-xs font-bold uppercase tracking-[0.2em]">{title}</span>
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3 max-h-72 overflow-y-auto scrollbar-hide">
        {options.length === 0 && (
          <p className="text-white/30 text-xs text-center py-4">No hay opciones disponibles</p>
        )}
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => { opt.onSelect(); onClose() }}
            className={`w-full text-left px-4 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-between gap-3 ${
              opt.active ? 'bg-accent text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="truncate">{opt.label}</span>
            {opt.sublabel
              ? <span className={`text-xs font-normal shrink-0 ${opt.active ? 'text-black/50' : 'opacity-40'}`}>{opt.sublabel}</span>
              : opt.active && <div className="w-2 h-2 rounded-full bg-black/50 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DesktopPlayer(props) {
  const {
    selectedChannel, isFullscreen, gridVisible, setGridVisible, onToggleFullscreen,
    filteredChannels, nowOffset, activeFilter, currentProg, nextProg, progressPercent,
    showControls, isMuted, volume, onToggleMute, onVolumeChange, epgData,
    searchQuery, setSearchQuery, setActiveFilter, onChannelClick,
    now, startTime, timeSlots, msToPixels, SLOT_W: SW,
    gridScrollRef, logoScrollRef, handleGridScroll, handleLogoScroll,
    toggleFavorite, isFavorite, favoriteIds = [], typedNumber, isTV = false,
    navZone, focusedChannelIndex, setFocusedChannelIndex, focusedFilterIndex, searchRef,
  } = props

  const slotW = SW || SLOT_W
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth)
  const {
    videoRef, isLoading, error, retry, currentStreamIndex, changeStream,
    textTracks, activeTextTrack, toggleSubtitles,
    audioTracks, activeAudio, selectAudio,
    qualities, activeQuality, selectQuality,
  } = useShakaPlayer(selectedChannel)

  // 'subs' | 'audio' | 'quality' | 'server' | null
  const [openMenu, setOpenMenu] = useState(null)
  const { isPiP, togglePiP, pipSupported } = usePiP(videoRef)
  const scrollRef = useRef(null)
  const hasFav = favoriteIds.length > 0
  const visibleFilters = FILTERS.filter(f => f.id !== 'Favoritos' || hasFav)

  // Capacidades del canal actual — los iconos solo aparecen si el canal las ofrece
  const hasSubs    = textTracks.length > 0
  const hasAudios  = audioTracks.length > 1
  const hasQuality = qualities.length > 1
  const hasServers = selectedChannel?.urlAlt?.length > 0

  useEffect(() => { setOpenMenu(null) }, [selectedChannel])

  useEffect(() => {
    if (activeFilter === 'Favoritos' && favoriteIds.length === 0) setActiveFilter('Todos')
  }, [favoriteIds, activeFilter, setActiveFilter])

  useEffect(() => {
    const h = () => setIsPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('resize', h); if (scrollRef.current) clearTimeout(scrollRef.current) }
  }, [])

  useEffect(() => {
    if (videoRef.current) { videoRef.current.muted = isMuted; videoRef.current.volume = volume / 100 }
  }, [isMuted, volume, videoRef])

  const scrollToNow = useCallback(() => {
    if (gridScrollRef?.current && nowOffset && (gridVisible || isPortrait))
      gridScrollRef.current.scrollTo({ left: nowOffset - 100, behavior: 'smooth' })
  }, [gridScrollRef, nowOffset, gridVisible, isPortrait])

  useEffect(() => { scrollToNow() }, [nowOffset, gridVisible, isPortrait, scrollToNow])

  const bindPlayer = useDrag(({ last, direction: [, dy], distance: [, dist] }) => {
    if (!isPortrait && last && dy < 0 && dist > 40 && !gridVisible) setGridVisible(true)
  }, { axis: 'y', filterTaps: true })

  const bindDrawer = useDrag(({ last, direction: [, dy], distance: [, dist] }) => {
    if (!isPortrait && last && dy > 0 && dist > 40 && gridVisible && (!gridScrollRef.current || gridScrollRef.current.scrollTop === 0)) setGridVisible(false)
  }, { axis: 'y', filterTaps: true })

  const openTerms = () => window.dispatchEvent(new Event('open-terms'))

  const toggleMenu = (id) => setOpenMenu(m => (m === id ? null : id))

  // ─── Opciones del menú activo ──────────────────────────────────────────────
  let menuTitle = ''
  let menuOptions = []
  if (openMenu === 'audio') {
    menuTitle = 'Idioma de Audio'
    menuOptions = audioTracks.map((t, i) => ({
      key: `${t.language}-${t.label || ''}-${i}`,
      label: t.label || langLabel(t.language),
      sublabel: t.channelsCount === 6 ? '5.1' : (t.channelsCount > 2 ? `${t.channelsCount}ch` : ''),
      active: activeAudio?.language === t.language && (activeAudio?.label || '') === (t.label || ''),
      onSelect: () => selectAudio(t),
    }))
  } else if (openMenu === 'quality') {
    menuTitle = 'Calidad'
    menuOptions = [
      { key: 'auto', label: 'Automática', active: activeQuality === 'auto', onSelect: () => selectQuality('auto') },
      ...qualities.map((t, i) => ({
        key: t.id ?? i,
        label: qualityLabel(t),
        sublabel: t.bandwidth ? `${Math.round(t.bandwidth / 1000)}k` : '',
        active: activeQuality !== 'auto' && activeQuality?.height === t.height,
        onSelect: () => selectQuality(t),
      })),
    ]
  } else if (openMenu === 'server') {
    menuTitle = 'Servidor'
    menuOptions = [{ label: 'Servidor Principal', idx: -1 }, ...(selectedChannel?.urlAlt || []).map((_, i) => ({ label: `Servidor Alt. ${i + 1}`, idx: i }))].map(({ label, idx }) => ({
      key: idx,
      label,
      active: currentStreamIndex === idx,
      onSelect: () => changeStream(idx),
    }))
  }

  // ─── Iconos de pistas (se reutilizan en landscape y portrait) ──────────────
  const trackButtons = (size, btnClass, activeClass) => (
    <>
      {hasSubs && (
        <Btn onClick={toggleSubtitles} className={`${btnClass} ${activeTextTrack ? activeClass : ''}`}>
          <Subtitles size={size} />
        </Btn>
      )}
      {hasAudios && (
        <Btn onClick={() => toggleMenu('audio')} className={`${btnClass} ${openMenu === 'audio' ? activeClass : ''}`}>
          <Languages size={size} />
        </Btn>
      )}
      {hasQuality && (
        <Btn onClick={() => toggleMenu('quality')} className={`${btnClass} ${openMenu === 'quality' ? activeClass : ''}`}>
          <MonitorPlay size={size} />
        </Btn>
      )}
      {hasServers && (
        <Btn onClick={() => toggleMenu('server')} className={`${btnClass} ${openMenu === 'server' ? activeClass : ''}`}>
          <Server size={size} />
        </Btn>
      )}
    </>
  )

  // ─── Barra de info (landscape) ────────────────────────────────────────────
  const InfoBar = () => (
    <div className={`absolute flex justify-center w-full transition-all duration-500 ${showControls ? 'bottom-0 opacity-100' : '-bottom-10 opacity-0'} ${isTV ? 'pb-12 px-12' : 'pb-8 px-8'}`}>
      <div className={`w-full max-w-7xl flex items-center rounded-[32px] gap-6 glass-panel relative overflow-hidden ${isTV ? 'px-8 py-5 min-h-[100px]' : 'px-6 py-4 min-h-[84px]'}`}>

        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className={`flex items-center justify-center shrink-0 rounded-2xl bg-white/5 border border-white/10 ${isTV ? 'h-16 w-24 p-2' : 'h-14 w-20 p-2'}`}>
          {selectedChannel?.logo && <img src={selectedChannel.logo} decoding="async" draggable="false" className="max-h-full w-auto object-contain drop-shadow-md" />}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className={`font-bold text-white truncate tracking-tight ${isTV ? 'text-[22px]' : 'text-[18px]'}`}>
              {currentProg ? currentProg.title : <span className="text-txt-2 font-normal italic">Sin Información</span>}
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-1 w-full rounded-full overflow-hidden bg-accent/10 relative">
              <div className="h-full rounded-full transition-all duration-1000 ease-out bg-accent" style={{ width: `${progressPercent}%`, boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
            </div>
            <div className="flex justify-between items-center">
              {nextProg ? <p className={`text-txt-2 font-medium truncate ${isTV ? 'text-xs' : 'text-[11px]'}`}>Después: <span className="text-white">{nextProg.title}</span></p> : <div />}
              {currentProg && <span className={`text-txt-2 font-semibold tabular-nums tracking-wider whitespace-nowrap shrink-0 ${isTV ? 'text-xs' : 'text-[11px]'}`}>{new Date(currentProg.start).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})} - {new Date(currentProg.end).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>}
            </div>
          </div>
        </div>

        <div className="w-px h-12 bg-white/10 shrink-0" />

        {/* Controles */}
        <div className="flex items-center gap-2.5 shrink-0">
          {selectedChannel && (
            <Btn onClick={() => toggleFavorite(selectedChannel.id)}
              className={`p-3 rounded-2xl border ${isFavorite(selectedChannel.id) ? 'text-white border-white/40 bg-white/10' : 'text-txt-2 border-white/5 hover:text-white hover:border-white/20 hover:bg-white/5'}`}>
              <Star size={isTV ? 24 : 20} fill={isFavorite(selectedChannel.id) ? 'currentColor' : 'none'} />
            </Btn>
          )}

          {/* Iconos de pistas — solo los que el canal admite */}
          {trackButtons(
            isTV ? 24 : 20,
            'p-3 rounded-2xl border text-txt-2 border-white/5 hover:text-white hover:border-white/20 hover:bg-white/5',
            '!text-accent !border-accent/40 !bg-accent/10'
          )}

          {pipSupported && !isTV && (
            <Btn onClick={togglePiP} className={`p-3 rounded-2xl border ${isPiP ? 'text-white border-white/40 bg-white/10' : 'text-txt-2 border-white/5 hover:text-white hover:border-white/20 hover:bg-white/5'}`}>
              <PictureInPicture2 size={20} />
            </Btn>
          )}

          <div className="flex items-center p-1.5 rounded-2xl bg-white/5 border border-white/5 ml-2">
            <Btn onClick={onToggleMute} className="p-2 rounded-xl text-txt-2 hover:text-white hover:bg-white/5">
              {isMuted || volume === 0 ? <VolumeX size={isTV ? 24 : 20} /> : <Volume2 size={isTV ? 24 : 20} />}
            </Btn>
            <div className="relative w-20 h-1.5 rounded-full overflow-hidden mx-2 bg-black/40 shadow-inner">
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${volume}%`, boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
              <input type="range" min="0" max="100" value={volume} onChange={onVolumeChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            </div>
          </div>

          {!isTV && (
            <Btn onClick={() => onToggleFullscreen()} className="p-3 ml-2 rounded-2xl border border-white/5 text-txt-2 hover:text-white hover:border-white/20 bg-white/5">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </Btn>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 overflow-hidden outline-none flex flex-col touch-none bg-bg">

      {/* Portrait top bar */}
      {isPortrait && (
        <FilterBar visibleFilters={visibleFilters} activeFilter={activeFilter} setActiveFilter={setActiveFilter}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} isTV={isTV} isPortrait={true}
          onOpenTerms={openTerms}
          focusedFilterIndex={focusedFilterIndex}
          isFilterZone={navZone === 'filter'}
          searchRef={searchRef}
        />
      )}

      {/* Video Player */}
      <div {...(!isPortrait ? bindPlayer() : {})}
        className={`${isPortrait ? 'relative w-full aspect-video shrink-0 z-20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]' : 'absolute inset-0 z-0'} bg-black flex items-center justify-center overflow-hidden`}>

        {/* Error state — solo cuando el canal realmente falla */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'rgba(5, 5, 5, 0.92)' }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src={previewLogo} alt="" className="w-full h-full object-cover opacity-25 scale-105" />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-5 max-w-lg">
              <div className={`rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 ${isTV ? 'w-20 h-20' : 'w-16 h-16'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-red-400 ${isTV ? 'w-10 h-10' : 'w-8 h-8'}`}>
                  <path d="M3 3l18 18M10.5 6H19a2 2 0 012 2v8m-2.5 2.5H5a2 2 0 01-2-2V8a2 2 0 012-2h.5"/>
                </svg>
              </div>
              {selectedChannel?.logo && (
                <img src={selectedChannel.logo} alt="" className="h-10 w-auto object-contain opacity-50" />
              )}
              <h3 className={`text-white font-black uppercase tracking-widest ${isPortrait ? 'text-base' : isTV ? 'text-2xl' : 'text-xl'}`}>Señal No Disponible</h3>
              <p className={`text-white/50 font-medium leading-relaxed ${isPortrait ? 'text-xs' : isTV ? 'text-base' : 'text-sm'}`}>
                No se pudo cargar la señal en este momento. Probá otro canal o intentá de nuevo.
              </p>
              <button
                onClick={() => retry?.()}
                className={`mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent/10 border border-accent/30 text-accent font-semibold hover:bg-accent/20 transition-all ${isTV ? 'text-base' : 'text-sm'}`}
              >
                Reintentar
              </button>
              {isTV && <p className="text-white/20 text-xs tracking-widest uppercase mt-1">o presioná un canal diferente</p>}
            </div>
          </div>
        )}

        <video ref={videoRef} className="w-full h-full object-contain z-0 pointer-events-none" autoPlay playsInline muted />

        {/* Loader */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-sm gap-5">
            {selectedChannel?.logo && (
              <img src={selectedChannel.logo} alt="" className="h-14 w-auto object-contain opacity-50 mb-1" />
            )}
            <div className="relative flex items-center justify-center">
              <div className={`rounded-full border-2 border-accent/20 border-t-accent animate-spin ${isTV ? 'w-14 h-14' : 'w-10 h-10'}`} />
            </div>
            {selectedChannel && (
              <p className={`text-white/50 font-medium tracking-wide ${isTV ? 'text-base' : 'text-sm'}`}>
                {selectedChannel.name}
              </p>
            )}
          </div>
        )}

        {/* Zapping indicator */}
        {typedNumber && (
          <div className={`absolute top-8 right-8 z-[100] flex items-center gap-4 rounded-3xl glass-panel ${isTV ? 'px-8 py-4' : 'px-6 py-3'}`}>
            <div className="flex flex-col items-center">
              <span className={`text-txt-2 font-semibold uppercase tracking-[0.2em] ${isTV ? 'text-xs mb-1' : 'text-[10px]'}`}>Canal</span>
              <span className={`font-black text-white ${isTV ? 'text-6xl' : 'text-4xl'}`}>{typedNumber}</span>
            </div>
          </div>
        )}

        {/* Menú de pistas activo */}
        {openMenu && (
          <TrackMenu
            title={menuTitle}
            options={menuOptions}
            onClose={() => setOpenMenu(null)}
            isTV={isTV}
            isPortrait={isPortrait}
          />
        )}

        {/* Controls overlay */}
        <div className={`absolute inset-0 z-30 transition-all duration-500 pointer-events-auto ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {isPortrait && <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />}

          {isPortrait ? (
            <>
              <div className="absolute top-4 right-4 flex gap-2.5">
                {selectedChannel && <Btn onClick={() => toggleFavorite(selectedChannel.id)} className={`p-2.5 rounded-2xl glass-pill ${isFavorite(selectedChannel.id) ? 'text-white border-white/40' : 'text-white'}`}><Star size={16} fill={isFavorite(selectedChannel.id) ? 'currentColor' : 'none'} /></Btn>}
                {trackButtons(16, 'p-2.5 rounded-2xl glass-pill text-white', '!text-accent !border-accent/40')}
                {pipSupported && <Btn onClick={togglePiP} className={`p-2.5 rounded-2xl glass-pill ${isPiP ? 'text-white border-white/40' : 'text-white'}`}><PictureInPicture2 size={16} /></Btn>}
                <Btn onClick={onToggleMute} className="p-2.5 rounded-2xl glass-pill text-white">{isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</Btn>
              </div>
              <div className="absolute bottom-4 right-4">
                <Btn onClick={() => onToggleFullscreen()} className="p-2.5 rounded-2xl glass-pill text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</Btn>
              </div>
            </>
          ) : <InfoBar />}
        </div>

        {/* Drawer toggle button (landscape) */}
        {!isPortrait && (
          <div className="absolute top-0 left-0 right-0 h-16 flex justify-center items-start pt-4 z-40 pointer-events-none">
            <button onClick={() => setGridVisible(v => !v)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-accent transition-all duration-300 glass-pill hover:bg-accent/10 group pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-accent/20"
              style={{ opacity: showControls ? 1 : 0, transform: showControls ? 'translateY(0)' : 'translateY(-20px)' }}>
              {gridVisible ? <><ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" /> Ocultar Guía</> : <><ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform" /> Ver Guía</>}
            </button>
          </div>
        )}
      </div>

      {/* Portrait channel info */}
      {isPortrait && selectedChannel && (
        <div className="flex items-center gap-4 px-5 py-4 shrink-0 glass-panel border-x-0 border-b-0 relative z-10" style={{ borderRadius: 0 }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="w-14 h-14 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center bg-white/5 border border-white/10 p-1">
            {selectedChannel.logo && <img src={selectedChannel.logo} decoding="async" draggable="false" className="w-full h-full object-contain drop-shadow-md" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 gap-1.5 justify-center">
            <div className="flex flex-col">
              <span className="text-white text-[15px] font-bold truncate tracking-tight">{selectedChannel.name}</span>
              <span className="text-accent text-[11px] font-bold uppercase tracking-widest mt-0.5">{currentProg ? currentProg.title : 'Sin Información'}</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-accent/10 mt-1">
              <div className="h-full rounded-full transition-all duration-1000 ease-out bg-accent" style={{ width: `${progressPercent}%`, boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
            </div>
            {nextProg && (
              <p className="text-txt-2 text-[10px] font-medium truncate mt-1">
                Después: <span className="text-white">{nextProg.title}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* EPG Drawer */}
      <div {...(!isPortrait ? bindDrawer() : {})}
        className={`flex flex-col min-h-0 overflow-hidden ${isPortrait ? 'flex-1 relative z-10 bg-bg' : `absolute bottom-0 left-0 right-0 z-[110] h-[55vh] max-h-[500px] rounded-t-[32px] transition-transform duration-[500ms] ease-[cubic-bezier(0.25,1,0.5,1)] glass-panel border-b-0 border-x-0 ${gridVisible ? 'translate-y-0 shadow-[0_-30px_100px_rgba(0,0,0,0.8)]' : 'translate-y-full'}`}`}>

        {!isPortrait && (
          <div className="flex justify-center pt-4 pb-1.5 shrink-0 cursor-pointer group" onClick={() => setGridVisible(false)}>
            <div className="w-10 h-1 rounded-full bg-white/15 group-hover:bg-white/30 group-hover:w-14 transition-all duration-200" />
          </div>
        )}

        {!isPortrait && (
          <FilterBar visibleFilters={visibleFilters} activeFilter={activeFilter} setActiveFilter={setActiveFilter}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} isTV={isTV} isPortrait={false}
            onOpenTerms={openTerms}
            focusedFilterIndex={focusedFilterIndex}
            isFilterZone={navZone === 'filter'}
            searchRef={searchRef}
          />
        )}

        <EPGGrid
          filteredChannels={filteredChannels} epgData={epgData} selectedChannel={selectedChannel}
          onChannelClick={onChannelClick} now={now} startTime={startTime} timeSlots={timeSlots}
          msToPixels={msToPixels} SLOT_W={slotW} nowOffset={nowOffset}
          isPortrait={isPortrait} isTV={isTV} isFavorite={isFavorite}
          logoScrollRef={logoScrollRef} gridScrollRef={gridScrollRef}
          handleGridScroll={handleGridScroll} handleLogoScroll={handleLogoScroll}
          setGridVisible={setGridVisible} searchQuery={searchQuery} activeFilter={activeFilter}
          focusedChannelIndex={focusedChannelIndex}
          setFocusedChannelIndex={setFocusedChannelIndex}
          navZone={navZone}
        />
      </div>
    </div>
  )
}
