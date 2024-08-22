// @ts-ignore
import { BufferAttribute, BufferGeometry, Color, ColorRepresentation } from 'three'

import { clamp } from '../../../math/basics'

export function setVertexColor<G extends BufferGeometry>(geometry: G, color: ColorRepresentation, range: [startIndex: number, endIndex: number] = [0, -1]): G {
  const count = geometry.attributes.position.count

  // Compute indexes
  let [startIndex, endIndex] = range
  if (startIndex < 0) {
    startIndex += count + 1
  }
  if (endIndex < 0) {
    endIndex += count + 1
  }
  startIndex = clamp(startIndex, 0, count)
  endIndex = clamp(endIndex, 0, count)
  if (endIndex < startIndex) {
    endIndex = startIndex
  }

  const colorAtt = geometry.attributes.color ?? new BufferAttribute(new Float32Array(count * 3), 3)
  const { r, g, b } = new Color(color)
  for (let i = startIndex; i < endIndex; i++) {
    colorAtt.setXYZ(i, r, g, b)
  }
  geometry.setAttribute('color', colorAtt)

  return geometry
}
