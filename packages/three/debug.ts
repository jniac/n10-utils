// @ts-ignore
import { Matrix4, PerspectiveCamera } from 'three'

export function matrixToString(m: Matrix4) {
  function f(x: number) {
    const s = x >= 0 ? ' ' : '-'
    const [f, d] = Math.abs(x).toFixed(10).split('.')
    return `${s}${f}.${d.slice(0, 6 - f.length)}`
  }
  const e = m.elements
  return `[
  ${f(e[0])}, ${f(e[4])}, ${f(e[8])}, ${f(e[12])},
  ${f(e[1])}, ${f(e[5])}, ${f(e[9])}, ${f(e[13])},
  ${f(e[2])}, ${f(e[6])}, ${f(e[10])}, ${f(e[14])},
  ${f(e[3])}, ${f(e[7])}, ${f(e[11])}, ${f(e[15])}
  ]`
}

export function viewToString(view: PerspectiveCamera['view']) {
  if (!view) return 'null'
  return `[
  fullWidth: ${view.fullWidth},
  fullHeight: ${view.fullHeight},
  offsetX: ${view.offsetX},
  offsetY: ${view.offsetY},
  width: ${view.width},
  height: ${view.height}
  ]`
}

export function getCameraInfo(camera: PerspectiveCamera) {
  const str = `Camera:
  aspect: ${camera.aspect}
  position: ${camera.position.toArray().join(', ')}
  view: ${viewToString(camera.view)}
  matrixWorld: ${matrixToString(camera.matrixWorld)}
  projectionMatrix: ${matrixToString(camera.projectionMatrix)}
  `
  console.log(str)
}
