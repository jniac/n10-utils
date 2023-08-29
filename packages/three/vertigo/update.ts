import { Camera, EulerOrder, Matrix4, Vector2, Vector3 } from 'three'
import { SIZE_MODE, VertigoState } from './state'
import { applyMatrix4AsMatrix3 } from '../utils/geom/vector-3'

const PERSPECTIVE_ONE = .8
const EULER_ORDER: EulerOrder = 'YXZ'

const _vector = new Vector3()
const _matrix = new Matrix4()

/**
 * Update the "vertigo size" according to its "size mode" and the current aspect
 * of the viewport. Nothing more than a classic "cover / contain" concept.
 */
export const updateVertigoSize = (
  size: Vector2,
  aspect: number,
  {
    width,
    height,
    sizeMode,
  }: VertigoState) => {
  const vertigoAspect = width / height
  switch (sizeMode) {
    default:
    case SIZE_MODE.CONTAIN: {
      if (aspect >= vertigoAspect) {
        // viewport is "larger" than the camera, base the size on height:
        size.x = height * aspect
        size.y = height
      } else {
        // viewport is "narrower" than the camera, base the size on width:
        size.x = width
        size.y = width / aspect
      }
      break
    }
    case SIZE_MODE.COVER: {
      if (aspect >= vertigoAspect) {
        // viewport is "larger" than the camera, base the size on width:
        size.x = width
        size.y = width / aspect
      } else {
        // viewport is "narrower" than the camera, base the size on height:
        size.x = height * aspect
        size.y = height
      }
    }
  }
}

/**
 * Compute the transform and projection matrices according to the current 
 * "computed" size and the vertigo state.
 */
export const updateVertigoCamera = (
  camera: Camera,
  size: Vector2,
  {
    perspective,
    focusX,
    focusY,
    focusZ,
    rotationX,
    rotationY,
    rotationZ,
    rangeMin,
    rangeMax,
    nearMin,
    farMax,
    fovEpsilon,
  }: VertigoState,
) => {

  const {
    x: width,
    y: height,
  } = size

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
  _vector.set(0, 0, distance)
  applyMatrix4AsMatrix3(_vector, _matrix)
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
  const aspect = width / height
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
