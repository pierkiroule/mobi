import { useEffect, useRef, useState } from 'react'
import Visualizer from './Visualizer'
import './App.css'

function App() {
  const [audioSrc, setAudioSrc] = useState('')
  const [fileName, setFileName] = useState('')
  const [objectUrl, setObjectUrl] = useState('')
  const [isMixerMode, setIsMixerMode] = useState(false)
  const [fxControls, setFxControls] = useState({
    warp: 1.1,
    pulse: 1.1,
    colorShift: 0.55,
  })
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  useEffect(() => {
    let animationFrameId
    let audioContext
    let analyser
    let source

    const audioElement = audioRef.current
    const canvas = canvasRef.current

    if (!audioSrc || !audioElement || !canvas) {
      return undefined
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioContext = new AudioContextClass()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512

    source = audioContext.createMediaElementSource(audioElement)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const canvasContext = canvas.getContext('2d')

    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvasContext.resetTransform()
      canvasContext.scale(ratio, ratio)
    }

    resizeCanvas()
    const gradient = canvasContext.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#38bdf8')
    gradient.addColorStop(0.5, '#a855f7')
    gradient.addColorStop(1, '#f472b6')

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      canvasContext.clearRect(0, 0, canvas.width, canvas.height)
      const barCount = 80
      const step = Math.max(1, Math.floor(dataArray.length / barCount))
      const barWidth = canvas.width / barCount / (window.devicePixelRatio || 1)

      for (let i = 0; i < barCount; i += 1) {
        const slice = dataArray.slice(i * step, i * step + step)
        const value = slice.reduce((sum, current) => sum + current, 0) / slice.length || 0
        const barHeight = ((value / 255) * canvas.height) / 1.6 / (window.devicePixelRatio || 1)
        const x = i * barWidth
        const y = canvas.height / (window.devicePixelRatio || 1) - barHeight

        canvasContext.fillStyle = gradient
        canvasContext.fillRect(x, y, barWidth - 2, barHeight)
      }
    }

    const handlePlay = () => {
      audioContext.resume()
    }

    window.addEventListener('resize', resizeCanvas)
    audioElement.addEventListener('play', handlePlay)
    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      audioElement.removeEventListener('play', handlePlay)
      canvasContext.clearRect(0, 0, canvas.width, canvas.height)
      if (source) {
        source.disconnect()
      }
      if (analyser) {
        analyser.disconnect()
      }
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [audioSrc])

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
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    const newUrl = URL.createObjectURL(file)
    setAudioSrc(newUrl)
    setFileName(file.name)
    setObjectUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      return newUrl
    })
  }

  const updateSlider = (key) => (event) => {
    const value = parseFloat(event.target.value)
    setFxControls((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="app">
      <Visualizer audioElement={audioRef} audioSrc={audioSrc} fxControls={fxControls} />

      <div className="card">
        <header className="card__header">
          <div>
            <h1>Lecteur audio</h1>
            <p>Chargez votre MP3 puis mélangez les FX en temps réel.</p>
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
          <label htmlFor="audio-upload" className="upload__label">
            <span role="img" aria-hidden="true">⬆️</span> Importer un fichier MP3
          </label>
          <input
            id="audio-upload"
            type="file"
            accept="audio/mpeg,audio/mp3,audio/*"
            className="upload__input"
            onChange={handleFileChange}
          />
          <p className="upload__filename">
            {fileName ? `Fichier sélectionné : ${fileName}` : 'Aucun fichier sélectionné'}
          </p>
        </div>

        <div className={isMixerMode ? 'player player--concealed' : 'player'} aria-hidden={isMixerMode}>
          <audio
            controls
            src={audioSrc}
            className="player__audio"
            disabled={!audioSrc}
            ref={audioRef}
          >
            Votre navigateur ne supporte pas la balise audio.
          </audio>
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
