import { DependencyList, ForwardedRef, MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Destroyable } from "../types"
import { Observable } from "../observables"

/**
 * Simplifies the declaration of className. 
 */
export function className(...args: any[]) {
	return args
		.flat(Infinity)
		.filter(item => typeof item === "string" && item.length > 0)
		.join(" ")
}

/**
 * Simplifies the binding of refs when using [forwardRef](https://react.dev/reference/react/forwardRef).
 * 
 * Usage: 
 * ```ts
 * const CartierLoader = forwardRef<Ref, Props>(function (props, outerRef) {
 *   // ...
 *   const innerRef = useRef<Ref>(null);
 *   useEffect(() => {
 *     bindRef(outerRef, innerRef)
 *   });
 *   return (
 *     // ...
 *   );
 * });
 * ```
 */
export function bindRef<T>(ref: ForwardedRef<T> | null | undefined, value: T) {
	if (ref) {
		if (typeof ref === "function") {
			ref(value)
		} else {
			ref.current = value
		}
	}
}

type UseEffectsReturn<T> = {
	ref: MutableRefObject<T>
}

type UseEffectsOptions = Partial<{
	moment: "effect" | "layoutEffect" | "memo"
}>

export function useEffects<T = undefined>(
	callback: (value: T) => Generator<void | Destroyable, void, unknown>,
	deps: DependencyList,
	{
		moment = "effect",
	}: UseEffectsOptions = {}
): UseEffectsReturn<T> {
	const ref = useRef<T>(null) as MutableRefObject<T>
	const destroyables = useMemo((): Destroyable[] => [], [])

	// Mount:
	const use = {
		"effect": useEffect,
		"layoutEffect": useLayoutEffect,
		"memo": useMemo,
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
					if (typeof destroyable === "object") {
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
	options: Omit<UseEffectsOptions, "moment">
): UseEffectsReturn<T> {
	return useEffects(callback, deps, { ...options, moment: "layoutEffect" })
}




let useForceUpdateCounter = 0
export function useForceUpdate(): () => void {
	const [, setCount] = useState(0)
	const forceUpdate = useCallback(() => setCount(++useForceUpdateCounter), [])
	return forceUpdate
}

export function useObservable<T>(observable: Observable<T>): T {
	const forceUpdate = useForceUpdate()
	useEffect(() => {
		const { destroy } = observable.onChange(() => forceUpdate())
		return destroy
	}, [forceUpdate, observable])
	return observable.value
}
