
let state = 0;

/**
 * Initialize the digest algorithm.
 */
const init = () => {
	state = 1073741823;
	return digest;
};

/**
 * Digest the new number.
 * 
 * Based on [Lehmer or Park-Miller random number generator](https://en.wikipedia.org/wiki/Lehmer_random_number_generator).
 * 
 * NOTE: The second paramater is a scalar internally used to scale the input. 
 * The default value (1e14) is a compromise allowing sensitivity to both small 
 * and very large values. The limits are 1e-15 and 2^36. That means that for any
 * input smaller than 1e-15 or bigger 2^36 the result will be the same. If you 
 * need to react to value bigger than 2^36 (which is already bigger than an 
 * classic 32 bit int), the scalar may be reduced to 1.
 * 
 * ```
 * digest.init().next(1e-15).result() // 0.4999775215983391
 * digest.init().next(2e-15).result() // 0.4999775215983391
 * digest.init().next(68719476736).result() // 0.4999999995343387
 * digest.init().next(68719476737).result() // 0.4999999995343387
 * ```
 */
const next = (x: number, scalar = 1e14) => {
	state += (x * scalar) & 0x7fffffff;
	state = Math.imul(state, 48271);
	state = (state & 0x7fffffff) + (state >> 31);
	return digest;
};

/**
 * Returns the result of all previous digested numbers.
 */
const result = () => {
	return (state & 0x7fffffff) / 0x80000000;
};

/**
 * Digests numbers and returns a unique, predictable number (hash).
 */
const numbers = (numbers: number[]) => {
	init();
	const max = numbers.length;
	for (let i = 0; i < max; i++) {
		next(numbers[i]);
	}
	return result();
};

/**
 * Digests a string and returns a unique, predictable number (hash).
 */
const string = (str: string) => {
	init();
	const max = str.length;
	for (let i = 0; i < max; i++) {
		next(str.charCodeAt(i));
	}
	return result();
};

const NULL_NUMBER = 34567849373;
const UNDEFINED_NUMBER = 7743012743;

const anyNext = (value: any) => {
	switch (typeof value) {
		case "undefined": {
			next(UNDEFINED_NUMBER);
			break;
		}
		case "string": {
			for (let i = 0, max = value.length; i < max; i++) {
				next(value.charCodeAt(i));
			}
			break;
		}
		case "number": {
			next(value);
			break;
		}
		case "boolean": {
			next(value ? 0 : 1);
			break;
		}
		case "object": {
			if (value === null) {
				next(NULL_NUMBER);
			} else {
				if (Array.isArray(value)) {
					// NOTE: If the value is an array, do not iterate over keys, the order 
					// is sufficient to produce an unique result.
					for (let i = 0, max = value.length; i < max; i++) {
						anyNext(value[i]);
					}
				} else {
					// NOTE: But if the value is an object, iterate over SORTED keys since 
					// { x, y } should produce the same than { y, x }
					const entries = Object.entries(value) as [string, any];
					entries.sort((a, b) => a[0] < b[0] ? -1 : 1);
					for (let i = 0, imax = entries.length; i < imax; i++) {
						const [key, value2] = entries[i];
						for (let j = 0, jmax = key.length; j < jmax; j++) {
							next(key.charCodeAt(j));
						}
						anyNext(value2);
					}
				}
			}
			break;
		}
	}
};


const any = (...args: any[]) => {
	init();
	const max = args.length;
	for (let i = 0; i < max; i++) {
		const x = args[i];
		anyNext(x);
	}
	return result();
};

/**
 * Digest any value and return the result.
 * 
 * If the value is an object, the function will recursively iterate over any 
 * sub-entries and digest keys and values.
 * 
 * Key order does NOT affect the result (entries are sorted first).
 * 
 * Usage:
 * ```
 * digest(1, 2, 3) // 0.5850774045102298
 * digest({ x: { y: 3 }, foo: "bar" }) // 0.27742494409903884
 * digest({ foo: "bar", x: { y: 3 } }) // 0.27742494409903884
 * digest({ foo: "bar", x: { y: 4 } }) // 0.27744742203503847
 * ```
 * 
 * For a finer control, the different steps used internally can also be accessed:
 * ```
 * const hash = digest.init().next(myNumber1).next(myNumber2).result()
 * ```
 */
type Digest = {
	(...args: any[]): number;
	init: typeof init;
	next: typeof next;
	result: typeof result;
	numbers: typeof numbers;
	string: typeof string;
	any: typeof any;
};

const digest = ((...args: any[]) => any(...args)) as Digest;

Object.assign(digest, {
	// internal steps:
	init,
	next,
	result,

	// specific functions:
	numbers,
	string,
	any,
});

export { digest };
