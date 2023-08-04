import { Canvas, CanvasProps } from '@react-three/fiber'
import { ViewportProvider } from './viewport'
import { PointerProvider } from './pointer'
import { DebugDrawProvider } from './debug-draw'

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
export function ContextCanvas({
  renderTickOrder = 1000, gl, children, ...props
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
        <PointerProvider>
          <DebugDrawProvider>
            {children}
          </DebugDrawProvider>
        </PointerProvider>
      </ViewportProvider>
    </Canvas>
  )
}
