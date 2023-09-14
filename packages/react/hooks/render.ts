import { useCallback, useState } from 'react'

let count = 0
export const useRender = () => {
	const [, setCount] = useState(count)
	const render = useCallback(() => setCount(++count), [])
	return render
}
