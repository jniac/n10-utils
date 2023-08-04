import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Destroyable } from '../../../types'
import { digest } from '@/n10-utils/digest'

type UseEffectsReturn<T> = {
	ref: MutableRefObject<T>
}
type UseEffectsOptions = Partial<{
	moment: 'effect' | 'layoutEffect' | 'memo'
	/**
	 * Use "smart digest" for deps hashing.
	 * 
	 * Defaults to true.
	 */
	useSmartDigest: boolean
}>

export function useEffects<T = undefined>(
	callback: (value: T) => Generator<void | Destroyable, void, unknown>,
	deps: DependencyList,
	{
		moment = 'effect',
		useSmartDigest = true,
	}: UseEffectsOptions = {}
): UseEffectsReturn<T> {
	if (useSmartDigest) {
		// Pack deps into one predictible number
		deps = [smartDigest(deps)]		
	}

	const ref = useRef<T>(null) as MutableRefObject<T>
	const destroyables = useMemo((): Destroyable[] => [], [])

	// Mount:
	const use = {
		'effect': useEffect,
		'layoutEffect': useLayoutEffect,
		'memo': useMemo,
	}[moment]
	use(() => {
		const it = callback(ref.current!)
		while (true) {
			const { value, done } = it.next()
			if (done) break
			if (value) {
				destroyables.push(value as Destroyable)
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	// Unmount:
	useEffect(() => {
		return () => {
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
	}, deps)
	return { ref }
}

export function useLayoutEffects<T = undefined>(
	callback: (value: T) => Generator<void | Destroyable, void, unknown>,
	deps: DependencyList,
	options: Omit<UseEffectsOptions, 'moment'>
): UseEffectsReturn<T> {
	return useEffects(callback, deps, { ...options, moment: 'layoutEffect' })
}

export function handleMutations<T>(target: T, mutations: Partial<T>) {
	const cache: Partial<T> = {}
	for (const key in mutations) {
		const value = mutations[key]
		if (value !== undefined) {
			cache[key] = target[key]
			target[key] = value
		}
	}
	return () => {
		for (const key in mutations) {
			target[key] = cache[key] as any
		}
	}
}

/**
 * Safe way to "digest" an object by avoiding common pitfalls (ex: circular references).
 * 
 * Since it's intended to be used with React:
 * - function props are reduced to name + length (args count)
 * - object props are handled in a special manner: when an "id" or "uuid" is present
 * subprops are ignored and only the id is taken into account... except if a "value"
 * key is present: if so the only the "value" prop is taken into account anything 
 * else being ignored (the object is considered as a wrapper around a value 
 * (ex observables))
 */
export function smartDigest(...propsArray: any[]): number {
	const queue: any[] = [...propsArray]
	digest.init()
	while (queue.length) {
		const current = queue.shift()!
		if (current === null || current === undefined) {
			digest.next(123456)
			continue
		}
		const type = typeof current
		switch(type) {
			case 'boolean': {
				digest.next(current ? 0 : 1)
				break
			}
			case 'function': {
				digest.next((current as Function).length)
				digest.string((current as Function).name)
				break
			}
			case 'string': {
				digest.string(current)
				break
			}
			case 'number': {
				digest.next(current)
				break
			}
			case 'object': {
				// If object has "value" key, object is a wrapper, ignore everything else the value.
				if ('value' in current) {
					queue.push(current.value)
					break
				}
				// If object has id, the id is enough to deduce identity, ignore everything else.
				if ('uuid' in current) {
					digest.string(current.uuid)
					break
				}
				if ('id' in current) {
					digest.string(current.id)
					break
				}

				if (Array.isArray(current)) {
					queue.push(...current)
				} else {
					for (const [key, value] of Object.entries(current)) {
						digest.string(key)
						queue.push(value)
					}
				}
				break
			}
		}
	}
	return digest.result()
}

export function useMutations<T>(target: T, mutations: Partial<T> | (() => Partial<T>), deps: DependencyList, options?: UseEffectsOptions) {
	return useEffects(function* () {
		yield handleMutations(target,
			typeof mutations !== 'function'
				? mutations
				: mutations())
	}, [target, ...deps], options)
}