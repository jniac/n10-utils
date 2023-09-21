import { useEffect, useMemo } from 'react'

import { Observable, ObservableNumber } from '../../../observables'
import { useRender } from './render'

/**
 * Very similar in usage as `useState` but with an observable returned instead of
 * the value.
 */
export function useObservable<T>(initialValue: Observable<T> | T | (() => Observable<T>)): Observable<T> {
	const observable = useMemo(() => {
		if (initialValue instanceof Observable) {
			return initialValue
		}
		if (typeof initialValue === 'function') {
			return (initialValue as Function)()
		}
		return new Observable(initialValue)
		// Never update from the initial value.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const render = useRender()
	useEffect(() => {
		const { destroy } = observable.onChange(() => render())
		return destroy
	}, [render, observable])

	return observable
}

export function useObservableNumber(arg: ObservableNumber | number | (() => ObservableNumber)): ObservableNumber {
	const observable = useMemo(() => {
		if (arg instanceof ObservableNumber) {
			return arg
		}
		if (typeof arg === 'function') {
			return arg()
		}
		return new ObservableNumber(arg)
		// useCallback() is painful, neh?
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, typeof arg !== 'function' ? [arg] : [])

	const render = useRender()
	useEffect(() => {
		const { destroy } = observable.onChange(() => render())
		return destroy
	}, [render, observable])

	return observable
}
