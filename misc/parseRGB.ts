export function parseFloatRGB(str: string): [r: number, g: number, b: number] {
	if (str.startsWith('#')) {
		str = str.substring(1)
		if (str.length === 6) {
			return [
				Number.parseInt(str.slice(0, 2), 16) / 0xff,
				Number.parseInt(str.slice(2, 4), 16) / 0xff,
				Number.parseInt(str.slice(4, 6), 16) / 0xff,
			]
		}
	}
	return [1, 0, 1]
}