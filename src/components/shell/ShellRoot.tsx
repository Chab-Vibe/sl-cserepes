import { useEffect, useState } from 'react'
import type { RoofPlane, PlaneResult, OrderGroup, AccessoryGroup } from '../../types'
import { useStore } from '../../store/useStore'
import { SHEET_PROFILES, isPlaneValid } from '../../utils/calculations'
import { Ribbon } from './Ribbon'
import { TreeNav } from './TreeNav'
import { ShapeWorkspace } from '../canvas/ShapeWorkspace'
import { LayoutWorkspace } from '../canvas/LayoutWorkspace'
import { LayoutContextPanel } from '../canvas/LayoutContextPanel'
import { SummaryWorkspace } from '../canvas/SummaryWorkspace'
import { PlaneMetaControls } from '../planes/PlaneMetaControls'
import { PointsTable } from '../planes/PointsTable'
import { CustomerInfoForm } from '../customer/CustomerInfoForm'
import { ResultsSummary } from '../results/ResultsSummary'
import { ResultsTable } from '../results/ResultsTable'
import { AccessoriesSummary } from '../results/AccessoriesSummary'

interface Props {
  results: PlaneResult[]
  groups: OrderGroup[]
  accessoryGroups: AccessoryGroup[]
}

export function ShellRoot({ results, groups, accessoryGroups }: Props) {
  const planes = useStore(s => s.planes)
  const sheetType = useStore(s => s.sheetType)
  const activePlaneId = useStore(s => s.activePlaneId)
  const viewMode = useStore(s => s.viewMode)
  const updatePlane = useStore(s => s.updatePlane)

  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null)

  useEffect(() => {
    setSelectedCol(null)
    setSelectedEdge(null)
  }, [activePlaneId])

  const profile = SHEET_PROFILES[sheetType]
  const activePlane: RoofPlane | null = activePlaneId ? planes.find(p => p.id === activePlaneId) ?? null : null
  const activeValid = activePlane ? isPlaneValid(activePlane) : false
  const activeResult = activePlane ? results.find(r => r.planeId === activePlane.id) ?? null : null

  const onChangeActivePlane = (patch: Partial<RoofPlane>) => {
    if (activePlaneId) updatePlane(activePlaneId, patch)
  }

  const selectColumn = (colIndex: number) => {
    setSelectedEdge(null)
    setSelectedCol(prev => prev === colIndex ? null : colIndex)
  }
  const selectEdge = (edgeIndex: number) => {
    setSelectedCol(null)
    setSelectedEdge(prev => prev === edgeIndex ? null : edgeIndex)
  }

  return (
    <div className="flex flex-col gap-3 h-dvh p-3 print:hidden">
      <Ribbon />

      <div className="flex-1 min-h-0 grid grid-cols-[240px_1fr_320px] gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-2 min-h-0 overflow-y-auto">
          <TreeNav onOpenCustomerInfo={() => setCustomerFormOpen(true)} />
        </div>

        <div className="min-h-0">
          {!activePlane ? (
            <div className="h-full rounded-2xl bg-white border border-slate-200 shadow-sm">
              <SummaryWorkspace hasPlanes={planes.length > 0} />
            </div>
          ) : !activeValid ? (
            <div className="flex items-center justify-center h-full text-center text-amber-600 text-sm bg-white rounded-2xl border border-amber-200 p-8">
              Adj meg legalább 3 pontot a sokszöghöz a jobb oldali táblázatban.
            </div>
          ) : viewMode === 'shape' ? (
            <ShapeWorkspace points={activePlane.points} onChange={pts => onChangeActivePlane({ points: pts })} />
          ) : activeResult ? (
            <LayoutWorkspace
              plane={activePlane}
              result={activeResult}
              profile={profile}
              selectedCol={selectedCol}
              selectedEdge={selectedEdge}
              onSelectColumn={selectColumn}
              onSelectEdge={selectEdge}
            />
          ) : null}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3.5 min-h-0 overflow-y-auto">
          {!activePlane ? (
            <div className="space-y-3">
              <ResultsSummary groups={groups} profile={profile} />
              <ResultsTable results={results} profile={profile} />
              <AccessoriesSummary groups={accessoryGroups} />
            </div>
          ) : viewMode === 'shape' ? (
            <div className="space-y-4">
              <PlaneMetaControls plane={activePlane} profile={profile} onChange={onChangeActivePlane} />
              <div className="pt-3 border-t border-slate-100">
                <div className="text-slate-400 text-xs mb-1.5">Pontok</div>
                <PointsTable points={activePlane.points} onChange={pts => onChangeActivePlane({ points: pts })} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <PlaneMetaControls plane={activePlane} profile={profile} onChange={onChangeActivePlane} />
              {activeResult && (
                <LayoutContextPanel
                  plane={activePlane}
                  result={activeResult}
                  profile={profile}
                  selectedCol={selectedCol}
                  selectedEdge={selectedEdge}
                  onChange={onChangeActivePlane}
                  onCloseCol={() => setSelectedCol(null)}
                  onCloseEdge={() => setSelectedEdge(null)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <CustomerInfoForm open={customerFormOpen} onClose={() => setCustomerFormOpen(false)} />
    </div>
  )
}
