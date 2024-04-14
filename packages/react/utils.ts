import { ForwardedRef, MutableRefObject, Ref } from 'react'

/**
 * Simplifies the declaration of className.
 */
export function className(...args: any[]) {
	return args
		.flat(Infinity)
		.filter(item => typeof item === 'string' && item.length > 0)
		.join(' ')
}

/**
 * Simplifies the binding of refs.
 * 
 * Usage:
 * ```
 * bindRef(ref, value)
 * ```
 * 
 * Usage with [forwardRef](https://react.dev/reference/react/forwardRef):
 * ```ts
 * const MyComponent = forwardRef<R, Props>(function (props, outerRef) {
 *   // ...
 *   const innerRef = useRef<R>(null)
 *   useEffect(() => {
 *     bindRef(outerRef, innerRef.current)
 *   })
 *   return (
 *     // ...
 *   )
 * })
 * ```
 */
export function bindRef<T>(ref: ForwardedRef<T> | Ref<T> | null | undefined, value: T) {
	if (ref) {
		if (typeof ref === 'function') {
			ref(value)
		} else {
			(ref as MutableRefObject<T>).current = value
		}
	}
}
