'use client'

import { useMemo } from 'react'
import { Camera } from 'three'
import { Canvas, CanvasProps } from '@react-three/fiber'

import { ViewportProvider } from './viewport'
import { PointerProvider } from './pointer'
import { DebugDrawProvider } from './debug-draw'
import { VertigoStateDeclaration } from '../../three/vertigo/state'
import { VertigoCamera } from '../../three/vertigo/VertigoCamera'

function solveCamera(camera: Camera | VertigoStateDeclaration | undefined): Camera | undefined {
  if (camera instanceof Camera) {
    return camera
  }
  if (camera && typeof camera === 'object') {
    return new VertigoCamera().setVertigo(camera)
  }
  return undefined
}

export function ContextCanvas({
  renderTickOrder = 1000, 
  gl, 
  children,
  camera,
  ...props
}: Omit<CanvasProps, 'camera'> & Partial<{
  renderTickOrder: number
  camera: Camera | VertigoStateDeclaration
}>) {
  const solvedCamera = useMemo(() => solveCamera(camera), [camera])
  return (
    <Canvas
      flat
      gl={{ outputColorSpace: "srgb", ...gl }}
      {...props}
      frameloop='never'
      camera={solvedCamera as any}
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
