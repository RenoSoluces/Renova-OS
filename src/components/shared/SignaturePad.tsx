import { useRef, useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
  height?: number
}

export function SignaturePad({ onChange, height = 220 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Adapter la résolution du canvas à sa taille affichée (netteté sur écran tactile haute densité)
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1a1a1a'
    }
  }, [])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    drawing.current = true
    lastPoint.current = getPoint(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const point = getPoint(e)
    if (ctx && lastPoint.current) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
    lastPoint.current = point
    if (empty) setEmpty(false)
  }

  function end() {
    drawing.current = false
    lastPoint.current = null
    const canvas = canvasRef.current
    if (canvas && !empty) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height, touchAction: 'none', cursor: 'crosshair',
          background: '#fff', border: '2px dashed var(--c-border)', borderRadius: 8,
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span className="text-sm text-muted">{empty ? 'Signez ici avec le doigt ou le stylet' : 'Signature capturée'}</span>
        <button className="btn btn-sm btn-secondary" onClick={clear} type="button">
          <RotateCcw size={14} /> Effacer
        </button>
      </div>
    </div>
  )
}
