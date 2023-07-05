
const map = new WeakMap<() => any, any>();

export const lazy = <T extends unknown>(callback: () => T) => {
	return (): T => {
		const value = map.get(callback);
		if (value === undefined) {
			const value = callback();
			map.set(callback, value);
			return value;
		}
		return value as T;
	};
};
