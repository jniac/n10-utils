import { useCallback, useState } from 'react'

let useForceUpdateCounter = 0
export function useForceUpdate(): () => void {
	const [, setCount] = useState(0)
	const forceUpdate = useCallback(() => setCount(++useForceUpdateCounter), [])
	return forceUpdate
}
