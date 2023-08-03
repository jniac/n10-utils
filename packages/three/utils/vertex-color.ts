import { BufferAttribute, BufferGeometry, Color } from 'three'

export const setVertexColor = (geometry: BufferGeometry, { r, g, b }: Color) => {
  const count = geometry.attributes.position.count
  const color = new BufferAttribute(new Float32Array(count * 3), 3)
  for (let i = 0; i < count; i++) {
    color.setXYZ(i, r, g, b)
  }
  geometry.setAttribute('color', color)
}
