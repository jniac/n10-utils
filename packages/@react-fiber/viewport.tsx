import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { Camera, Object3D, PerspectiveCamera, Vector2 } from 'three'
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
  onBeforeRender: (info: { mainCamera: Camera, camera: Camera, viewport: Viewport, mainViewport: Viewport }) => void
  camera: Camera
  scene: Object3D
  extraScene: Object3D
}>

class Viewport {
  props: ViewportProps
  x = 0
  y = 0
  width = 0
  height = 0
  isMainViewport = false
  camera: PerspectiveCamera
  renderScene: Object3D = null!
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
  private static _defaultMainViewport = new Viewport(defaultViewportProps)
  private _viewports: Set<Viewport> = new Set()
  private _sortedViewports: Viewport[] = []
  private _mainViewport: Viewport = ViewportManager._defaultMainViewport
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
  private _getSortedViewports(): Viewport[] {
    if (this._dirty) {
      this._update()
    }
    return this._sortedViewports
  }
  getMainViewport(): Viewport {
    return this._mainViewport
  }
  addViewport(props: ViewportProps): DestroyableObject {
    const viewport = new Viewport(props)
    this._viewports.add(viewport)
    this._dirty = true
    const destroy = () => {
      this._viewports.delete(viewport)
    }
    return { destroy }
  }
  *iterateViewports(): Generator<Viewport, void, undefined> {
    const viewports = this._getSortedViewports()
    if (viewports.length > 0) {
      yield* viewports
    } else {
      yield ViewportManager._defaultMainViewport
    }
  }
  getViewportAt(x: number, y: number): Viewport {
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
  get viewports(): Viewport[] {
    return [...this.iterateViewports()]
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
    gl,
    camera: mainCamera,
    scene: mainScene,
  } = useThree()

  useEffects(function* () {
    gl.autoClear = false

    const size = new Vector2()
    yield windowClock().onTick(tickOrder, () => {
      gl.clear(true, true, true)
      gl.resetState()
      gl.getSize(size)

      const mainViewport = manager.getMainViewport()
      for (const viewport of manager.iterateViewports()) {
        const {
          scene = mainScene,
          extraScene,
          camera = mainCamera,
          box = defaultViewportProps.box,
          onBeforeRender,
        } = viewport.props

        viewport.renderScene = scene

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

        gl.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.setScissor(viewport.x, viewport.y, viewport.width, viewport.height)
        gl.setScissorTest(true)
        gl.render(scene, viewport.camera)

        if (extraScene) {
          gl.render(extraScene, viewport.camera)
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
  ViewportManager,
}

export {
  ViewportComponent as Viewport,
  ViewportCanvas,
  useViewportManager,
}
