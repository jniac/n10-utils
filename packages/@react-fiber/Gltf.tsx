import { GroupProps } from '@react-three/fiber'
import { BufferGeometry, Group, Mesh, Texture, Vector3Tuple } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js'
import { lazy } from '../../lazy'
import { useEffects } from '../react/hooks'

const local = lazy(() => {
  const loader = new GLTFLoader()

  const map = new Map<string, { gltf: GLTF, count: number }>()
  const register = (url: string, gltf: GLTF) => {
    const bundle = map.get(url)
    if (bundle) {
      bundle.count++
    } else {
      const bundle = {
        gltf,
        count: 1,
      }
      map.set(url, bundle)
    }
  }
  const free = (url: string) => {
    const bundle = map.get(url)
    if (bundle) {
      bundle.count--
      if (bundle.count === 0) {
        bundle.gltf.scene.traverse(child => {
          if (child instanceof Mesh) {
            for (const value of Object.values(child.material)) {
              if (value instanceof Texture) {
                value.dispose()
              }
            }
            child.geometry.dispose()
            child.material.dispose()
          }
        })
      }
    }
  }
  return {
    loader,
    register,
    free,
  }
})

export function getGltfLoader() {
  return local().loader
}

type Props = {
  url: string
} & Partial<{
  pivotShift: Vector3Tuple
  modelScale: number
  /** Because sometimes, quaternions are not normalized (???), and the geometry is deformed. */
  normalizeQuaternion: boolean
  onLoad: (gltf: GLTF) => void
}> & GroupProps

/**
 * Load a gltf / glb file, and automatically dispose the resources (geometry, 
 * material & textures) when the componenent is destroyed.
 */
export function Gltf({
  url,
  pivotShift,
  modelScale,
  normalizeQuaternion = true,
  onLoad,
  ...props
}: Props) {
  const { ref } = useEffects<Group>(function* (group) {
    group.name = Gltf.name
    local().loader.load(url, gltf => {
      local().register(url, gltf)
      if (pivotShift) {
        gltf.scene.position.set(...pivotShift)
      }

      // Apply "modelScale" to position and geometries:
      if (modelScale !== undefined) {
        gltf.scene.traverse(child => {
          child.position.multiplyScalar(modelScale)
          if (child instanceof Mesh) {
            const geometry = child.geometry as BufferGeometry
            geometry.scale(modelScale, modelScale, modelScale)
          }
        })
      }

      onLoad?.(gltf)

      if (normalizeQuaternion) {
        gltf.scene.traverse(child => {
          child.quaternion.normalize()
        })
      }

      group.add(gltf.scene)
    })
    yield () => {
      local().free(url)
      group.clear()
    }
  }, [url, pivotShift, modelScale])

  return (
    <group
      ref={ref}
      {...props}
    />
  )
}
