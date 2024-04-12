import { Material } from 'three'

export function updateMaterial<T extends Material>(material: T, props: Partial<T>) {
  let needsUpdate = false
  for (const key in props) {
    const value = props[key]
    if (value !== undefined) {
      if (value !== material[key]) {
        material[key] = value
        needsUpdate = true
      }
    }
  }
  if (needsUpdate) {
    material.needsUpdate = true
  }
  return material
}