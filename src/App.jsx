import { useEffect, useRef, useState } from 'react'
import Visualizer from './Visualizer'
import './App.css'

function App() {
  const [audioSrc, setAudioSrc] = useState('')
  const [fileName, setFileName] = useState('')
  const [objectUrl, setObjectUrl] = useState('')
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

  return (
    <main className="app">
      <Visualizer audioElement={audioRef} audioSrc={audioSrc} />

      <div className="card">
        <header className="card__header">
          <h1>Lecteur audio</h1>
          <p>Chargez votre fichier MP3 puis laissez la visualisation réagir à votre musique.</p>
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
      </div>
    </main>
  )
}

export default App
