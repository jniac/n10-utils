import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Destroyable } from '../../../types'
import { digestProps } from './digestProps'

type UseEffectsCallback<T> =
	(value: T) => void | Generator<void | Destroyable, void, unknown>

type UseEffectsReturn<T> = {
	ref: MutableRefObject<T>
}

type UseEffectsOptions = Partial<{
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

	const deps = useDigestProps
		? [digestProps(propsDeps)]
		: propsDeps

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
		if (it) {
			while (true) {
				const { value, done } = it.next()
				if (done) break
				if (value) {
					destroyables.push(value as Destroyable)
				}
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps === 'always' ? undefined : deps)

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
	}, deps === 'always' ? undefined : deps)

	return { ref }
}

function useLayoutEffects<T = undefined>(
	callback: (value: T) => Generator<void | Destroyable, void, unknown>,
	deps: DependencyList | 'always',
	options: Omit<UseEffectsOptions, 'moment'>
): UseEffectsReturn<T> {
	return useEffects(callback, deps, { ...options, moment: 'layoutEffect' })
}

export {
	useEffects,
	useLayoutEffects,
}
