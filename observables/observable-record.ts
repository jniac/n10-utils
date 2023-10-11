import { digest } from '../digest'
import { Observable, ConstructorOptions } from './observable'

/**
 * NOTE: Status WIP.
 */
class ObservableRecord<T extends Record<string, any> = any> extends Observable<T> {
	protected _hash: number = -1;
	constructor(value: T, options: ConstructorOptions<T>) {
		super(value, options)
		this._hash = digest(value)
	}
	setPartialValue(partialValue: Partial<T>): boolean {
		let hasChanged = false
		const value = this._value as any
		for (const key in partialValue) {
			if (key in value) {
				const currentPropValue = partialValue[key]
				if (value[key] !== currentPropValue) {
					value[key] = currentPropValue
					hasChanged = true
				}
			}
		}
		this._hasChanged = hasChanged
		if (hasChanged) {
			this._invokeListeners()
		}
		return hasChanged
	}
}

export {
	ObservableRecord,
}
