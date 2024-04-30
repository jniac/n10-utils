import { Color, ColorRepresentation } from 'three'

const _color = new Color()

/**
 * Facilitates the usage of the `Color` by reusing the same instance.
 * 
 * Usage with InstancedMesh:
 * ```
 * for (let i = 0; i < count; i++) {
 *   mesh.setColorAt(i, makeColor(i % 2 === 0 ? 'red' : 'blue'))
 * }
 * ```
 */
export function makeColor(arg: ColorRepresentation, out: Color = _color) {
  return out.set(arg)
}
