import { useEffect } from 'react'
import { Observable } from '../../../observables'
import { useForceUpdate } from './force-update'

export function useObservable<T>(observable: Observable<T>): T {
	const forceUpdate = useForceUpdate()
	useEffect(() => {
		const { destroy } = observable.onChange(() => forceUpdate())
		return destroy
	}, [forceUpdate, observable])
	return observable.value
}
