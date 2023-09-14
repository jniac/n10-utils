import { Object3D } from 'three'

export function copyTransform(current: Object3D, target: Object3D, { copyMatrices = true } = {}) {
  current.position.copy(target.position)
  current.rotation.copy(target.rotation)
  current.scale.copy(target.scale)
  if (copyMatrices) {
    current.matrix.copy(target.matrix)
    current.matrixWorld.copy(target.matrixWorld)
  }
}
