import { BufferAttribute, BufferGeometry, Euler, EulerOrder, Matrix4, Quaternion, Vector3 } from 'three'
import { MatrixParams, getMatrixMaker } from './make-matrix'

export const getGeometryTransformer = ({
  defaultRotationOrder = 'XYZ' as EulerOrder,
  defaultUseDegree = true,
} = {}) => {
  // internal, intermediate values
  const euler = new Euler()
  const translate = new Vector3()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  const matrix = new Matrix4()

  const setMatrix = getMatrixMaker({
    defaultRotationOrder,
    defaultUseDegree,
    euler,
    translate,
    quaternion,
    scale,
    matrix,
  })

  const transformPosition = (attribute: BufferAttribute) => {
    const max = attribute.count
    for (let i = 0; i < max; i++) {
      translate.set(
        attribute.getX(i),
        attribute.getY(i),
        attribute.getZ(i)
      )
      translate.applyMatrix4(matrix)
      attribute.setXYZ(i, translate.x, translate.y, translate.z)
    }
  }

  const transformNormal = (attribute: BufferAttribute) => {
    // Reset the position for the normal transformation.
    matrix.setPosition(0, 0, 0)
    const max = attribute.count
    for (let i = 0; i < max; i++) {
      translate.set(
        attribute.getX(i),
        attribute.getY(i),
        attribute.getZ(i)
      )
      translate.applyMatrix4(matrix)
      attribute.setXYZ(i, translate.x, translate.y, translate.z)
    }
  }

  const transform = (geometry: BufferGeometry, params: MatrixParams) => {
    // 1. Init the matrix.
    setMatrix(params)
    // 2. Appy the transform to the "position" attribute...
    transformPosition(geometry.attributes.position as BufferAttribute)
    // 3. ... then the "normal" attribute.
    transformNormal(geometry.attributes.normal as BufferAttribute)
    return geometry
  }

  return transform
}

export const transformGeometry = getGeometryTransformer()