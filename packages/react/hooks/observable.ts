import { useEffect, useMemo } from 'react'

import { Observable, ObservableNumber } from '../../../observables'
import { useRender } from './render'

export function useObservable<T>(arg: Observable<T> | T | (() => Observable<T>)): Observable<T> {
	const observable = useMemo(() => {
		if (arg instanceof Observable) {
			return arg
		}
		if (typeof arg === 'function') {
			return (arg as Function)()
		}
		return new Observable(arg)
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
