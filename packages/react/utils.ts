// @ts-ignore
import { ForwardedRef, MutableRefObject, Ref } from 'react'

/**
 * Will return "foo bar baz" from makeClassName('foo', { bar: true }, { baz: true, qux: false })
 */
export function makeClassName(...args: any[]) {
	return args
		.flat(Infinity)
		.map(arg => {
			if (typeof arg === 'string') {
				return arg
			}
			if (typeof arg === 'object') {
				return Object.entries(arg)
					.map(([key, value]) => {
						if (value) {
							return key
						}
						return ''
					})
					.join(' ')
			}
			return ''
		})
		.filter(arg => !!arg)
		.join(' ')
}

/**
 * @deprecated Use `makeClassName` instead.
 */
export function className(...args: any[]) {
	return makeClassName(...args)
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
