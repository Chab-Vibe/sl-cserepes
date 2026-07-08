import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'

interface RulerCanvasProps {
  // Előjeles: a Y tengely jellemzően negatív (a világ-Y felfelé nő, a
  // képernyő-Y lefelé) — lásd ShapePreviewSvg/SheetLayout toSvg/project.
  pixelsPerMeterX: number
  pixelsPerMeterY: number
  originScreen: { x: number; y: number }
  contentWidthPx: number
  contentHeightPx: number
  // Halvány, pontozott kurzor-pozíció jelölő kereszt (a vonalzókkal együtt
  // mozogva) — csak ott hasznos, ahol a felhasználó koordinátákat olvas le.
  showCrosshair?: boolean
  children: React.ReactNode
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 6
const RULER_SIZE = 22
const TICK_STEPS_M = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100]
const MIN_TICK_SPACING_PX = 44

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function niceStepMeters(absEffPixelsPerMeter: number): number {
  for (const step of TICK_STEPS_M) {
    if (step * absEffPixelsPerMeter >= MIN_TICK_SPACING_PX) return step
  }
  return TICK_STEPS_M[TICK_STEPS_M.length - 1]
}

interface Tick {
  m: number
  screen: number
}

function computeTicks(pixelsPerMeter: number, originAxis: number, zoom: number, pan: number, viewportSize: number): Tick[] {
  if (pixelsPerMeter === 0 || viewportSize <= 0) return []
  const effPpm = pixelsPerMeter * zoom
  const step = niceStepMeters(Math.abs(effPpm))
  const mAtScreen = (screen: number) => ((screen - pan) / zoom - originAxis) / pixelsPerMeter
  const m0 = mAtScreen(0)
  const m1 = mAtScreen(viewportSize)
  const lo = Math.floor(Math.min(m0, m1) / step) * step
  const hi = Math.max(m0, m1)
  const ticks: Tick[] = []
  for (let m = lo; m <= hi + step * 0.5; m += step) {
    const screen = pan + (originAxis + m * pixelsPerMeter) * zoom
    ticks.push({ m: Math.round(m * 1e6) / 1e6, screen })
  }
  return ticks
}

export function RulerCanvas({ pixelsPerMeterX, pixelsPerMeterY, originScreen, contentWidthPx, contentHeightPx, showCrosshair = false, children }: RulerCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number; dragging: boolean } | null>(null)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setViewportSize({ w: el.clientWidth, h: el.clientHeight })
    })
    observer.observe(el)
    setViewportSize({ w: el.clientWidth, h: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setZoom(prevZoom => {
        const newZoom = clamp(prevZoom * factor, MIN_ZOOM, MAX_ZOOM)
        setPan(prevPan => ({
          x: cursor.x - (cursor.x - prevPan.x) * (newZoom / prevZoom),
          y: cursor.y - (cursor.y - prevPan.y) * (newZoom / prevZoom),
        }))
        return newZoom
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y, dragging: false }
    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = ev.clientX - drag.startX
      const dy = ev.clientY - drag.startY
      if (!drag.dragging && Math.hypot(dx, dy) < 4) return
      drag.dragging = true
      setPan({ x: drag.startPanX + dx, y: drag.startPanY + dy })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const xTicks = useMemo(
    () => computeTicks(pixelsPerMeterX, originScreen.x, zoom, pan.x, viewportSize.w),
    [pixelsPerMeterX, originScreen.x, zoom, pan.x, viewportSize.w]
  )
  const yTicks = useMemo(
    () => computeTicks(pixelsPerMeterY, originScreen.y, zoom, pan.y, viewportSize.h),
    [pixelsPerMeterY, originScreen.y, zoom, pan.y, viewportSize.h]
  )

  const handleRootMouseMove = (e: React.MouseEvent) => {
    if (!showCrosshair) return
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }
  const handleRootMouseLeave = () => setCursorPos(null)

  return (
    <div
      ref={rootRef}
      onMouseMove={handleRootMouseMove}
      onMouseLeave={handleRootMouseLeave}
      className="relative w-full h-full min-h-0 select-none bg-white rounded-xl border border-slate-200 overflow-hidden"
    >
      {showCrosshair && cursorPos && (
        <>
          <div
            className="absolute top-0 bottom-0 w-0 border-l border-dashed border-blue-400/50 pointer-events-none z-30"
            style={{ left: cursorPos.x }}
          />
          <div
            className="absolute left-0 right-0 h-0 border-t border-dashed border-blue-400/50 pointer-events-none z-30"
            style={{ top: cursorPos.y }}
          />
        </>
      )}
      {/* Sarok */}
      <div
        className="absolute top-0 left-0 z-20 bg-slate-50 border-b border-r border-slate-200"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      {/* Felső vonalzó (mm) */}
      <div
        className="absolute top-0 z-10 bg-slate-50 border-b border-slate-200 overflow-hidden"
        style={{ left: RULER_SIZE, right: 0, height: RULER_SIZE }}
      >
        {xTicks.map(t => (
          <div key={t.m} className="absolute top-0 h-full border-l border-slate-300" style={{ left: t.screen }}>
            <span className="absolute top-0.5 left-1 text-[9px] text-slate-400 whitespace-nowrap">{Math.round(t.m * 1000)}</span>
          </div>
        ))}
      </div>
      {/* Bal vonalzó (mm) */}
      <div
        className="absolute left-0 z-10 bg-slate-50 border-r border-slate-200 overflow-hidden"
        style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
      >
        {yTicks.map(t => (
          <div key={t.m} className="absolute left-0 w-full border-t border-slate-300" style={{ top: t.screen }}>
            <span
              className="absolute left-0.5 top-0.5 text-[9px] text-slate-400 whitespace-nowrap origin-top-left"
              style={{ transform: 'rotate(-90deg) translateX(-100%)' }}
            >
              {Math.round(t.m * 1000)}
            </span>
          </div>
        ))}
      </div>

      {/* Pannolható/zoomolható vászon */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        className="absolute overflow-hidden cursor-grab active:cursor-grabbing bg-slate-50/40"
        style={{ top: RULER_SIZE, left: RULER_SIZE, right: 0, bottom: 0 }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: contentWidthPx,
            height: contentHeightPx,
          }}
        >
          {children}
        </div>
      </div>

      <button
        type="button"
        onClick={resetView}
        title="Nézet visszaállítása"
        className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 text-xs shadow-sm transition-colors"
      >
        <Maximize2 size={13} />
        {Math.round(zoom * 100)}%
      </button>
    </div>
  )
}
