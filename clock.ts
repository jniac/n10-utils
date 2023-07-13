import { inverseLerp } from './math/basics'
import { easeInOut2 } from './math/easing'
import { DestroyableObject } from './types'

type ClockState = Readonly<{
	timeScale: number
	time: number
	timeOld: number
	frame: number
	deltaTime: number
	maxDeltaTime: number
	
	updateDuration: number
	updateFadeDuration: number
	updateLastRequest: number
}>

type Listener = {
	callback: (clock: ClockState) => void
	order: number
}

class Listeners {
	private _dirty = true
	array: Listener[] = []
	add(order: number, callback: (clock: ClockState) => void): void {
		this.array.push({ order, callback })
		this._dirty = true
	}
	remove(callback: (clock: ClockState) => void): boolean {
		const index = this.array.findIndex(listener => listener.callback === callback)
		if (index !== - 1) {
			this.array.splice(index, 1)
			return true
		} else {
			return false
		}
	}
	call(state: ClockState) {
		if (this._dirty) {
			this.array.sort((A, B) => A.order - B.order)
			this._dirty = false
		}
		for (const { callback } of this.array) {
			callback(state)
		}
	}
}

class Clock {
	listeners = new Listeners()
	timeScale = 1
	maxDeltaTime = .1
	frame = 0

	private _state: ClockState = {
		timeScale: 1,
		time: 0,
		timeOld: 0,
		frame: 0,
		maxDeltaTime: .1,
		deltaTime: 0,

		updateDuration: 3,
		updateFadeDuration: 1,
		updateLastRequest: 0,
	}
	get state() { return this._state }

	private _requestAnimationFrame = false

	constructor() {
		if (typeof window !== 'undefined') {
			let windowTime = window.performance.now() / 1e3
			const update = (ms: number) => {
				window.requestAnimationFrame(update)
				const windowTimeOld = windowTime
				windowTime = ms / 1e3

				// Auto-pause handling:
				let { updateDuration, updateFadeDuration, updateLastRequest } = this._state
				if (this._requestAnimationFrame) {
					this._requestAnimationFrame = false
					updateLastRequest = windowTime
				}
				const updateTime1 = updateLastRequest + updateDuration
				const updateTime2 = updateTime1 + updateFadeDuration
				const updateTimeScale = easeInOut2(1 - inverseLerp(updateTime1, updateTime2, windowTime))

				// Time handling:
				const { timeScale, maxDeltaTime } = this
				const deltaTime = Math.min(maxDeltaTime, windowTime - windowTimeOld) * timeScale * updateTimeScale
				const timeOld = this._state.time
				const time = timeOld + deltaTime
				const state = Object.freeze({
					timeScale,
					deltaTime,
					time,
					timeOld,
					maxDeltaTime,
					frame: this.frame,

					updateDuration,
					updateFadeDuration,
					updateLastRequest,
				})
				this._state = state

				const freezed = deltaTime === 0 && time === timeOld
				if (freezed === false) {
					this.listeners.call(state)
					this.frame++
				}
			}
			window.requestAnimationFrame(update)
		}
	}

	onTick(callback: (clock: ClockState) => void): DestroyableObject
	onTick(order: number, callback: (clock: ClockState) => void): DestroyableObject
	onTick(...args: any[]): DestroyableObject{
		if (args.length === 1) {
			return this.onTick(0, args[0])
		}
		const [order, callback] = args as [number, (clock: ClockState) => void]
		this.listeners.add(order, callback)
		const destroy = () => {
			this.listeners.remove(callback)
		}
		return { destroy }
	}

	requestUpdate() {
		this._requestAnimationFrame = true
	}

	setUpdateDuration(value: number) {
		this._state = Object.freeze({
			...this._state,
			updateDuration: Math.max(0, value),
		})
	}
}

const windowClock = (() => {
	let clock: Clock
	return () => clock ?? (clock = new Clock())
})()

export type {
	ClockState,
}

export {
	Clock,
	windowClock,
}
