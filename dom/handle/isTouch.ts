type Info = {
  isTouch: boolean
}

type Params = Partial<{
  onIsTouch: (info: Info) => void
  execute: boolean
}>

/**
 * Detect is the current device has touch capabilities. 
 * 
 * Useful?
 * 
 * Really?
 */
export function handleIsTouch(params: Params = {}): () => void {
  let isTouch = window.navigator.maxTouchPoints > 0
  const onResize = () => {
    update(window.navigator.maxTouchPoints > 0)
  }
  const update = (newIsTouch: boolean) => {
    if (newIsTouch !== isTouch) {
      isTouch = newIsTouch
      params.onIsTouch?.({ isTouch })
    }
  }
  const onPointer = (event: PointerEvent) => {
    update(event.pointerType === 'touch')
  }
  window.addEventListener('resize', onResize, { capture: true })
  document.addEventListener('pointermove', onPointer, { capture: true })
  document.addEventListener('pointerdown', onPointer, { capture: true })
  if (params.execute !== false) {
    params.onIsTouch?.({ isTouch })
  }
  return () => {
    window.removeEventListener('resize', onResize, { capture: true })
    document.removeEventListener('pointermove', onPointer, { capture: true })
    document.removeEventListener('pointerdown', onPointer, { capture: true })
  }
}

