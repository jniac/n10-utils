import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { Camera, DepthTexture, HalfFloatType, Object3D, PerspectiveCamera, Vector2, WebGLRenderTarget, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { Canvas, CanvasProps, useThree } from '@react-three/fiber'

import { DestroyableObject } from '../../types'
import { useEffects } from '../react/hooks'
import { windowClock } from '../../clock'
import { VertigoCamera } from '../three/vertigo/VertigoCamera'

const defaultViewportProps = {
  main: false,
  box: [0, 0, 1, 1] as [x: number, y: number, width: number, height: number],
  zIndex: 0,
}

type ViewportProps = Partial<typeof defaultViewportProps & {
  onBeforeRender: (info: { mainCamera: Camera, camera: Camera, viewport: ViewportInstance, mainViewport: ViewportInstance }) => void
  camera: Camera
  scene: Object3D
  extraScene: Object3D
}>

class ViewportInstance {
  props: ViewportProps
  x = 0
  y = 0
  width = 0
  height = 0
  isMainViewport = false
  camera: PerspectiveCamera
  scene: Object3D = null!
  composer: EffectComposer = null! 
  constructor(props: ViewportProps) {
    this.props = props
    this.camera = new PerspectiveCamera()
    this.camera.matrixAutoUpdate = false
  }
  updateCamera(otherCamera: Camera) {
    this.camera.matrix.copy(otherCamera.matrix)
    this.camera.matrixWorld.copy(otherCamera.matrixWorld)
    this.camera.projectionMatrix.copy(otherCamera.projectionMatrix)
    this.camera.matrixWorldInverse.copy(otherCamera.matrixWorldInverse)
    this.camera.projectionMatrixInverse.copy(otherCamera.projectionMatrixInverse)
  }
  getBox(): [x: number, y: number, width: number, height: number] {
    return this.props.box ?? defaultViewportProps.box
  }
  containsRelativePoint(pointX: number, pointY: number): boolean {
    const [x, y, width, height] = this.getBox()
    pointX += -x
    pointY += -y
    return pointX >= 0 && pointY >= 0 && pointX < width && pointY < height
  }
  getAspect(): number {
    return this.width / this.height
  }
  toNdcCoords<T extends { x: number, y: number }>(pointX: number, pointY: number, out: T): T {
    const [x, y, width, height] = this.getBox()
    pointX += -x
    pointY += -y
    pointX /= width
    pointY /= height
    out.x = pointX * 2 - 1
    out.y = -(pointY * 2 - 1)
    return out
  }
  toString(): string {
    const box = this.getBox()
    const type = this.isMainViewport ? 'main' : 'sub'
    return `Viewport-${type}{ ${box.map(n => n.toFixed(2)).join(', ')} }`
  }
}

class ViewportManager {
  private static _defaultMainViewport = new ViewportInstance(defaultViewportProps)
  private _viewports: Set<ViewportInstance> = new Set()
  private _sortedViewports: ViewportInstance[] = []
  private _mainViewport: ViewportInstance = ViewportManager._defaultMainViewport
  private _dirty = false
  private _update() {
    this._sortedViewports = [...this._viewports]
      .sort((A, B) => (A.props.zIndex ?? 0) - (B.props.zIndex ?? 0))

    const mainViewport = this._sortedViewports.find(v => v.props.main)
      ?? this._sortedViewports[0]
      ?? ViewportManager._defaultMainViewport
    for (const viewport of this._sortedViewports) {
      viewport.isMainViewport = viewport === mainViewport
    }
    this._mainViewport = mainViewport

    this._dirty = false
  }
  private _getSortedViewports(): ViewportInstance[] {
    if (this._dirty) {
      this._update()
    }
    return this._sortedViewports
  }
  getMainViewport(): ViewportInstance {
    return this._mainViewport
  }
  addViewport(props: ViewportProps): DestroyableObject {
    const viewport = new ViewportInstance(props)
    this._viewports.add(viewport)
    this._dirty = true
    const destroy = () => {
      this._viewports.delete(viewport)
    }
    return { destroy }
  }
  *iterateViewports(): Generator<ViewportInstance, void, undefined> {
    const viewports = this._getSortedViewports()
    if (viewports.length > 0) {
      yield* viewports
    } else {
      yield ViewportManager._defaultMainViewport
    }
  }
  getViewportAt(x: number, y: number): ViewportInstance {
    const viewports = this._getSortedViewports()
    if (viewports.length > 0) {
      // Loop over sorted viewports in REVERSE order (z-index)
      for (let i = viewports.length - 1; i >= 0; i--) {
        const viewport = viewports[i]
        if (viewport.containsRelativePoint(x, y)) {
          return viewport
        }
      }
      throw new Error('Where is my main viewport???')
    } else {
      return ViewportManager._defaultMainViewport
    }
  }
  get viewports(): ViewportInstance[] {
    return [...this.iterateViewports()]
  }

  onAfterRenderCallbacks: ((viewport: ViewportInstance, renderer: WebGLRenderer) => void)[] = []
  onAfterRender(callback: (viewport: ViewportInstance, renderer: WebGLRenderer) => void): DestroyableObject {
    this.onAfterRenderCallbacks.push(callback)
    let destroyed = false
    const destroy = () => {
      if (destroyed === false) {
        const index = this.onAfterRenderCallbacks.indexOf(callback)
        this.onAfterRenderCallbacks.splice(index, 1)
        destroyed = true
      }
    }
    return { destroy }
  }
}

const ViewportContext = createContext<ViewportManager>(null!)

function ViewportProvider({
  tickOrder,
  children,
}: PropsWithChildren<{
  tickOrder: number
}>) {
  const manager = useMemo(() => {
    return new ViewportManager()
  }, [])

  const {
    gl: renderer,
    camera: mainCamera,
    scene: mainScene,
  } = useThree()

  useEffects(function* () {
    renderer.autoClear = false

    const size = new Vector2()
    yield windowClock().onTick(tickOrder, () => {
      renderer.clear(true, true, true)
      renderer.resetState()
      renderer.getSize(size)

      const mainViewport = manager.getMainViewport()
      for (const viewport of manager.iterateViewports()) {
        const {
          scene = mainScene,
          extraScene,
          camera = mainCamera,
          box = defaultViewportProps.box,
          onBeforeRender,
        } = viewport.props

        viewport.scene = scene

        // if (viewport.composer === null) {
        //   const renderTarget = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType })
        //   const depthTexture = new DepthTexture(size.x, size.y)
        //   viewport.composer = new EffectComposer(renderer)
        // }

        let [x, y, width, height] = box
        x *= size.x
        y *= size.y
        width *= size.x
        height *= size.y

        viewport.x = Math.floor(x)
        viewport.y = Math.floor(y)
        viewport.width = Math.ceil(x + width) - viewport.x
        viewport.height = Math.ceil(y + height) - viewport.y

        // Use the dom orientation (y going positive downwards)
        viewport.y = size.y - viewport.y - viewport.height

        if (camera instanceof PerspectiveCamera) {
          if (camera instanceof VertigoCamera) {
            camera.updateVertigoCamera(viewport.getAspect())
          } else {
            camera.aspect = viewport.getAspect()
            camera.updateProjectionMatrix()
          }
        }

        viewport.updateCamera(camera)

        onBeforeRender?.({ camera, mainCamera, viewport, mainViewport })

        renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
        renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height)
        renderer.setScissorTest(true)
        renderer.clear()
        renderer.render(scene, viewport.camera)

        if (extraScene) {
          renderer.render(extraScene, viewport.camera)
        }

        for (const callback of manager.onAfterRenderCallbacks) {
          callback(viewport, renderer)
        }
      }
    })
  }, [tickOrder])
  return (
    <ViewportContext.Provider value={manager}>
      {children}
    </ViewportContext.Provider>
  )
}

