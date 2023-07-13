import { ForwardedRef } from "react"

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
