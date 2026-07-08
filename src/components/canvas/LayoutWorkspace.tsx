import type { RoofPlane, PlaneResult } from '../../types'
import type { SheetProfile } from '../../utils/calculations'
import { RulerCanvas } from './RulerCanvas'
import { SheetLayout, computeSheetLayoutView } from '../visualization/SheetLayout'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  profile: SheetProfile
  selectedCol: number | null
  selectedEdge: number | null
  onSelectColumn: (colIndex: number) => void
  onSelectEdge: (edgeIndex: number) => void
}

export function LayoutWorkspace({ plane, result, profile, selectedCol, selectedEdge, onSelectColumn, onSelectEdge }: Props) {
  if (plane.points.length < 3 || result.columns.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Nincs megjeleníthető kiosztás.</div>
  }

  const view = computeSheetLayoutView(plane, result, profile)
  const originScreen = {
    x: view.ox - view.viewLeft * view.scale,
    y: view.oy + view.usedH,
  }

  return (
    <RulerCanvas
      pixelsPerMeterX={view.scale}
      pixelsPerMeterY={-view.scale}
      originScreen={originScreen}
      contentWidthPx={view.SVG_W}
      contentHeightPx={view.SVG_H}
    >
      <SheetLayout
        plane={plane}
        result={result}
        profile={profile}
        onSelectColumn={onSelectColumn}
        selectedCol={selectedCol}
        onSelectEdge={onSelectEdge}
        selectedEdge={selectedEdge}
        fontScale={1.4}
      />
    </RulerCanvas>
  )
}
