
/**
 * Handle mutations means that when it's over, the previous (cached) values are 
 * restored. Isn't that great?
 */
export function handleMutations<T extends object>(target: T, mutations: Partial<T>) {
	const cache: Partial<T> = {}
	for (const key in mutations) {
		const value = mutations[key]
		if (value !== undefined) {
			cache[key] = target[key]
			target[key] = value!
		}
	}
	return () => {
		for (const key in mutations) {
			target[key] = cache[key] as any
		}
	}
}
