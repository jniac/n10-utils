import { useEffect } from 'react'

import { Observable } from '../../../observables'
import { useRender } from './render'

export function useObservable<T>(observable: Observable<T>): T {
	const render = useRender()
	useEffect(() => {
		const { destroy } = observable.onChange(() => render())
		return destroy
	}, [render, observable])
	return observable.value
}
