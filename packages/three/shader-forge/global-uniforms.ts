import { lazy } from '../../../lazy'
import { ticker } from '../../../ticker'

export const globalUniforms = lazy(() => {
  const uTime = { value: 0 }
  ticker().onTick(({ time }) => {
    uTime.value = time
  })
  return {
    uTime,
  }
})
