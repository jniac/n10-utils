// @ts-ignore
import { useCallback, useMemo, useState } from 'react'

let renderCounter = 0
export const useTriggerRender = () => {
	const [, setCount] = useState(renderCounter)
	const triggerRender = useCallback(() => setCount(++renderCounter), [])
	return triggerRender
}

export { useTriggerRender as useRender } // Alias for backwards compatibility.

let nextUniqueId = 0
export const useUniqueId = () => {
	const id = useMemo(() => nextUniqueId++, [])
	return id
}
