// @ts-ignore
import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { Destroyable } from '../../../types'
import { digestProps } from './digestProps'

type UseEffectsDestroyable = void | null | Destroyable | Destroyable[]

type UseEffectsCallback<T, V = void> =
  (value: T) => (
    | void
    | Generator<UseEffectsDestroyable | V, void, any>
    | AsyncGenerator<UseEffectsDestroyable | V, void, any>
  )

type UseEffectsReturn<T> = {
  ref: MutableRefObject<T>
}

type UseEffectsOptions = Partial<{
  /**
   * Choose the moment to initialize the effects. Defaults to 'effect'.
   * 
   * Reminder:
   * - 'memo': runs before the first render.
   * - 'effect': runs just after the first render and after the browser has painted.
   * - 'layoutEffect': runs just after the first render but before the browser has painted.
   */
  moment: 'effect' | 'layoutEffect' | 'memo'
  /**
   * Use a "smart digest props" heuristic for deps hashing.
   * 
   * Defaults to true.
   */
  useDigestProps: boolean
}>

function parseArgs<T>(args: any[]): [UseEffectsCallback<T>, DependencyList | 'always', UseEffectsOptions] {
  const [arg0, arg1, arg2] = args
  if (typeof arg0 === 'object') {
    return [arg1, arg2, arg0]
  }
  return [arg0, arg1, arg2 ?? {}]
}

let nextId = 0

function useEffects<T = undefined>(
  options: UseEffectsOptions,
  callback: UseEffectsCallback<T>,
  deps: DependencyList | 'always',
): UseEffectsReturn<T>

function useEffects<T = undefined>(
  callback: UseEffectsCallback<T>,
  deps: DependencyList | 'always',
  options?: UseEffectsOptions,
): UseEffectsReturn<T>

function useEffects<T = undefined>(...args: any[]): UseEffectsReturn<T> {
  const [callback, propsDeps, options] = parseArgs<T>(args)

  const {
    moment = 'effect',
    useDigestProps = true,
  } = options

  const deps = useDigestProps && propsDeps.length > 0
    ? [digestProps(propsDeps)]
    : propsDeps

  const ref = useRef<T>(null) as MutableRefObject<T>

  const { state, destroyables } = useMemo(() => {
    return {
      state: { id: nextId++, mounted: true },
      destroyables: <Destroyable[]>[],
    }
  }, [])

  // Mount:
  const use = {
    'effect': useEffect,
    'layoutEffect': useLayoutEffect,
    'memo': useMemo,
  }[moment]
  use(() => {
    // NOTE: Because of react strict mode, where a same component can be mounted 
    // twice, but sharing the same references through hooks (useMemo, useRef, etc),
    // we need to set "mounted" back to true, otherwise the first unmount will 
    // affect the second component. 
    state.mounted = true

    const it = callback(ref.current)
    if (it) {
      let previousValue: UseEffectsDestroyable = undefined
      const extractDestroyableValue = (destroyable: Destroyable) => {
        return typeof destroyable === 'object' ? destroyable.value : undefined
      }
      const extractPreviousValue = () => {
        if (!previousValue) return undefined
        if (Array.isArray(previousValue)) {
          return previousValue.map(extractDestroyableValue)
        }
        return extractDestroyableValue(previousValue)
      }

      const handleResult = (result: IteratorResult<UseEffectsDestroyable, void>) => {
        const { value, done } = result
        previousValue = value
        if (state.mounted && done === false) {
          if (value) {
            if (Array.isArray(value)) {
              destroyables.push(...value as Destroyable[])
            } else {
              destroyables.push(value as Destroyable)
            }
          }
          nextResult()
        }
      }

      const nextResult = () => {

        const result = it.next(extractPreviousValue())
        if (result instanceof Promise) {
          result.then(awaitedResult => {
            handleResult(awaitedResult)
          })
        } else {
          handleResult(result)
        }
      }

      nextResult()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps === 'always' ? undefined : deps)

  // Unmount:
  useEffect(() => {
    return () => {
      state.mounted = false

      for (const destroyable of destroyables) {
        if (destroyable) {
          if (typeof destroyable === 'object') {
            destroyable.destroy()
          } else {
            destroyable()
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps === 'always' ? undefined : deps)

  return { ref }
}

function useLayoutEffects<T = undefined>(
  callback: (value: T) => Generator<void | Destroyable, void, unknown>,
  deps: DependencyList | 'always',
  options?: Omit<UseEffectsOptions, 'moment'>
): UseEffectsReturn<T> {
  return useEffects(callback, deps, { ...options, moment: 'layoutEffect' })
}

export type {
  UseEffectsCallback,
  UseEffectsOptions,
  UseEffectsReturn,
  UseEffectsDestroyable as UseEffectsYieldable
}

export {
  useEffects,
  useLayoutEffects
}

