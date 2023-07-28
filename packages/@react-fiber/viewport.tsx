import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { Camera, Object3D, PerspectiveCamera, Vector2 } from 'three'
import { Canvas, CanvasProps, useThree } from '@react-three/fiber'

import { DestroyableObject } from '../../types'
import { digestProps, useEffects } from '../react/hooks'
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
  constructor(props: ViewportProps) {
    this.props = props
  }
  getAspect(): number {
    return this.width / this.height
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
    if (this._dirty) {
      this._update()
    }
    if (this._sortedViewports.length > 0) {
      yield* this._sortedViewports
    } else {
      yield ViewportManager._defaultMainViewport
    }
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

        let [x, y, width, height] = box
        x *= size.x
        y *= size.y
        width *= size.x
        height *= size.y

        viewport.x = Math.floor(x)
        viewport.y = Math.floor(y)
        viewport.width = Math.ceil(x + width) - viewport.x
        viewport.height = Math.ceil(y + height) - viewport.y

        if (camera instanceof PerspectiveCamera) {
          if (camera instanceof VertigoCamera) {
            camera.updateVertigoCamera(viewport.getAspect())
          } else {
            camera.aspect = viewport.getAspect()
            camera.updateProjectionMatrix()
          }
        }

        onBeforeRender?.({ camera, mainCamera, viewport, mainViewport })

        gl.setViewport(x, y, width, height)
        gl.setScissor(x, y, width, height)
        gl.setScissorTest(true)
        gl.render(scene, camera)

        if (extraScene) {
          gl.render(extraScene, camera)
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

function ViewportComponent(props: ViewportProps) {
  const manager = useContext(ViewportContext)
  useEffects(function* () {
    yield manager.addViewport({ ...defaultViewportProps, ...props })
  }, [digestProps(props)])
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
}

export {
  ViewportComponent as Viewport,
  ViewportCanvas,
}
