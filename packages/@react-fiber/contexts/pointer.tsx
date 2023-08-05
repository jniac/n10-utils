import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { Intersection, Mesh, Object3D, Ray, Raycaster, Vector2, Vector3 } from 'three'
import { useThree } from '@react-three/fiber'

import { ViewportInstance, ViewportManager, useViewportManager } from '@/n10-utils/packages/@react-fiber/contexts/viewport'
import { useEffects } from '@/n10-utils/packages/react/hooks'
import { handlePointer } from '@/n10-utils/dom/handle/pointer'
import { mapRecord } from '@/n10-utils/object/map-record'

type PointerHit = {
  object: Object3D
  intersection: Intersection
}

type TapInfo = {
  pointer: PointerManager
  hit: PointerHit | null
}

type DragInfo = {
  pointer: PointerManager
  hitDeltaStart: Vector3
  hitStart: PointerHit
  viewportStart: ViewportInstance
  rayStart: Ray
  ray: Ray
  rayOld: Ray
}  

type OnTapCallback = (info: TapInfo) => void
type OnDragCallback = (info: DragInfo) => void
type OnPointerCallbacks = Partial<{
  onTap: OnTapCallback
  onDrag: OnDragCallback
  onDragStart: OnDragCallback
  onDragStop: OnDragCallback
}>
type CallbackOptions = {
  once: boolean
}

type RaycastOptions = Partial<{
  root: Object3D
  filter: (intersection: Intersection) => boolean
}>

function isPointerCollider(object: Object3D): boolean {
  return object.userData.pointerCollider === true
}

function isIgnoringPointer(object: Object3D): boolean {
  return object.visible === false || object.userData.ignorePointer === true
}

function childrenAreIgnoringPointer(object: Object3D): boolean {
  return object.userData.chilrenIgnorePointer === true
}

function processPointerRaycast(raycaster: Raycaster, root: Object3D, optionalFilter?: (intersection: Intersection) => boolean): PointerHit[] {
  const hits: PointerHit[] = []
  const queue: Object3D[] = [root]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (isIgnoringPointer(current)) {
      continue
    }
    const colliders = current.children.filter(isPointerCollider)
    if (colliders.length > 0) {
      // Current node has colliders, ignore his own geomtry and use colliders to evaluate hit.
      // NOTE: children are ignored (since colliders are present)
      let intersections = raycaster.intersectObjects(colliders, true)
      if (optionalFilter) {
        intersections = intersections.filter(optionalFilter)
      }
      if (intersections.length > 0) {
        hits.push({ object: current, intersection: intersections[0] })
      }
    } else {
      if (current instanceof Mesh) {
        let intersections = raycaster.intersectObject(current, false)
        if (optionalFilter) {
          intersections = intersections.filter(optionalFilter)
        }
        if (intersections.length > 0) {
          hits.push({ object: current, intersection: intersections[0] })
        }
      }
      if (childrenAreIgnoringPointer(current) === false) {
        queue.push(...current.children)
      }
    }
  }
  hits.sort((a, b) => a.intersection.distance - b.intersection.distance)
  return hits
}

function onPointer(callbacks: OnPointerCallbacks) {
  return mapRecord(callbacks, (key, value) => [`userData-${key}`, value])
}

function extractPointerCallbacks(object: Object3D) {
  return object.userData as OnPointerCallbacks
}

const pointerManagers: PointerManager[] = []
const Pointer = () => {
  if (pointerManagers.length > 0) {
    return pointerManagers[0]
  }
  throw new Error(`No "PointerManager" has been created yet.`)
}
class PointerManager {
  private static counter = 0
  readonly id = PointerManager.counter++

  private m = {
    onDestroyCallbacks: new Set<() => void>(),
    onTapCallbacks: new Set<(info: TapInfo) => void>
  }

  raycaster = new Raycaster()
  ndcCoords = new Vector2()

  viewportManager: ViewportManager
  canvas: HTMLElement

  currentViewport: ViewportInstance = ViewportInstance.default

  constructor(viewportManager: ViewportManager, canvas: HTMLElement) {
    pointerManagers.push(this)

    this.viewportManager = viewportManager
    this.canvas = canvas
  }

  destroyed = false
  destroy = () => {
    for (const callback of this.m.onDestroyCallbacks) {
      callback()
    }
    const index = pointerManagers.indexOf(this)
    pointerManagers.splice(index, 1)
    this.destroyed = true
    this.destroy = () => { }
  }

