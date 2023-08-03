import { BufferGeometry, Color, ColorRepresentation, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'

import { lazy } from '../../../lazy'
import { getGeometryTransformer } from '../tools/geometry-transformer'
import { setVertexColor } from '../utils/vertex-color'

type Params = Partial<{
  axis: 'x' | 'y' | 'z'
  length: number
  coneRatio: number
  radius: number
  radiusScale: number
  vertexColor: boolean
  color: ColorRepresentation
  sphereCap: boolean
}>

const local = lazy(() => {
  return {
    transform: getGeometryTransformer(),
    color: new Color(),
  }
})

function createAxisGeometry(params: Params = {}): BufferGeometry {
  const {
    transform,
    color,
  } = local()
  const colors = {
    'x': '#f33',
    'y': '#3c6',
    'z': '#36f',
  }
  const {
    axis = 'x',
    length = 1,
    radius = .015,
    coneRatio = .15,
    radiusScale = 1,
    vertexColor = true,
    sphereCap = true,
    color: colorArg = colors[axis]
  } = params

  const radialSegments = 8

  const r = radius * radiusScale

  const coneHeight = length * coneRatio
  const cone = new ConeGeometry(r * 3, coneHeight, radialSegments * 2)
  const cyl = new CylinderGeometry(r, r, 1, radialSegments * 2, 1, true)

  const cylLength = length - coneHeight
  const coneDistance = length - coneHeight * .5
  const cylDistance = cylLength * .5

  transform(cone, { x: coneDistance, rz: -90 })
  transform(cyl, { x: cylDistance, sy: cylLength, rz: -90 })

  const geometry = mergeGeometries([cone, cyl])

  if (sphereCap) {
    const sphere = new SphereGeometry(r, radialSegments, radialSegments, 0, Math.PI)
    transform(sphere, { rx: 360 / (radialSegments / 2) })
    transform(sphere, { ry: -90 })
    mergeGeometries([geometry, sphere])
  }

  if (vertexColor) {
    setVertexColor(geometry, color.set(colorArg))
  }

  switch (axis) {
    case 'y': {
      transform(geometry, { rz: 90 })
      break
    }
    case 'z': {
      transform(geometry, { ry: 90 })
      break
    }
  }

  return geometry
}

export type {
  Params as CreateAxisGeometryParams,
}

export {
  createAxisGeometry,
}