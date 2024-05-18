// @ts-ignore
import { Color, ColorRepresentation } from 'three'

const _color = new Color()
export function vec3(color: ColorRepresentation) {
  _color.set(color)
  const { r, g, b } = _color
  return /* glsl */`vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`
}