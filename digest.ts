import { Hash } from './hash'

/**
 * Digests one number and returns a unique, predictable number (hash).
 */
const number = (number: number): number => {
	return Hash
		.init()
		.update(number)
		.getValue()
}

/**
 * Digests numbers and returns a unique, predictable number (hash).
 */
const numbers = (numbers: number[]) => {
	return Hash
		.init()
		.updateNumbers(numbers)
		.getValue()
}

/**
 * Digests a string and returns a unique, predictable number (hash).
 */
const string = (str: string) => {
	// NOTE: Make sure that the string is a "string" (bug if "number"):
	str = String(str)
	return Hash
		.init()
		.updateString(str)
		.getValue()
}

const NULL_NUMBER = 34567849373
const UNDEFINED_NUMBER = 7743012743

const anyUpdate = (value: any) => {
	switch (typeof value) {
		case "undefined": {
			Hash.update(UNDEFINED_NUMBER)
			break
		}
		case "string": {
			for (let i = 0, max = value.length; i < max; i++) {
				Hash.update(value.charCodeAt(i))
			}
			break
		}
		case "number": {
			Hash.update(value)
			break
		}
		case "boolean": {
			Hash.update(value ? 0 : 1)
			break
		}
		case "object": {
			if (value === null) {
				Hash.update(NULL_NUMBER)
			} else {
				if (Array.isArray(value)) {
					// NOTE: If the value is an array, do not iterate over keys, the order 
					// is sufficient to produce an unique result.
					for (let i = 0, max = value.length; i < max; i++) {
						anyUpdate(value[i])
					}
				} else {
					// NOTE: But if the value is an object, iterate over SORTED keys since 
					// { x, y } should produce the same than { y, x }
					const entries = Object.entries(value) as [string, any]
					entries.sort((a, b) => a[0] < b[0] ? -1 : 1)
					for (let i = 0, imax = entries.length; i < imax; i++) {
						const [key, value2] = entries[i]
						Hash.updateString(key)
						anyUpdate(value2)
					}
				}
			}
			break
		}
	}
}


const any = (...args: any[]) => {
	Hash.init()
	const max = args.length
	for (let i = 0; i < max; i++) {
		const x = args[i]
		anyUpdate(x)
	}
	return Hash.getValue()
}

type Digest = {
	/**
	 * Digest is a small wrapper around an "Hash" instance. It's usefull for 
	 * generating an unique, predictable hash from any data set (recursive).
	 */
	(...args: any[]): number

	number: typeof number
	numbers: typeof numbers
	string: typeof string
	any: typeof any
}

const digest = ((...args: any[]) => any(...args)) as Digest

Object.assign(digest, {
	number,
	numbers,
	string,
	any,
})

export { digest }