  bindPointerEvents() {
    let dragHasStarted = false
    const dragInfo: DragInfo = {
      pointer: this,
      hitDeltaStart: new Vector3(),
      viewportStart: null!,
      hitStart: null!,
      rayStart: null!,
      ray: null!,
      rayOld: null!,
    }

    const destroyHandler = handlePointer(this.canvas, {
      onMove: info => {
        this.update(info.position.x, info.position.y)
      },
      onDown: () => {
        const hit = this.raycast()
        console.log(hit?.object)
      },
      onTap: ({ downPosition }) => {
        this.update(downPosition.x, downPosition.y)
        const hit = this.raycast()
        const info = { pointer: this, hit }
        const callbacks = [...this.m.onTapCallbacks]
        if (hit) {
          const { onTap } = extractPointerCallbacks(hit.object)
          if (onTap) {
            callbacks.push(onTap)
          }
        }
        for (const callback of callbacks) {
          callback(info)
        }
      },
      onDragStart: () => {
        const hit = this.raycast()
        if (hit) {
          dragHasStarted = true
          dragInfo.hitStart = hit
          dragInfo.ray = this.raycaster.ray.clone()
          dragInfo.rayOld = dragInfo.ray
          dragInfo.hitDeltaStart.subVectors(hit.intersection.point, hit.object.position)
          const { onDragStart } = extractPointerCallbacks(hit.object)
          onDragStart?.(dragInfo)
        }
      },
      onDrag: info => {
        if (dragHasStarted) {
          this.update(info.position.x, info.position.y)
          dragInfo.rayOld = dragInfo.ray
          dragInfo.ray = this.raycaster.ray.clone()
          const { onDrag } = extractPointerCallbacks(dragInfo.hitStart.object)
          onDrag?.(dragInfo)
        }
      },
      onDragStop: () => {
        if (dragHasStarted) {
          const { onDragStop } = extractPointerCallbacks(dragInfo.hitStart.object)
          onDragStop?.(dragInfo)
          dragHasStarted = false
        }
      },
    })

    this.m.onDestroyCallbacks.add(destroyHandler)
  }

  update(clientX: number, clientY: number): void {
    const relativeX = clientX / this.canvas.clientWidth
    const relativeY = clientY / this.canvas.clientHeight
    this.currentViewport = this.viewportManager.getViewportAt(relativeX, relativeY)
    this.currentViewport.toNdcCoords(relativeX, relativeY, this.ndcCoords)
    this.raycaster.setFromCamera(this.ndcCoords, this.currentViewport.camera)
  }

  raycastAll(options?: RaycastOptions): PointerHit[] {
    const {
      root = this.currentViewport.scene,
      filter = () => true,
    } = options ?? {}
    if (root === null) {
      debugger
    }
    return processPointerRaycast(this.raycaster, root, filter)
  }

  raycast(options?: RaycastOptions): PointerHit | null {
    const hits = this.raycastAll(options)
    // console.log(viewport.toString(), `ndc(${ndcCoords.x.toFixed(2)} ${ndcCoords.y.toFixed(2)})`, ...intersections.map(i => `${i.object.constructor.name}:"${i.object.name}"`))
    return hits[0] ?? null
  }

  // utils:
  rayAt(distance: number, out = new Vector3()): Vector3 {
    this.raycaster.ray.at(distance, out)
    return out
  }

  onTap(callback: OnTapCallback): () => void
  onTap(options: CallbackOptions, callback: OnTapCallback): () => void
  onTap(...args: any[]): () => void {
    const [options, callback] = (args.length === 2 ? args : [{ once: false }, args[0]]) as [CallbackOptions, OnTapCallback]
    const { once = false } = options
    let finalCallback = callback
    if (once) {
      finalCallback = (info: TapInfo) => {
        destroy()
        callback(info)
      }
    }
    this.m.onTapCallbacks.add(finalCallback)
    const destroy = () => {
      this.m.onTapCallbacks.delete(finalCallback)
    }
    return destroy
  }
}

const PointerContext = createContext<PointerManager>(null!)

function usePointerManager() {
  return useContext(PointerContext)
}

function PointerProvider({ children }: PropsWithChildren) {
  const three = useThree()
  const viewportManager = useViewportManager()
  
  const pointerManager = useMemo(() => {
    return new PointerManager(viewportManager, three.gl.domElement)
  }, [three, viewportManager])

  useEffects(function* () {
    pointerManager.bindPointerEvents()
    yield pointerManager
  }, [pointerManager])

  return (
    <PointerContext.Provider value={pointerManager}>
      {children}
    </PointerContext.Provider>
  )
}

export type {
  PointerManager,
}

export {
  onPointer,
  PointerProvider,
  usePointerManager,
  Pointer,
}