import { useEffect, useRef } from 'react'
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'

const lerp = (start, end, t) => start + (end - start) * t

const buildFieldGeometry = () => {
  const columns = 120
  const rows = 70
  const separation = 0.12
  const positions = new Float32Array(columns * rows * 3)
  const colors = new Float32Array(columns * rows * 3)

  let i = 0
  let c = 0
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const offsetX = (x - columns / 2) * separation
      const offsetY = (y - rows / 2) * separation

      positions[i] = offsetX
      positions[i + 1] = offsetY * 0.72
      positions[i + 2] = 0

      const color = new THREE.Color()
      color.setHSL(0.58, 0.6, 0.45)
      colors[c] = color.r
      colors[c + 1] = color.g
      colors[c + 2] = color.b

      i += 3
      c += 3
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  return geometry
}

const createAnalyser = (audioElement) => {
  if (!audioElement) return null

  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.85

  const source = audioContext.createMediaElementSource(audioElement)
  source.connect(analyser)
  analyser.connect(audioContext.destination)

  const dataArray = new Uint8Array(analyser.frequencyBinCount)

  const resume = () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
  }

  audioElement.addEventListener('play', resume)

  return {
    audioContext,
    analyser,
    dataArray,
    cleanup: () => {
      audioElement.removeEventListener('play', resume)
      source.disconnect()
      analyser.disconnect()
      audioContext.close()
    },
  }
}

const Visualizer = ({ audioElement, audioSrc, fxControls }) => {
  const containerRef = useRef(null)
  const rendererRef = useRef(null)
  const frameRef = useRef(0)
  const analyserRef = useRef(null)
  const basePositionsRef = useRef(null)
  const controlsRef = useRef({ warp: 1.1, pulse: 1.1, colorShift: 0.55 })

  useEffect(() => {
    controlsRef.current = fxControls
  }, [fxControls])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050910, 0.18)

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      250,
    )
    camera.position.set(0, 2.2, 5.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    const geometry = buildFieldGeometry()
    const positions = geometry.getAttribute('position').array
    basePositionsRef.current = new Float32Array(positions)

    const material = new THREE.PointsMaterial({
      size: 0.035,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    const points = new THREE.Points(geometry, material)
    points.rotation.x = -0.78
    scene.add(points)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    const warmLight = new THREE.DirectionalLight(0xffc7a2, 0.7)
    warmLight.position.set(-2, 3, 2)
    const coolLight = new THREE.DirectionalLight(0x8ec5ff, 0.65)
    coolLight.position.set(2.5, 2.5, 1.2)
    scene.add(ambientLight, warmLight, coolLight)

    const clock = new THREE.Clock()
    const color = new THREE.Color()
    let reactiveLevel = 0

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const controls = controlsRef.current || { warp: 1.1, pulse: 1.1, colorShift: 0.55 }

      const analyserData = analyserRef.current
      if (analyserData) {
        analyserData.analyser.getByteFrequencyData(analyserData.dataArray)
        const sum = analyserData.dataArray.reduce((acc, value) => acc + value, 0)
        const energy = sum / analyserData.dataArray.length / 255
        reactiveLevel = lerp(reactiveLevel, energy * (0.8 + controls.pulse * 0.7), 0.08)
      } else {
        reactiveLevel = lerp(reactiveLevel, 0, 0.05)
      }

      const posArray = geometry.getAttribute('position').array
      const colorArray = geometry.getAttribute('color').array
      const basePositions = basePositionsRef.current
      const warp = 0.6 + controls.warp * 0.7
      const pulseIntensity = 0.45 + controls.pulse * 0.55
      const colorBias = (controls.colorShift - 0.5) * 0.6
      const sway = Math.sin(elapsed * 0.35 * warp) * 0.32

      for (let i = 0; i < posArray.length; i += 3) {
        const baseX = basePositions[i]
        const baseY = basePositions[i + 1]

        const ribbon =
          Math.sin(baseX * 0.65 * warp + elapsed * (0.7 + warp * 0.4)) * 0.2 * warp +
          Math.cos(baseY * 0.75 * warp - elapsed * (0.8 + warp * 0.35)) * 0.16 * warp
        const pulse = Math.sin((baseX + baseY) * 1.1 + elapsed * 2.4) * reactiveLevel * pulseIntensity
        const depth = ribbon + pulse + sway * 0.45

        posArray[i] = baseX * (1.0 + reactiveLevel * 0.18 * warp)
        posArray[i + 1] =
          baseY * 0.94 + Math.sin(elapsed * 0.3 * warp + baseX * 0.45) * (0.05 + warp * 0.015)
        posArray[i + 2] = depth

        const altitude = THREE.MathUtils.clamp((depth + 1.4) / 3, 0, 1)
        const warmthBase = 0.52 + colorBias
        const warmth =
          warmthBase + reactiveLevel * (0.3 + controls.pulse * 0.2) + Math.sin(elapsed * 0.12 + baseX * 0.1) * 0.06
        color.setHSL(THREE.MathUtils.clamp(warmth, 0, 1), 0.67, 0.35 + altitude * (0.18 + colorBias * 0.18))

        colorArray[i] = color.r
        colorArray[i + 1] = color.g
        colorArray[i + 2] = color.b
      }

      geometry.getAttribute('position').needsUpdate = true
      geometry.getAttribute('color').needsUpdate = true

      const parallax = Math.sin(elapsed * 0.2) * 0.35
      camera.position.x = parallax * 0.65
      camera.position.y = 2 + reactiveLevel * 0.8
      camera.lookAt(0, 0.3, 0)

      renderer.render(scene, camera)
    }

    const handleResize = () => {
      if (!rendererRef.current) return
      const { clientWidth, clientHeight } = container
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      rendererRef.current.setSize(clientWidth, clientHeight)
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      container.removeChild(renderer.domElement)
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!audioSrc || !audioElement?.current) {
      if (analyserRef.current) {
        analyserRef.current.cleanup()
        analyserRef.current = null
      }
      return undefined
    }

    analyserRef.current?.cleanup()
    analyserRef.current = createAnalyser(audioElement.current)

    return () => {
      analyserRef.current?.cleanup()
      analyserRef.current = null
    }
  }, [audioElement, audioSrc])

  return <div className="visualizer" ref={containerRef} aria-hidden="true" />
}

export default Visualizer
