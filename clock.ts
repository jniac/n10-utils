import { DestroyableObject } from "./types";

type ClockState = Readonly<{
	timeScale: number;
	time: number;
	timeOld: number;
	frame: number;
	deltaTime: number;
	maxDeltaTime: number;
}>;

class Clock {
	listeners: ((clock: ClockState) => void)[] = [];
	timeScale = 1;
	maxDeltaTime = .1;
	frame = 0;

	private _state: ClockState = {
		timeScale: 1,
		time: 0,
		timeOld: 0,
		frame: 0,
		maxDeltaTime: .1,
		deltaTime: 0,
	};
	get state() { return this._state; }

	constructor() {
		if (typeof window !== "undefined") {
			let windowTime = window.performance.now();
			const update = (ms: number) => {
				window.requestAnimationFrame(update);
				const windowTimeOld = windowTime;
				windowTime = ms;
				const { timeScale, maxDeltaTime } = this;
				const deltaTime = Math.min(maxDeltaTime, (windowTime - windowTimeOld) / 1000) * timeScale;
				const timeOld = this._state.time;
				const time = timeOld + deltaTime;
				const state = Object.freeze({
					timeScale,
					deltaTime,
					time,
					timeOld,
					maxDeltaTime,
					frame: this.frame,
				});
				this._state = state;
				for (const listener of this.listeners) {
					listener(state);
				}
				this.frame++;
			};
			window.requestAnimationFrame(update);
		}
	}

	onTick(callback: (clock: ClockState) => void): DestroyableObject {
		this.listeners.push(callback);
		const destroy = () => {
			const index = this.listeners.indexOf(callback);
			if (index !== -1) {
				this.listeners.splice(index, 1);
			}
		};
		return { destroy };
	}
}

const windowClock = (() => {
	let clock: Clock
	return () => clock ?? (clock = new Clock())
})();

export type {
	ClockState,
}

export {
	Clock,
	windowClock,
}
