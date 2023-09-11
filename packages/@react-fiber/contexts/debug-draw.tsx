import { BufferAttribute, BufferGeometry, Color, ColorRepresentation, Group, LineBasicMaterial, LineSegments, Vector3 } from 'three'
import { Vector3Declaration, solveVector3Declaration } from '../../three/declaration'
import { getUniqueId } from '@/n10-utils/misc/getUniqueId'
import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { useEffects } from '../../react/hooks'
import { clock } from '@/n10-utils/clock'

const debugDrawGroups: DebugDrawGroup[] = []
/** 
 * DebugDraw() is an accessor to the first instance of any DebugDrawGroup 
 * instances currently up. It assumes that somewhere a DebugDrawGroup has been
 * created, otherwise an error will be thrown.
 */
const DebugDraw = () => {
  if (debugDrawGroups.length > 0) {
    return debugDrawGroups[0]
  }
  throw new Error(`No DebugDrawGroup has been created. Make sure an instance exists before calling DebugDraw().`)
}
class DebugDrawGroup extends Group {
  private m = {
    currentId: -1,
    currentColor: new Color(),

    lineDirty: false,
    lineIndex: 0,
    linePoints: new Map<number, Vector3[]>(),
    lineColors: new Map<number, Color[]>(),
    lineSegments: new LineSegments(
      new BufferGeometry(),
      new LineBasicMaterial({ vertexColors: true })),
  }

  private getLinePointsAndColor(id: number): [points: Vector3[], colors: Color[]] {
    const points = this.m.linePoints.get(id)
    const colors = this.m.lineColors.get(id)
    if (points && colors) {
      return [points, colors]
    } else {
      const points: Vector3[] = []
      const colors: Color[] = []
      this.m.linePoints.set(id, points)
      this.m.lineColors.set(id, colors)
      return [points, colors]
    }
  }

  private updateLine(): void {
    if (this.m.lineDirty) {
      const points = [...this.m.linePoints.values()]
      const colors = [...this.m.lineColors.values()]
      const count = points.reduce((sum, arr) => sum + arr.length, 0)
      const positionAtt = new BufferAttribute(new Float32Array(count * 3), 3)
      const colorAtt = new BufferAttribute(new Float32Array(count * 3), 3)
      let index = 0
      for (let i = 0, imax = points.length; i < imax; i++) {
        const currentPoints = points[i]
        const currentColors = colors[i]
        for (let j = 0, jmax = currentPoints.length; j < jmax; j++) {
          const { x, y, z } = currentPoints[j]
          const { r, g, b } = currentColors[j]
          positionAtt.setXYZ(index, x, y, z)
          colorAtt.setXYZ(index, r, g, b)
          index++
        }
      }
      this.m.lineSegments.geometry.setAttribute('position', positionAtt)
      this.m.lineSegments.geometry.setAttribute('color', colorAtt)
      this.m.lineDirty = false
    }
  }

  constructor() {
    super()
    debugDrawGroups.push(this)
    this.add(this.m.lineSegments)
  }

  destroyed = false
  destroy = () => {
    const index = debugDrawGroups.indexOf(this)
    debugDrawGroups.splice(index, 1)
    this.destroyed = true
    this.destroy = () => {}
  }

  with(...args: any[]): this {
    this.m.currentId = getUniqueId(args.flat())
    this.m.currentColor.set('#fff')
    this.m.lineIndex = 0
    return this
  }

  color(color: ColorRepresentation): this {
    this.m.currentColor.set(color)
    return this
  }

  line(a: Vector3Declaration, b: Vector3Declaration): this {
    const pa = solveVector3Declaration(a)
    const pb = solveVector3Declaration(b)
    const color = this.m.currentColor.clone()
    const [points, colors] = this.getLinePointsAndColor(this.m.currentId)
    const index = this.m.lineIndex * 2
    if (index < points.length) {
      points[index + 0] = pa
      points[index + 1] = pb
      colors[index + 0] = color
      colors[index + 1] = color
    } else {
      points.push(pa)
      points.push(pb)
      colors.push(color)
      colors.push(color)
    }
    this.m.lineIndex++
    this.m.lineDirty = true
    return this
  }

  update() {
    this.updateLine()
  }
}

const DebugDrawContext = createContext<DebugDrawGroup>(null!)

function useDebugDraw(): DebugDrawGroup {
  return useContext(DebugDrawContext)
}

function DebugDrawProvider({ children }: PropsWithChildren) {
  const debugDraw = useMemo(() => new DebugDrawGroup(), [])
  useEffects(function* () {
    yield clock().onTick(() => {
      debugDraw.update()
    })
    yield debugDraw
  }, [])
  return (
    <DebugDrawContext.Provider value={debugDraw}>
      <primitive object={debugDraw} />
      {children}
    </DebugDrawContext.Provider>
  )
}

export type {
  DebugDrawGroup,
}

export {
  DebugDrawProvider,
  DebugDraw,
  useDebugDraw,
}
