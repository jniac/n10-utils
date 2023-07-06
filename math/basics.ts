
export const clamp = (x: number, min: number, max: number) => {
	return x < min ? min : x > max ? max : x
}

export const clamp01 = (x: number) => {
	return x < 0 ? 0 : x > 1 ? 1 : x
}

export const lerp = (a: number, b: number, x: number) => {
	return a + (b - a) * clamp01(x)
}

export const lerpUnclamped = (a: number, b: number, x: number) => {
	return a + (b - a) * x
}

export const inverseLerp = (a: number, b: number, x: number) => {
	return clamp01((x - a) / (b - a))
}

export const inverseLerpUnclamped = (a: number, b: number, x: number) => {
	return (b - x) / (b - a)
}

export const toff = (x: number) => {
	return clamp(0x100 * x, 0, 0xff)
}

export const limited = (x: number, limit: number) => {
	return x * limit / (x + limit)
}

export const signedLimited = (x: number, limit: number) => {
	return x < 0 ? -limited(-x, limit) : limited(x, limit)
}

/**
 * Clamps a value with progressive limit. Useful for user "drag" feedbacks.
 * https://www.desmos.com/calculator/rnsygpvpcb
 */
export const limitedClamp = (x: number, min: number, minLimit: number, max: number, maxLimit: number) => {
	let limit = 0, delta = 0
	return (
		x < min ? min + (limit = minLimit - min) * (delta = x - min) / (limit + delta) :
		x > max ? max + (limit = maxLimit - max) * (delta = x - max) / (limit + delta) :
		x
	)
}
