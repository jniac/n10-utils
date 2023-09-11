import { clock } from '../../../clock'
import { lazy } from '../../../lazy'

export const globalUniforms = lazy(() => {
  const uTime = { value: 0 }
  clock().onTick(({ time }) => {
    uTime.value = time
  })
  return {
    uTime,
  }
})
