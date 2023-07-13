import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Destroyable } from '../../../types'

type UseEffectsReturn<T> = {
	ref: MutableRefObject<T>
}
type UseEffectsOptions = Partial<{
	moment: 'effect' | 'layoutEffect' | 'memo'
}>

export function useEffects<T = undefined>(
	callback: (value: T) => Generator<void | Destroyable, void, unknown>,
	deps: DependencyList,
	{
		moment = 'effect',
	}: UseEffectsOptions = {}
): UseEffectsReturn<T> {
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

export function useMutations<T>(target: T, mutations: Partial<T> | (() => Partial<T>), deps: DependencyList, options?: UseEffectsOptions) {
	return useEffects(function* () {
		yield handleMutations(target,
			typeof mutations !== 'function'
				? mutations
				: mutations())
	}, [target, ...deps], options)
}