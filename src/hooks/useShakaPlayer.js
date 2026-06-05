import { useEffect, useRef, useState, useCallback } from 'react'
import shaka from 'shaka-player/dist/shaka-player.compiled'

// ─── Shaka config optimizada para IPTV ────────────────────────────────────────
const SHAKA_CONFIG = {
  preferredAudioLanguage: 'es-419',
  streaming: {
    bufferingGoal: 4,
    rebufferingGoal: 1.5,
    bufferBehind: 8,
    lowLatencyMode: true,
    alwaysStreamText: true,
    stallEnabled: true,
    stallThreshold: 2,
    stallSkip: 0.1,
    retryParameters: {
      maxAttempts: 1,
      baseDelay: 500,
      backoffFactor: 1,
      fuzzFactor: 0,
      timeout: 8000,
    },
  },
  manifest: {
    retryParameters: {
      maxAttempts: 1,
      baseDelay: 500,
      backoffFactor: 1,
      fuzzFactor: 0,
      timeout: 8000,
    },
  },
  drm: { clearKeys: {} },
}

function isAuthError(e) {
  if (!e) return false
  const status = e?.data?.[1]
  if (status === 401 || status === 403) return true
  const msg = String(e?.message || e?.data?.[0] || '')
  return msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')
}

// ─── Etiquetas legibles (exportadas para la UI) ───────────────────────────────
export function qualityLabel(track) {
  if (!track || track === 'auto') return 'Automática'
  if (track.height) return `${track.height}p`
  if (track.bandwidth) return `${Math.round(track.bandwidth / 1000)} kbps`
  return 'Desconocida'
}

export function langLabel(lang) {
  if (!lang) return 'Desconocido'
  const base = lang.toLowerCase().split('-')[0]
  const map = {
    es: 'Español', en: 'Inglés', pt: 'Português', fr: 'Français',
    de: 'Deutsch', it: 'Italiano', ja: 'Japonés', ko: 'Coreano',
    zh: 'Chino', ru: 'Ruso', ar: 'Árabe', und: 'Predeterminado', mul: 'Múltiple',
  }
  return map[lang.toLowerCase()] || map[base] || lang.toUpperCase()
}

