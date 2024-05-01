import { DEFAULT_SEED, MAX, init, map, next } from './algorithm/parkmiller-c-iso'

let state = 123456

const identity = (x: number) => x

/**
 * Pseudo Random Number Generator
 */
export class PRNG {
  static readonly defaultSeed = DEFAULT_SEED
  static readonly seedMax = MAX

  static seed(seed: number | string = DEFAULT_SEED): typeof PRNG {
    if (typeof seed === 'string') {
      seed = seed.split('').reduce((acc, char) => acc * 7 + char.charCodeAt(0), 0)
    }
    state = init(seed)
    return PRNG
  }

  /**
   * @deprecated Use `PRNG.seed` instead.
   */
  static init = PRNG.seed

  static random(): number {
    state = next(state)
    return map(state)
  }

  // sugar-syntax:
  private static solveBetweenParameters(parameters: any[]): [number, number, (x: number) => number] {
    switch (parameters.length) {
      default: {
        return [0, 1, identity]
      }
      case 1: {
        return [0, parameters[0], identity]
      }
      case 2: {
        return [parameters[0], parameters[1], identity]
      }
      case 3: {
        return [parameters[0], parameters[1], parameters[2]]
      }
    }
  }
  static between(): number
  static between(max: number): number
  static between(min: number, max: number): number
  static between(min: number, max: number, distribution: (x: number) => number): number
  static between(...args: any[]): number {
    const [min, max, distribution] = PRNG.solveBetweenParameters(args)
    return min + (max - min) * distribution(PRNG.random())
  }

  /**
   * @deprecated Use `PRNG.between` instead.
   */
  static range = PRNG.between // backward compatibility

  static int(maxExclusive: number): number
  static int(min: number, maxExclusive: number): number
  static int(min: number, maxExclusive: number, distribution: (x: number) => number): number
  static int(...args: any[]): number {
    const [min, maxExclusive, distribution] = PRNG.solveBetweenParameters(args)
    return min + Math.floor(distribution(PRNG.random()) * (maxExclusive - min))
  }

  static chance(probability: number): boolean {
    return PRNG.random() < probability
  }

  static shuffle<T>(array: Iterable<T>, out = [...array]): T[] {
    const length = out.length
    for (let i = 0; i < length; i++) {
      const j = Math.floor(length * PRNG.random())
      const temp = out[i]
      out[i] = out[j]
      out[j] = temp
    }
    return out
  }

  static pick<T>(
    options: T[],
    weights: number[] | null = null,
    { weightsAreNormalized = false } = {},
  ): T {
    // If no weights are provided, choose uniformly. Simple.
    if (weights === null) {
      return options[Math.floor(PRNG.random() * options.length)]
    }

    // If weights, normalize them if necessary.
    if (!weightsAreNormalized) {
      const sum = weights.reduce((acc, weight) => acc + weight, 0)
      weights = weights.map(weight => weight / sum)
    }

    // Choose among the options.
    const r = PRNG.random()
    let sum = 0
    for (let i = 0; i < options.length; i++) {
      sum += weights[i]
      if (r < sum) {
        return options[i]
      }
    }
    throw new Error('PRNG.among: unreachable')
  }

  /** 
   * @deprecated Use `PRNG.pick` instead.
   */
  static among = PRNG.pick // backward compatibility
}
