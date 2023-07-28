import { DestroyableObject } from "../types"

type ValueMapper<T> =
	(incomingValue: T, observable: Observable<T>) => T

type ConstructorOptions<T> = Partial<{
	valueMapper: ValueMapper<T>
}>

type Callback<T> =
	(value: T, observable: Observable<T>) => void

type DerivativeCallback<T, D> =
	(derivative: D, derivativeOld: D, value: T, observable: Observable<T>) => void

type VerifyCallback<T> =
	(verify: boolean, value: T, observable: Observable<T>) => void


type OnChangeOptions = Partial<{
	executeImmediately: boolean
}>

let observableCount = 0

/**
 * Observable is a very simple wrapper around a value (any kind) that makes it 
 * to observe changes on that value.
 * 
 * It also facilitates
 * - to define "value-mapper" that rewrite internally the value 
 * (eg: min / max bounds to number value)
 * - to react to "derived value" (eg: boolean that compare a number value to a 
 * threshold)
 * 
 * Other benefits may comes from the fact that:
 * - any subscription return a "destroy" function to facilitates... unsubscription.
 * - "setValue()", after having eventually remapped the value, performs an internal 
 * check against the current value and do nothing if the value is the same (optim).
 * - it is eventually declined to specific flavour for even more convenience 
 * (eg: ObservableNumber)
 * 
 * Usage:
 * ``` 
 * const statusObs = new Observable<"none" | "pending" | "ready">("none");
 * statusObs.onChange(status => {
 *   if (value === "ready") {
 *     doFancyThings();
 *   }
 * });
 * statusObs.value = "ready";
 * ``` 
 */
class Observable<T> {
	protected _observableId = observableCount++
	protected _value: T
	protected _valueOld: T
	protected _valueMapper: ValueMapper<T> | null = null;
	protected _listeners: Set<Callback<T>> = new Set();
	protected _hasChanged: boolean = false;

	constructor(intialValue: T, options?: ConstructorOptions<T>) {
		this._value = intialValue
		this._valueOld = intialValue
		if (options) {
			const {
				valueMapper,
			} = options
			this._valueMapper = valueMapper ?? null
		}
	}

	protected _invokeListeners(): void {
		const it = this._listeners[Symbol.iterator]()
		while (true) {
			const { value, done } = it.next()
			if (done) break
			value(this._value, this)
		}
	}

	/**
	 * `setValue` makes several things:
	 * 	 - Firts it remap the incoming value (eg: by applying min, max bounds).
	 * 	 - It compares the incoming value with the inner one.
	 * 	 - If the value are identical, it returns false (meaning: nothing happened)
	 * 	 - Otherwise it changes the inner value, call all the listeners and returns true (meaning: something happened).
	 * @param incomingValue
	 * @returns
	 */
	setValue(incomingValue: T): boolean {
		if (this._valueMapper) {
			incomingValue = this._valueMapper(incomingValue, this)
		}
		if (incomingValue === this._value) {
			this._hasChanged = false
			return false
		}
		this._valueOld = this._value
		this._value = incomingValue
		this._invokeListeners()
		this._hasChanged = true
		return true
	}

	/**
	 * Since the valueMapper can change the inner value, defining a new value mapper
	 * with a non-null value internally invokes setValue() and returns the result.
	 * @param valueMapper 
	 * @returns 
	 */
	setValueMapper(valueMapper: ValueMapper<T> | null): boolean {
		this._valueMapper = valueMapper
		return valueMapper
			? this.setValue(valueMapper(this._value, this))
			: false
	}

	onChange(callback: Callback<T>): DestroyableObject
	onChange(options: OnChangeOptions, callback: Callback<T>): DestroyableObject
	onChange(...args: any[]): DestroyableObject {
		const [{
			executeImmediately = false,
		}, callback] = (args.length === 2 ? args : [{}, args[0]]) as
			[OnChangeOptions, Callback<T>]
		this._listeners.add(callback)
		const destroy = () => this._listeners.delete(callback)
		if (executeImmediately) {
			callback(this._value, this)
		}
		return { destroy }
	}

	onDerivativeChange<D>(derivativeExtractor: (value: T) => D, callback: DerivativeCallback<T, D>): DestroyableObject
	onDerivativeChange<D>(derivativeExtractor: (value: T) => D, options: OnChangeOptions, callback: DerivativeCallback<T, D>): DestroyableObject
	onDerivativeChange<D>(derivativeExtractor: (value: T) => D, ...args: any[]): DestroyableObject {
		let derivative = derivativeExtractor(this._value)
		const [{
			executeImmediately = false,
		}, callback] = (args.length === 2 ? args : [{}, args[0]]) as
			[OnChangeOptions, DerivativeCallback<T, D>]
		if (executeImmediately) {
			callback(derivative, derivative, this._value, this)
		}
		return this.onChange(value => {
			const derivativeOld = derivative
			derivative = derivativeExtractor(value)
			if (derivative !== derivativeOld) {
				callback(derivative, derivativeOld, value, this)
			}
		})
	}

	onVerify(predicate: (value: T) => boolean, callback: VerifyCallback<T>): DestroyableObject
	onVerify(options: OnChangeOptions, predicate: (value: T) => boolean, callback: VerifyCallback<T>): DestroyableObject
	onVerify(...args: any[]): DestroyableObject {
		// Solve args:
		const [options, predicate, callback] = (args.length === 3
			? args
			: [{}, ...args]
		) as [options: OnChangeOptions, predicate: (value: T) => boolean, callback: VerifyCallback<T>]
		
		// Go on:
		let verify = predicate(this._value)
		if (options.executeImmediately) {
			callback(verify, this._value, this)
		}
		return this.onChange(value => {
			const newVerify = predicate(value)
			if (newVerify !== verify) {
				verify = newVerify
				callback(verify, value, this)
			}
		})
	}

	// Sugar syntax:
	get observableId() { return this._observableId }
	get value() { return this._value }
	set value(value) { this.setValue(value) }
	get valueOld() { return this._valueOld }

	// Debug
	log(formatValue: (value: T) => string = (value: T) => `Obs#${this._observableId} value has changed: ${value}`): DestroyableObject {
		return this.onChange(value => {
			console.log(formatValue(value))
		})
	}
}

export type {
	ConstructorOptions,
	Callback,
	DerivativeCallback,
	OnChangeOptions,
}

export {
	Observable,
}
