
export function* enumerate(count: number): Generator<number, void, unknown> {
  for (let i = 0; i < count; i++) {
    yield i++
  }
}
