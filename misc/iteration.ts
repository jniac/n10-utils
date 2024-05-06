
export function* enumerate(count: number): Generator<number, void, unknown> {
  for (let i = 0; i < count; i++) {
    yield i++
  }
}

/**
 * Allow declarative iteration.
 * 
 * eg:
 * ```
 * for (const { index, count, progress } of iterate(10)) {
 *   console.log(index, count, progress)
 * }
 * ```
 */
export function* iterate(count: number) {
  let index = 0
  const lastIndex = count - 1
  const wrapper = {
    get index() { return index },
    get count() { return count },
    get progress() { return lastIndex > 0 ? index / lastIndex : 1 },
  }
  for (index = 0; index < count; index++) {
    yield wrapper
  }
}