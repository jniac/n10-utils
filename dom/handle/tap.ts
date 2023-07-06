import { DestroyableObject } from "../../types"

const defaultParams = {
  /** The max distance that the user may travel when down. */
  maxDistance: 10,
  /** The max duration that the user may stay down (seconds). */
  maxDuration: .3,
}

type Info = {
  downTarget: HTMLElement
}

type Params = Partial<typeof defaultParams & {
  onTap: (info: Info) => void
}>

function handleTap(element: HTMLElement, params: Params): DestroyableObject {
  const {
    maxDistance,
    maxDuration,
    onTap,
  } = { ...defaultParams, ...params }

  const downState = {
    timestamp: -1,
    clientX: 0,
    clientY: 0,
  }
  const info: Info = {
    downTarget: null!,
  }

  const onPointerDown = (event: PointerEvent) => {
    downState.timestamp = Date.now()
    downState.clientX = event.clientX
    downState.clientY = event.clientY
    window.addEventListener("pointerup", onPointerUp)
    info.downTarget = event.target as HTMLElement
  }
  const onPointerUp = (event: PointerEvent) => {
    window.removeEventListener("pointerup", onPointerUp)
    const duration = (Date.now() - downState.timestamp) / 1e3
    const x = event.clientX - downState.clientX
    const y = event.clientY - downState.clientY
    const distance = Math.sqrt(x * x + y * y)
    if (distance <= maxDistance && duration < maxDuration) {
      onTap?.(info)
    }
  }

  window.addEventListener("pointerdown", onPointerDown)

  const destroy = () => {
    window.addEventListener("pointerdown", onPointerDown)
    window.removeEventListener("pointerup", onPointerUp)
  }
  return { destroy }
}

export type {
  Params as HandleTapParams,
}

export {
  handleTap,
}
