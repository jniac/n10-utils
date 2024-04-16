const MAX = 0x7fffffff

const init = (seed: number = 123456) => {
  seed = seed % MAX
  seed = seed < 0 ? seed + MAX : seed
  if (seed > 1 && seed < MAX) {
    return seed & MAX
  }
  return 123456
}

const next = (state: number) => {
  state = Math.imul(state, 48271)
  state &= MAX
  return state
}

const map = (n: number) => (n - 1) / (MAX - 1)

export {
  MAX,
  init,
  map,
  next
}

