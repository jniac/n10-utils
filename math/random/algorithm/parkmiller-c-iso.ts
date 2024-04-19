const MAX = 0x7fffffff
const DEFAULT_SEED = 123456

const init = (seed: number = DEFAULT_SEED) => {
  seed = seed % MAX
  seed = seed < 0 ? seed + MAX : seed
  if (seed > 1 && seed < MAX) {
    return seed & MAX
  }
  return DEFAULT_SEED
}

const next = (state: number) => {
  state = Math.imul(state, 48271)
  state &= MAX
  return state
}

const map = (n: number) => (n - 1) / (MAX - 1)

export {
  DEFAULT_SEED,
  MAX,
  init,
  map,
  next
}

