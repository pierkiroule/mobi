import { useEffect, useRef, useState } from 'react'
import Visualizer from './Visualizer'
import './App.css'

const lerp = (start, end, t) => start + (end - start) * t

function App() {
  const [audioSrc, setAudioSrc] = useState('')
  const [fileName, setFileName] = useState('')
  const [objectUrl, setObjectUrl] = useState('')
  const [isMixerMode, setIsMixerMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activePad, setActivePad] = useState(0)
  const [videoPads, setVideoPads] = useState([
    { name: 'Pad A', fileName: '', url: '' },
    { name: 'Pad B', fileName: '', url: '' },
    { name: 'Pad C', fileName: '', url: '' },
  ])
  const [fxControls, setFxControls] = useState({
    warp: 1.1,
    pulse: 1.1,
    colorShift: 0.55,
  })
  const audioRef = useRef(null)
  const videoRefs = useRef([null, null, null])

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

      videoPads.forEach((pad) => {
        if (pad.url) {
          URL.revokeObjectURL(pad.url)
        }
      })
    }
  }, [objectUrl, videoPads])

  useEffect(() => {
    const audioEl = audioRef.current
    if (!audioEl) return undefined

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audioEl.addEventListener('play', handlePlay)
    audioEl.addEventListener('pause', handlePause)
    audioEl.addEventListener('ended', handleEnded)

    return () => {
      audioEl.removeEventListener('play', handlePlay)
      audioEl.removeEventListener('pause', handlePause)
      audioEl.removeEventListener('ended', handleEnded)
    }
  }, [])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        setObjectUrl('')
      }

      setAudioSrc('')
      setFileName('')
      setIsPlaying(false)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    const newUrl = URL.createObjectURL(file)
    setAudioSrc(newUrl)
    setFileName(file.name)
    setIsPlaying(false)
    setObjectUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      return newUrl
    })
  }

  const handleVideoChange = (index) => (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const nextUrl = URL.createObjectURL(file)
    const videoElement = document.createElement('video')
    videoElement.src = nextUrl
    videoElement.loop = true
    videoElement.muted = true
    videoElement.playsInline = true
    videoElement.crossOrigin = 'anonymous'
    videoElement.play().catch(() => videoElement.pause())

    videoRefs.current[index] = videoElement
    setVideoPads((prev) => {
      const updated = [...prev]
      if (updated[index].url) {
        URL.revokeObjectURL(updated[index].url)
      }
      updated[index] = { ...updated[index], fileName: file.name, url: nextUrl }
      return updated
    })

    setActivePad(index)
    setFxControls((prev) => ({
      warp: Math.min(1.7, 0.8 + (index + 1) * 0.28),
      pulse: Math.min(1.9, prev.pulse + 0.15 + index * 0.08),
      colorShift: Math.max(0, Math.min(1, 0.35 + index * 0.18)),
    }))
  }

  const activatePad = (index) => {
    setActivePad(index)
    setFxControls((prev) => ({
      warp: lerp(prev.warp, 1 + index * 0.28, 0.65),
      pulse: lerp(prev.pulse, 1.05 + index * 0.25, 0.6),
      colorShift: lerp(prev.colorShift, 0.35 + index * 0.2, 0.7),
    }))
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const updateSlider = (key) => (event) => {
    const value = parseFloat(event.target.value)
    setFxControls((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="app">
      <div className="visualizer-shell">
        <div className="visualizer-mask" aria-hidden="true" />
        <Visualizer
          audioElement={audioRef}
          audioSrc={audioSrc}
          fxControls={fxControls}
          videoElements={[...videoRefs.current]}
          activePad={activePad}
        />
      </div>

      <div className="card">
        <header className="card__header">
          <div>
            <p className="eyebrow">VJing audioreactif</p>
            <h1>Orbe luminescente</h1>
            <p>Chargez votre MP3, tapotez les pads vidéo et laissez le mix rayonner dans le cercle.</p>
          </div>
          <div className="mode-toggle" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              className={!isMixerMode ? 'mode-toggle__button is-active' : 'mode-toggle__button'}
              onClick={() => setIsMixerMode(false)}
            >
              Lecteur
            </button>
            <button
              type="button"
              className={isMixerMode ? 'mode-toggle__button is-active' : 'mode-toggle__button'}
              onClick={() => setIsMixerMode(true)}
            >
              Mix FX
            </button>
          </div>
        </header>

        <div className="upload">
          <div className="upload__row">
            <div>
              <label htmlFor="audio-upload" className="upload__label">
                <span role="img" aria-hidden="true">⬆️</span> Importer votre MP3
              </label>
              <input
                id="audio-upload"
                type="file"
                accept="audio/mpeg,audio/mp3,audio/*"
                className="upload__input"
                onChange={handleFileChange}
              />
              <p className="upload__filename">
                {fileName ? `Sélectionné : ${fileName}` : 'Aucun MP3 pour l’instant'}
              </p>
            </div>

            <div className="player-chip" aria-live="polite">
              <p className="player-chip__label">Player masqué</p>
              <p className="player-chip__hint">Appuyez pour lancer / mettre en pause</p>
              <button
                type="button"
                className={isPlaying ? 'player-chip__button is-active' : 'player-chip__button'}
                onClick={togglePlay}
                disabled={!audioSrc}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
        </div>

        <audio src={audioSrc} ref={audioRef} className="sr-only" aria-hidden />

        <div className="pads" aria-label="Pads vidéo pour le mix">
          {videoPads.map((pad, index) => {
            const isActive = index === activePad
            const hasVideo = Boolean(pad.fileName)

            return (
              <div key={pad.name} className={isActive ? 'pad is-active' : 'pad'}>
                <div className="pad__top">
                  <div>
                    <p className="pad__eyebrow">{pad.name}</p>
                    <p className="pad__title">{hasVideo ? pad.fileName : 'Vidéo à importer'}</p>
                  </div>
                  <span className="pad__dot" aria-hidden />
                </div>

                <p className="pad__hint">Glissez une vidéo puis tapez pour mixer les FX.</p>

                <div className="pad__actions">
                  <label className="pad__upload" htmlFor={`pad-${index}-upload`}>
                    Charger
                    <input
                      id={`pad-${index}-upload`}
                      className="pad__upload-input"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange(index)}
                    />
                  </label>
                  <button
                    type="button"
                    className="pad__trigger"
                    onClick={() => activatePad(index)}
                    disabled={!hasVideo}
                  >
                    {isActive ? 'En live' : 'Mixer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {isMixerMode && (
          <div className="mixer" aria-label="Réglages des FX audioreactifs">
            <div className="slider">
              <div className="slider__label">Déformation organique</div>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.02}
                value={fxControls.warp}
                onChange={updateSlider('warp')}
              />
              <div className="slider__hint">Amplifie le tissage spatial des particules.</div>
            </div>
            <div className="slider">
              <div className="slider__label">Impulsion réactive</div>
              <input
                type="range"
                min={0.4}
                max={1.9}
                step={0.02}
                value={fxControls.pulse}
                onChange={updateSlider('pulse')}
              />
              <div className="slider__hint">Exagère l'impact audio sur les vagues.</div>
            </div>
            <div className="slider">
              <div className="slider__label">Virage chromatique</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={fxControls.colorShift}
                onChange={updateSlider('colorShift')}
              />
              <div className="slider__hint">Glisse de l'ambre chaud vers les bleus polaires.</div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
