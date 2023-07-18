import { Matrix4, Camera, Vector3, EulerOrder } from 'three'
import { VertigoState } from './state'

const PERSPECTIVE_ONE = .8
const EULER_ORDER: EulerOrder = 'YXZ'

const _vector = new Vector3()
const _matrix = new Matrix4()


export const updateVertigoCamera = (
  camera: Camera,
  aspect: number,
  {
    perspective,
    focusX,
    focusY,
    focusZ,
    rotationX,
    rotationY,
    rotationZ,
    width,
    height,
    sizeMode,
    rangeMin,
    rangeMax,
    nearMin,
    farMax,
    fovEpsilon,
  }: VertigoState,
) => {

  if (aspect < 1) {
    height /= aspect
  }

  // NOTE: In ThreeJS "fov" is in degree.
  const fov = perspective * PERSPECTIVE_ONE
  const isPerspective = fov > fovEpsilon
  const distance = isPerspective ? height / 2 / Math.tan(fov / 2) : -rangeMin

  // 1. Position, rotation & matrix.
  // @ts-ignore
  camera.fov = fov * 180 / Math.PI
  camera.rotation.set(rotationX, rotationY, rotationZ, EULER_ORDER)
  camera.quaternion.setFromEuler(camera.rotation)
  _matrix.makeRotationFromQuaternion(camera.quaternion)
  _vector.set(0, 0, distance).applyMatrix4(_matrix)
  camera.position.set(
    _vector.x + focusX,
    _vector.y + focusY,
    _vector.z + focusZ)
  camera.matrixAutoUpdate = false
  camera.updateMatrix()
  camera.updateMatrixWorld(true)

  // 2. Near, far & projection.
  const near = Math.max(nearMin, distance + rangeMin)
  const far = Math.min(farMax, distance + rangeMax)
  if (isPerspective) {
    // https://github.com/mrdoob/three.js/blob/master/src/cameras/PerspectiveCamera.js#L179
    const mHeight = height * near / distance * .5
    const mWidth = mHeight * aspect
    camera.projectionMatrix.makePerspective(-mWidth, mWidth, mHeight, -mHeight, near, far)
  } else {
    const mHeight = height * .5
    const mWidth = mHeight * aspect
    camera.projectionMatrix.makeOrthographic(-mWidth, mWidth, mHeight, -mHeight, near, far)
  }
  // @ts-ignore
  camera.near = near
  // @ts-ignore
  camera.far = far
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()

  // 3. Three internals.
  // @ts-ignore
  camera.isPerspectiveCamera = isPerspective
  // @ts-ignore
  camera.isOrthographicCamera = !isPerspective
}
