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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setAudioSrc('')
      setFileName('')
      return
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

        {isMixerMode ? (
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
        ) : (
          <div className="player">
            <audio
              controls
              src={audioSrc}
              className="player__audio"
              disabled={!audioSrc}
              ref={audioRef}
            >
              Votre navigateur ne supporte pas la balise audio.
            </audio>
            {!audioSrc && <p className="player__placeholder">Ajoutez un fichier pour activer la lecture.</p>}
          </div>
        )}
      </div>
    </main>
  )
}

export default App
