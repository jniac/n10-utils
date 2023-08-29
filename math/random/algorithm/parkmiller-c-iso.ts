const init = (seed: number = 123456) => {
  if (seed > 1 && seed < 0x7fffffff) {
    return seed & 0x7fffffff;
  }
  return 123456
}

const next = (state: number) => {
  state = Math.imul(state, 48271)
  state &= 0x7fffffff
  return state
}

const map = (n: number) => (n - 1) / 0x7ffffffe

export {
  init,
  next,
  map,
}
