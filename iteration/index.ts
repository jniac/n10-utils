
/**
 * Same as `Array.prototype.some` but for iterables
 */
export function some<T>(values: Iterable<T>, predicate: (value: T) => boolean): boolean {
  for (const value of values) {
    if (predicate(value)) {
      return true
    }
  }
  return false
}

/**
 * Same as `Array.prototype.every` but for iterables
 */
export function every<T>(values: Iterable<T>, predicate: (value: T) => boolean): boolean {
  for (const value of values) {
    if (!predicate(value)) {
      return false
    }
  }
  return true
}

export function* allDescendants<T>(root: T, {
  includeRoot = false,
  getChildren = null as ((value: T) => Iterable<T>) | null,
} = {}): Generator<T> {
  if (!getChildren) {
    if ('children' in (root as any)) {
      getChildren = (value) => (value as any).children
    }
  }

  if (!getChildren) {
    throw new Error('getChildren is required')
  }

  if (includeRoot) {
    yield root
  }

  const stack = [root]
  while (stack.length > 0) {
    const value = stack.pop()!
    yield value
    for (const child of getChildren(value)) {
      stack.push(child)
    }
  }
}