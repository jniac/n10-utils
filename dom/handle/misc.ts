import { DestroyableObject } from '../../types'
import { ClockState, clock } from '../../clock'

export function handleInterval(interval: number, callback: () => void) {
	const id = window.setInterval(() => {
		callback()
	}, interval)
	const destroy = () => {
		window.clearInterval(id)
	}
	return { destroy }
}

export function handleTimeout(delay: number | `${number}s`, callback: () => void) {
	const id = window.setTimeout(() => {
		callback()
	}, typeof delay === 'number' ? delay : (Number.parseFloat(delay) * (delay.endsWith('s') ? 1000 : 1)))
	const destroy = () => {
		window.clearInterval(id)
	}
	return { destroy }
}

export function handleTick(callback: (state: ClockState) => void): DestroyableObject {
	return clock().onTick(callback)
}

export function handleNextFrame(callback: () => void): DestroyableObject
export function handleNextFrame(frameCount: number, callback: () => void): DestroyableObject
export function handleNextFrame(...args: any[]): DestroyableObject {
	const [frameCount, callback] = (args.length === 2 ? args : [1, args[0]]) as [number, () => void]
	let count = 0
	const animationFrame = () => {
		count++
		if (frameCount === count) {
			callback()
		} else {
			id = window.requestAnimationFrame(animationFrame)
		}
	}
	let id = window.requestAnimationFrame(animationFrame)
	const destroy = () => window.cancelAnimationFrame(id)
	return { destroy }
}
