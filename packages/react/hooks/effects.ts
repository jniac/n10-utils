import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Destroyable } from '../../../types'
import { digestProps } from './digestProps'

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

export function useEffects<T = undefined>(
	callback: (value: T) => void | Generator<void | Destroyable, void, unknown>,
	deps: DependencyList | 'always',
	{
		moment = 'effect',
		useDigestProps = true,
	}: UseEffectsOptions = {}
): UseEffectsReturn<T> {
	if (useDigestProps) {
		// Pack deps into one predictible number
		deps = [digestProps(deps)]
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

export function useLayoutEffects<T = undefined>(
	callback: (value: T) => Generator<void | Destroyable, void, unknown>,
	deps: DependencyList | 'always',
	options: Omit<UseEffectsOptions, 'moment'>
): UseEffectsReturn<T> {
	return useEffects(callback, deps, { ...options, moment: 'layoutEffect' })
}
