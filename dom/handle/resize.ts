import { lazy } from "../../lazy"
import { DestroyableObject } from "../../types"

const init = lazy(() => {
	const resizeObserverMap = new WeakMap<Element, any>()
	const resizeObserver = new ResizeObserver(entries => {
		for (const entry of entries) {
			resizeObserverMap.get(entry.target)?.(entry.target)
		}
	})
	return {
		resizeObserver,
		resizeObserverMap,
	}
})

/**
 * WARN: Safari seems not to react when dom element are resized. It"s a huge flaw. Be careful.
 */
export function handleResize<T extends (HTMLElement | SVGElement | Window)>(element: T, callback: (element: T) => void): DestroyableObject {
	if (element instanceof Window) {
		const onResize = () => {
			callback(element)
		}
		element.addEventListener("resize", onResize)
		callback(element)
		const destroy = () => {
			element.removeEventListener("resize", onResize)
		}
		return { destroy }
	} else {
		const {
			resizeObserver,
			resizeObserverMap,
		} = init()
		resizeObserver.observe(element)
		resizeObserverMap.set(element, callback as any)
		const destroy = () => resizeObserver.unobserve(element)
		callback(element)
		return { destroy }
	}
};
