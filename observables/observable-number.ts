import { Observable, ConstructorOptions } from "./observable"

/**
 * Small wrapper around a Float64Array that allows to watch over numeral changes. 
 */
class Memorization {
	private _array: Float64Array
	private _index: number
	private _sum: number
	derivative: Memorization | null = null;

	constructor(length: number, initialValue: number, derivativeCount: number = 0) {
		this._array = new Float64Array(length)
		this._array.fill(initialValue)
		this._sum = length * initialValue
		this._index = 0
		if (derivativeCount > 0) {
			this.derivative = new Memorization(length, 0, derivativeCount - 1)
		}
	}

	setValue(value: number, asNewValue: boolean): this {
		const { _array, _index } = this

		if (this.derivative) {
			const valueOld = _array[_index]
			const delta = value - valueOld
			this.derivative.setValue(delta, asNewValue)
		}

		const indexNew = asNewValue ? (_index + 1 < _array.length ? _index + 1 : 0) : _index
		this._sum += value - _array[indexNew]

		// At the end, update:
		_array[indexNew] = value
		this._index = indexNew

		return this
	}

	*values(): Generator<number, void, unknown> {
		const { _array, _index } = this
		const { length } = _array
		for (let i = 0; i < length; i++) {
			const valueIndex = (_index - i + length) % length
			yield _array[valueIndex]
		}
	}

	valuesArray(): number[] {
		const { _array, _index } = this
		const { length } = _array
		const result: number[] = new Array(length)
		for (let i = 0; i < length; i++) {
			const valueIndex = (_index - i + length) % length
			result[i] = _array[valueIndex]
		}
		return result
	}

	get sum() { return this._sum }
	get average() { return this._sum / this._array.length }
}

export class ObservableNumber extends Observable<number> {
	private _memorization: Memorization | null = null;

	constructor(initialValue: number, options?: [min: number, max: number] | ConstructorOptions<number>) {
		if (Array.isArray(options)) {
			const [min, max] = options
			options = {
				valueMapper: (value: number) => value < min ? min : value > max ? max : value
			} as ConstructorOptions<number>
		}
		super(initialValue, options)
	}

	initMemorization(memorizationLength: number, derivativeCount: number = 0): this {
		this._memorization = new Memorization(memorizationLength, this._value, derivativeCount)
		return this
	}

	getMemorization(): Memorization {
		return this._memorization!
	}

	setValue(incomingValue: number): boolean {
		if (this._memorization) {
			this._memorization.setValue(this._valueMapper?.(incomingValue, this) ?? incomingValue, true)
		}
		return super.setValue(incomingValue)
	}

	increment(delta: number): boolean {
		return this.setValue(this._value + delta)
	}

	lerp(target: number, alpha: number, {
		clamp = true,
		epsilon = 1e-6,
	} = {}): boolean {
		const value = this._value
		let newValue = value + (target - value) * (clamp ? alpha < 0 ? 0 : alpha > 1 ? 1 : alpha : alpha)
		if (Math.abs(newValue - value) < epsilon) {
			newValue = target
		}
		return this.setValue(newValue)
	}
}
