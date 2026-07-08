import { useState } from 'react'
import { RulerCanvas } from './RulerCanvas'
import { ShapePreviewSvg, getShapeExtent, getShapeScale, SHAPE_CANVAS_W, SHAPE_CANVAS_H, SHAPE_CANVAS_PAD, type ShapeExtent } from './ShapePreviewSvg'

interface Props {
  points: [number, number][]
  onChange?: (points: [number, number][]) => void
}

const DH = SHAPE_CANVAS_H - SHAPE_CANVAS_PAD.top - SHAPE_CANVAS_PAD.bottom

export function ShapeWorkspace({ points, onChange }: Props) {
  // Húzás közben "befagyasztott" nézet — lásd ShapePreviewSvg megjegyzését.
  // Ez itt, a szülőben él, hogy a RulerCanvas vonalzói és a ShapePreviewSvg
  // rajza mindig ugyanazt a nézetet lássák, sose csússzanak szét.
  const [frozenView, setFrozenView] = useState<{ ext: ShapeExtent; scale: number } | null>(null)

  const liveExt = getShapeExtent(points)
  const liveScale = getShapeScale(liveExt)
  const ext = frozenView?.ext ?? liveExt
  const scale = frozenView?.scale ?? liveScale

  const originScreen = {
    x: SHAPE_CANVAS_PAD.left - ext.minX * scale,
    y: SHAPE_CANVAS_PAD.top + DH + ext.minY * scale,
  }

  const handleDragStateChange = (dragging: boolean) => {
    setFrozenView(dragging ? { ext: liveExt, scale: liveScale } : null)
  }

  return (
    <RulerCanvas
      pixelsPerMeterX={scale}
      pixelsPerMeterY={-scale}
      originScreen={originScreen}
      contentWidthPx={SHAPE_CANVAS_W}
      contentHeightPx={SHAPE_CANVAS_H}
      showCrosshair
    >
      <ShapePreviewSvg points={points} ext={ext} scale={scale} onChange={onChange} onDragStateChange={handleDragStateChange} />
    </RulerCanvas>
  )
}