export function useShakaPlayer(channel) {
  const videoRef   = useRef(null)
  const playerRef  = useRef(null)
  const loadIdRef  = useRef(0)

  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentStreamIndex, setCurrentStreamIndex] = useState(-1)

  const [textTracks, setTextTracks]           = useState([])
  const [activeTextTrack, setActiveTextTrack] = useState(null)
  const [audioTracks, setAudioTracks]         = useState([])  // [{ language, role }]
  const [activeAudio, setActiveAudio]         = useState(null) // { language, role }
  const [qualities, setQualities]             = useState([])  // variant tracks (1 por resolución)
  const [activeQuality, setActiveQuality]     = useState('auto') // 'auto' | variant track

  // ─── Refrescar SOLO la lista de opciones disponibles (no la selección activa) ──
  // La selección activa la maneja el usuario; los eventos de fondo de Shaka
  // (adaptation) no deben pisar lo que el usuario eligió.
  const refreshTrackLists = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    try {
      // Subtítulos disponibles (Shaka 5: TextTrack[])
      setTextTracks(player.getTextTracks() || [])

      // Audio disponible (Shaka 5: AudioTrack[], ya viene deduplicado por idioma/rol)
      setAudioTracks(player.getAudioTracks() || [])

      // Calidad de video (Shaka 5: VideoTrack[]), una entrada por resolución
      const videos = player.getVideoTracks() || []
      const byHeight = new Map()
      for (const v of videos) {
        if (!v.height) continue
        const cur = byHeight.get(v.height)
        if (!cur || (v.bandwidth || 0) > (cur.bandwidth || 0)) byHeight.set(v.height, v)
      }
      const quals = [...byHeight.values()].sort((a, b) => (b.height || 0) - (a.height || 0))
      setQualities(quals)
    } catch (err) {
      console.warn('refreshTrackLists error:', err)
    }
  }, [])

  // ─── Init player (una sola vez) ───────────────────────────────────────────
  useEffect(() => {
    shaka.polyfill.installAll()
    if (!shaka.Player.isBrowserSupported()) { setError('Browser not supported'); return }

    const init = async () => {
      if (playerRef.current) { await playerRef.current.destroy(); playerRef.current = null }
      if (!videoRef.current) return
      const player = new shaka.Player()
      await player.attach(videoRef.current)
      playerRef.current = player
      player.configure(SHAKA_CONFIG)
      player.addEventListener('error', (event) => {
        if (event.detail?.severity === 2) {
          console.warn('Shaka critical error:', event.detail.code, event.detail.data?.[1])
        }
      })
      // Solo refrescar la LISTA de opciones cuando Shaka descubre pistas nuevas
      player.addEventListener('trackschanged', refreshTrackLists)
      setPlayerReady(true) // dispara la carga del canal inicial
    }

    const t = setTimeout(init, 50)
    return () => {
      clearTimeout(t)
      loadIdRef.current++
      setPlayerReady(false)
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null }
    }
  }, [refreshTrackLists])

  // ─── Carga del canal (también dispara la carga inicial cuando el player queda listo) ──
  useEffect(() => {
    if (playerReady && playerRef.current && channel) loadChannel(channel)
  }, [channel, playerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cargar canal ─────────────────────────────────────────────────────────
  const loadChannel = async (ch, altIndex = -1, isManual = false) => {
    if (!playerRef.current) return

    const myId = ++loadIdRef.current
    setIsLoading(true)
    setError(null)
    setCurrentStreamIndex(altIndex)
    // Resetear pistas del canal anterior
    setTextTracks([]); setActiveTextTrack(null)
    setAudioTracks([]); setActiveAudio(null)
    setQualities([]); setActiveQuality('auto')

    if (myId !== loadIdRef.current) return

    let url = ch.url
    let altObj = null
    if (altIndex >= 0 && ch.urlAlt?.length > altIndex) {
      altObj = ch.urlAlt[altIndex]; url = altObj.url
    } else if (altIndex === -1 && !ch.url && ch.urlAlt?.length > 0) {
      altObj = ch.urlAlt[0]; url = altObj.url; altIndex = 0
    }

    if (!url) {
      if (myId === loadIdRef.current) { setError(new Error('Sin URL')); setIsLoading(false) }
      return
    }

    try {
      const currentDrm     = altObj?.drm     || ch.drm
      const currentHeaders = altObj?.headers || null

      const net = playerRef.current.getNetworkingEngine()
      net.clearAllRequestFilters()

      if (currentHeaders) {
        const forbidden = new Set(['origin', 'referer', 'host', 'user-agent', 'keep-alive', 'content-length'])
        net.registerRequestFilter((type, request) => {
          if (type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
              type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
            for (const [k, v] of Object.entries(currentHeaders)) {
              if (!forbidden.has(k.toLowerCase())) request.headers[k] = v
            }
          }
        })
      }

      net.registerResponseFilter((type, response) => {
        if (response.status === 404) {
          console.error('Abortando por 404:', response.uri)
          throw new shaka.util.Error(
            shaka.util.Error.Severity.CRITICAL,
            shaka.util.Error.Category.NETWORK,
            shaka.util.Error.Code.HTTP_ERROR,
            response.uri, response.status
          )
        }
      })

      // ABR activado por defecto (calidad automática)
      playerRef.current.configure({
        ...SHAKA_CONFIG,
        abr: { enabled: true },
        ...(currentDrm?.keyId && currentDrm?.key
          ? { drm: { clearKeys: { [currentDrm.keyId]: currentDrm.key } } }
          : { drm: { clearKeys: {} } }
        ),
      })

      await playerRef.current.load(url)
      if (myId !== loadIdRef.current) return

      // Lectura inicial de las listas (los eventos refrescarán si llegan más tarde)
      refreshTrackLists()

      // Selección activa inicial: subs OFF, audio = pista activa, calidad = auto
      try { playerRef.current.selectTextTrack(null) } catch (_) {}
      setActiveTextTrack(null)
      setActiveQuality('auto')
      const audios = playerRef.current.getAudioTracks() || []
      setActiveAudio(audios.find(a => a.active) || audios[0] || null)

      const videos = playerRef.current.getVideoTracks() || []
      console.log(`✓ ${ch.name}${altIndex >= 0 ? ` [Alt ${altIndex + 1}]` : ''} — audios:${audios.length} resoluciones:${new Set(videos.map(v => v.height).filter(Boolean)).size} subs:${(playerRef.current.getTextTracks() || []).length}`)

    } catch (e) {
      if (myId !== loadIdRef.current) return
      const authFail = isAuthError(e)
      console.warn(`✗ ${ch.name} ${authFail ? '[401]' : '[error]'}:`, e?.code || e?.message)

      const nextAlt = altIndex === -1 ? 0 : altIndex + 1
      const hasNextAlt = ch.urlAlt?.length > nextAlt
      if (!isManual && !authFail && hasNextAlt) {
        console.log(`→ Fallback a Alt ${nextAlt + 1} para ${ch.name}`)
        await loadChannel(ch, nextAlt)
        return
      }
      setError(e)
      window.dispatchEvent(new Event('check-status'))
    } finally {
      if (myId === loadIdRef.current) setIsLoading(false)
    }
  }

  const retry        = () => { if (channel) loadChannel(channel) }
  const changeStream = (index) => { if (channel) loadChannel(channel, index, true) }

  // ─── Subtítulos (Shaka 5: selectTextTrack + setTextVisibility) ───────────────
  const selectTextTrack = (track) => {
    const player = playerRef.current
    if (!player) return
    try {
      // Shaka 5: selectTextTrack(track) muestra la pista; selectTextTrack(null) la oculta
      player.selectTextTrack(track || null)
      setActiveTextTrack(track || null)
    } catch (err) { console.warn('selectTextTrack error:', err) }
  }

  // ─── Toggle de subtítulos: activa español (o la primera pista) o los apaga ───
  const toggleSubtitles = () => {
    const player = playerRef.current
    if (!player) return
    if (activeTextTrack) {
      selectTextTrack(null)
      return
    }
    const tracks = player.getTextTracks() || []
    if (tracks.length === 0) return
    const es = tracks.find(t => (t.language || '').toLowerCase().startsWith('es')) || tracks[0]
    selectTextTrack(es)
  }

  // ─── Idioma de audio (Shaka 5: selectAudioTrack con el objeto AudioTrack) ────
  const selectAudio = (track) => {
    const player = playerRef.current
    if (!player) return
    try {
      player.selectAudioTrack(track)
      setActiveAudio(track)
    } catch (err) { console.warn('selectAudio error:', err) }
  }

  // ─── Calidad de video (Shaka 5: selectVideoTrack / ABR) ──────────────────────
  const selectQuality = (track) => {
    const player = playerRef.current
    if (!player) return
    try {
      if (track === 'auto') {
        player.configure({ abr: { enabled: true } })
        setActiveQuality('auto')
      } else {
        player.configure({ abr: { enabled: false } })
        player.selectVideoTrack(track, true)
        setActiveQuality(track)
      }
    } catch (err) { console.warn('selectQuality error:', err) }
  }

  return {
    videoRef, isLoading, error, retry, currentStreamIndex, changeStream,
    textTracks, activeTextTrack, toggleSubtitles,
    audioTracks, activeAudio, selectAudio,
    qualities, activeQuality, selectQuality,
  }
}
