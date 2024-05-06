// @ts-ignore
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
export function makeColor(arg: ColorRepresentation, out?: Color): Color
export function makeColor(r: number, g: number, b: number, out?: Color): Color
export function makeColor(...args: any[]) {
  if (typeof args[0] === 'number') {
    const [r, g, b, out = _color] = args
    return out.setRGB(r, g, b)
  }
  const [arg, out = _color] = args
  return out.set(arg)
}
