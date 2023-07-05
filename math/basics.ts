
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
};

