import { windowClock } from '../../../clock'
import { lazy } from '../../../lazy'

export const globalUniforms = lazy(() => {
  const uTime = { value: 0 }
  windowClock().onTick(({ time }) => {
    uTime.value = time
  })
  return {
    uTime,
  }
})
