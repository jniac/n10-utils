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

class Clock {
	listeners: ((clock: ClockState) => void)[] = []
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
					for (const listener of this.listeners) {
						listener(state)
					}
					this.frame++
				}
			}
			window.requestAnimationFrame(update)
		}
	}

	onTick(callback: (clock: ClockState) => void): DestroyableObject {
		this.listeners.push(callback)
		const destroy = () => {
			const index = this.listeners.indexOf(callback)
			if (index !== -1) {
				this.listeners.splice(index, 1)
			}
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