function useViewportManager() {
  return useContext(ViewportContext)
}

function ViewportComponent(props: ViewportProps) {
  const manager = useViewportManager()
  useEffects(function* () {
    yield manager.addViewport({ ...defaultViewportProps, ...props })
  }, [props])
  return (
    null
  )
}

/**
 * Must declare <Viewport /> children to display multiple viewport. If no 
 * viewport is specified, <ViewportCanvas /> will automatically fall back to a 
 * fullscreen viewport.
 * 
 * Usage:
 * ```tsx
 * <ViewportCanvas>
 *   <Viewport main />
 *   <Viewport zIndex={10} box={[.75, .75, .25, .25]} />
 * </ViewportCanvas>
 * ```
 */
function ViewportCanvas({
  renderTickOrder = 1000,
  gl,
  children,
  ...props
}: CanvasProps & Partial<{
  renderTickOrder: number
}>) {
  return (
    <Canvas
      flat
      gl={{ outputColorSpace: "srgb", ...gl }}
      {...props}
      frameloop='never'
    >
      <ViewportProvider tickOrder={renderTickOrder}>
        {children}
      </ViewportProvider>
    </Canvas>
  )
}

export type {
  ViewportProps,
  ViewportInstance,
  ViewportManager,
}

export {
  ViewportComponent as Viewport,
  ViewportCanvas,
  useViewportManager,
}
