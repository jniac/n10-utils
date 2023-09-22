import { DestroyableObject } from './types'
import { inverseLerp } from './math/basics'
import { easeInOut2 } from './math/easing'

type ClockState = Readonly<{
	timeScale: number
	time: number
	timeOld: number
	frame: number
	deltaTime: number
	deltaTimeOld: number
	windowDeltaTime: number
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


let windowTime = 0
const animationFrameCallbacks = new Set<(windowDeltaTime: number) => void>()

if (typeof window !== 'undefined') {
	windowTime = window.performance.now() / 1e3
	const animationFrame = (ms: number) => {
		window.requestAnimationFrame(animationFrame)
		const windowTimeOld = windowTime
		windowTime = ms / 1e3
		const windowDeltaTime = windowTime - windowTimeOld
		for (const callback of animationFrameCallbacks) {
			callback(windowDeltaTime)
		}
	}
	window.requestAnimationFrame(animationFrame)
}

class Clock implements DestroyableObject {
	timeScale = 1
	maxDeltaTime = .1
	frame = 0
	
	destroy: () => void
	
	private _updateListeners = new Listeners()
	private _freezeListeners = new Listeners()
	private _unfreezeListeners = new Listeners()
	private _freezed = false
	private _requestAnimationFrame = false

	private _state: ClockState = {
		timeScale: 1,
		time: 0,
		timeOld: 0,
		frame: 0,
		maxDeltaTime: .1,
		deltaTime: 0,
		deltaTimeOld: 0,
		windowDeltaTime: 0,

		updateDuration: 3,
		updateFadeDuration: 1,
		updateLastRequest: 0,
	}

	get freezed() { return this._freezed }
	get state() { return this._state }

	constructor(updateDuration?: number) {
		if (updateDuration !== undefined) {
			this._state = { ...this._state, updateDuration }
		}
		
		const update = (windowDeltaTime: number) => {
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
			const deltaTimeOld = this._state.deltaTime
			const deltaTime = Math.min(maxDeltaTime, windowDeltaTime) * timeScale * updateTimeScale
			const timeOld = this._state.time
			const time = timeOld + deltaTime
			const state = Object.freeze({
				timeScale,
				deltaTimeOld,
				deltaTime,
				windowDeltaTime,
				time,
				timeOld,
				maxDeltaTime,
				frame: this.frame,

				updateDuration,
				updateFadeDuration,
				updateLastRequest,
			})
			this._state = state

			const freezed = 
				deltaTime === 0 // Current delta time should be zero.
				&& deltaTimeOld === 0 // But the old delta time also (this allows one "zero-delta-time" callback).
				&& time === timeOld // Time should not have been update by any other ways.
			if (freezed === false) {
				if (this._freezed) {
					this._unfreezeListeners.call(state)
				}
				this._updateListeners.call(state)
				this.frame++
			} else {
				if (this._freezed === false) {
					this._freezeListeners.call(state)
				}
			}

			this._freezed = freezed
		}

		animationFrameCallbacks.add(update)
		this.destroy = () => {
			animationFrameCallbacks.delete(update)
		}
	}

	onTick(callback: (clock: ClockState) => void): DestroyableObject
	onTick(order: number, callback: (clock: ClockState) => void): DestroyableObject
	onTick(...args: any[]): DestroyableObject {
		if (args.length === 1) {
			return this.onTick(0, args[0])
		}
		const [order, callback] = args as [number, (clock: ClockState) => void]
		this._updateListeners.add(order, callback)
		const destroy = () => {
			this._updateListeners.remove(callback)
		}
		return { destroy }
	}

	requestUpdate() {
		this._requestAnimationFrame = true
	}

	/**
	 * Set the "update" duration (in seconds). During this interval, the clock will
	 * update constantly.
	 */
	setUpdateDuration(value: number) {
		this._state = Object.freeze({
			...this._state,
			updateDuration: Math.max(0, value),
		})
	}

	/**
	 * Returns a promise that will be resolved at the next frame. The promise's 
	 * inner value is the current frame.
	 */
	waitNextFrame(): Promise<number> {
		this.requestUpdate()
		return new Promise<number>(resolve => {
			const callback = () => {
				this._updateListeners.remove(callback)
				resolve(this.frame)
			}
			this._updateListeners.add(0, callback)
		})
	}

	/**
	 * Returns a promise that will be resolved at after a given amount of frames. 
	 * The promise's inner value is the current frame.
	 */
	waitFrames(frameCount: number): number | Promise<number> {
		frameCount = Math.round(frameCount)
		if (frameCount <= 0) {
			return this.frame
		}
		let count = 0
		return new Promise<number>(resolve => {
			const callback = () => {
				count++
				this.requestUpdate()
				if (count === frameCount) {
					this._updateListeners.remove(callback)
					resolve(this.frame)
				}
			}
			this._updateListeners.add(0, callback)
		})
	}
}

const clock = (() => {
	let clock: Clock
	return () => clock ?? (clock = new Clock())
})()

export type {
	ClockState,
}

export {
	Clock,
	clock,
}
