import {
  BufferAttribute,
  BufferGeometry,
  Color
} from 'three'

/**
 * Helper function to set the color of a geometry.
 * 
 * - Handle both indexed and non-indexed geometries. 
 * - Creates a new color attribute if it doesn't exist / Updates if it already exists.
 * - Supports setting color for a specific group.
 */
export function setGeometryColor(
  geometry: BufferGeometry,
  color: Color,
  { groupIndex = -1 } = {}) {
  const position = geometry.attributes.position

  function getAttributeOrCreate() {
    const attribute = geometry.getAttribute('color')
    if (attribute) {
      return attribute
    } else {
      const array = new Float32Array(position.count * 3)
      const attribute = new BufferAttribute(array, 3)
      geometry.setAttribute('color', attribute)
      return attribute
    }
  }

  let start = 0, end = position.count * 3

  if (groupIndex !== -1) {
    const group = geometry.groups[groupIndex]
    start = group.start
    end = group.start + group.count
  }

  const attribute = getAttributeOrCreate()
  const { index } = geometry
  const array = attribute.array as Float32Array
  if (index) {
    // Indexed geometry
    const { array: indexArray } = index
    for (let i = start; i < end; i += 3) {
      for (let j = 0; j < 3; j++) {
        const vertexIndex = indexArray[i + j]
        color.toArray(array, vertexIndex * 3)
      }
    }
  } else {
    // Non-indexed geometry
    for (let i = start; i < end; i += 3) {
      color.toArray(array, (i + 0) * 3)
      color.toArray(array, (i + 1) * 3)
      color.toArray(array, (i + 2) * 3)
    }
  }
  attribute.needsUpdate = true
}
