import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { Vector2 } from 'three'
import { Canvas, CanvasProps, useThree } from '@react-three/fiber'

import { DestroyableObject } from '../../types'
import { useEffects } from '../react/hooks'
import { windowClock } from '../../clock'
import { digest } from '../../digest'

const defaultViewportProps = {
  box: [0, 0, 1, 1] as [x: number, y: number, width: number, height: number],
  zIndex: 0,
}

type ViewportProps = typeof defaultViewportProps

class ViewportManager {
  private _viewports: Set<ViewportProps> = new Set()
  private _sortedViewports: ViewportProps[] = []
  private _dirty = false
  private _sort() {
    this._sortedViewports = [...this._viewports]
      .sort((A, B) => (A.zIndex ?? 0) - (B.zIndex ?? 0))
    this._dirty = false
  }
  addViewport(props: ViewportProps): DestroyableObject {
    this._viewports.add(props)
    this._dirty = true
    const destroy = () => {
      this._viewports.delete(props)
    }
    return { destroy }
  }
  *iterateViewports() {
    if (this._dirty) {
      this._sort()
    }
    yield* this._sortedViewports
  }
}

const ViewportContext = createContext<ViewportManager>(null!)

function ViewportProvider({ 
  tickOrder, 
  children, 
}: PropsWithChildren<{ tickOrder: number }>) {
  const manager = useMemo(() => {
    return new ViewportManager()
  }, [])
  const { gl, camera, scene } = useThree()
  useEffects(function* () {
    const size = new Vector2()
    yield windowClock().onTick(tickOrder, () => {
      gl.resetState()
      gl.getSize(size)
      
      for (const viewport of manager.iterateViewports()) {
        const {
          box = defaultViewportProps.box,
        } = viewport

        let [x, y, width, height] = box
        x *= size.x
        width *= size.x
        y *= size.y
        height *= size.y

        gl.setViewport(x, y, width, height)
        gl.setScissor(x, y, width, height)
        gl.setScissorTest(true)
        gl.render(scene, camera)
      }
    })
  }, [tickOrder])
  return (
    <ViewportContext.Provider value={manager}>
      {children}
    </ViewportContext.Provider>
  )
}

function Viewport(props: Partial<ViewportProps>) {
  const manager = useContext(ViewportContext)
  useEffects(function* () {
    yield manager.addViewport({ ...defaultViewportProps, ...props })
  }, [digest(props)])
  return (
    null
  )
}

function ViewportCanvas({ 
  tickOrder = 1000, 
  children, 
  ...props 
}: CanvasProps & Partial<{
  tickOrder: number
}>) {
  return (
    <Canvas frameloop='never' {...props}>
      <ViewportProvider tickOrder={tickOrder}>
        {children}
      </ViewportProvider>
    </Canvas>
  )
}

export {
  Viewport,
  ViewportCanvas,
}
