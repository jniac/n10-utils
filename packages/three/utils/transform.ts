import { Object3D } from 'three'

export function resetTransform(current: Object3D, { resetMatrices = true } = {}) {
  current.position.set(0, 0, 0)
  current.rotation.set(0, 0, 0)
  current.scale.set(1, 1, 1)
  if (resetMatrices) {
    current.matrix.identity()
    current.matrixWorld.identity()
  }
}

export function copyTransform(current: Object3D, target: Object3D, { copyMatrices = true } = {}) {
  current.position.copy(target.position)
  current.rotation.copy(target.rotation)
  current.scale.copy(target.scale)
  if (copyMatrices) {
    current.matrix.copy(target.matrix)
    current.matrixWorld.copy(target.matrixWorld)
  }
}
