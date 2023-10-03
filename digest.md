# Digest

`digest` is now based on `Hash` class for computing hash (number) from any kind
of data structure.

The previous algorithm, that was not as strong as `Hash` (which rely bitwise
operation), was the following:

The main weakness comes from the `scalar` parameter of the next function that was
added to allow the state to react to both small and very big numbers.

```ts
/**
 * Initialize the digest algorithm.
 */
const init = () => {
	state = 1073741823
	return digest
}

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
const next = (x: number, scalar = Math.abs(x) < 4294967296 ? 1e14 : 1) => {
	state += (x * scalar) & 0x7fffffff
	state = Math.imul(state, 48271)
	state = (state & 0x7fffffff) + (state >> 31)
	return digest
}

/**
 * Returns the result of all previous digested numbers (as an int).
 */
const result = () => {
	const obfuscation = 0b1100000101010011110111011001111
	return (state & 0x7fffffff) ^ obfuscation
}

/**
 * Returns the result of all previous digested numbers scaled to a float between 0 & 1.
 */
const resultAsFloat = () => {
	return (state & 0x7fffffff) / 0x80000000
}
```