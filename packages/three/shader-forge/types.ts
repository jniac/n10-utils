import { Color, CubeTexture, IUniform, Matrix3, Matrix4, Quaternion, Texture, Vector2, Vector3, Vector4 } from 'three'

import { Observable } from '../../../observables'

type UniformValueType =
  | number
  | Vector2
  | Vector3
  | Color
  | Vector4
  | Quaternion
  | Matrix3
  | Matrix4
  | Texture
  | CubeTexture

type UniformDeclaration = IUniform<UniformValueType> | UniformValueType

export function solveUniformDeclaration(value: UniformDeclaration): IUniform<UniformValueType> {
  if (value instanceof Observable) {
    if (typeof value.value === 'number') {
      return value
    }
    throw new Error(`Observable value must be a number`)
  }
  if (typeof value === 'object' && value.constructor === Object && 'value' in value) {
    return value
  }
  return { value: value as UniformValueType }
}

export type Uniforms = Record<string, UniformDeclaration>

export const getGlType = (value: any) => {
  if (typeof value === 'number') {
    return 'float'
  }
  if (value.isVector2) {
    return 'vec2'
  }
  if (value.isVector3 || value.isColor) {
    return 'vec3'
  }
  if (value.isVector4 || value.isQuaternion) {
    return 'vec4'
  }
  if (value.isMatrix3) {
    return 'mat3'
  }
  if (value.isMatrix4) {
    return 'mat4'
  }
  if (value.isTexture) {
    if (value.isCubeTexture) {
      return 'samplerCube'
    } else {
      return 'sampler2D'
    }
  }
  console.log(`unhandled value:`, value)
  throw new Error(`unhandled value: "${value?.constructor.name}"`)
}
