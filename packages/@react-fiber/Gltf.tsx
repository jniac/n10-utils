import { Group, Mesh, Texture, Vector3Tuple } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { GroupProps } from '@react-three/fiber'
import { useEffects } from '../react/hooks'
import { lazy } from '../../lazy'

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

type Props = {
  url: string
} & Partial<{
  pivotShift: Vector3Tuple
}> & GroupProps

/**
 * Load a gltf / glb file, and automatically dispose the resources (geometry, 
 * material & textures) when the componenent is destroyed.
 */
export function Gltf({
  url,
  pivotShift,
  ...props
}: Props) {
  const { ref } = useEffects<Group>(function* (group) {
    local().loader.load(url, gltf => {
      local().register(url, gltf)
      if (pivotShift) {
        gltf.scene.position.set(...pivotShift)
      }
      group.add(gltf.scene)
    })
    yield () => {
      local().free(url)
      group.clear()
    }
  }, [])
  return (
    <group 
      ref={ref}
      {...props}
    />
  )
}
